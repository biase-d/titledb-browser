/**
 * Logger Service for server-side logging and error alerting.
 * Provides file persistence and email notifications for critical errors.
 */

import fs from 'fs/promises'
import path from 'path'
import nodemailer from 'nodemailer'
import { env } from '$env/dynamic/private'
import { notify } from '$lib/services/notifyService'

const LOG_DIR = path.resolve('data/logs')
const EMAIL_THROTTLE_MS = 5 * 60 * 1000 // 5 minutes
// Per-process, so N replicas would each send their own copy of an alert. Fine
// for a single container, which is how this is deployed
const emailLastSent = new Map()

// One file per day, kept for this many days. Without this the directory grows
// without bound on a long-lived container - it did not matter on a host that
// threw the filesystem away between requests, and it does now
const LOG_RETENTION_DAYS = Number(env.LOG_RETENTION_DAYS ?? 14)
const PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000
let lastPruned = 0

/**
 * Delete log files older than the retention window. Called on write, but does
 * its work at most once a day, and never lets a failure surface: losing the
 * prune is better than losing the log line that triggered it
 */
async function pruneOldLogs () {
	const now = Date.now()
	if (LOG_RETENTION_DAYS <= 0 || now - lastPruned < PRUNE_INTERVAL_MS) return
	lastPruned = now

	try {
		const cutoff = now - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000
		for (const name of await fs.readdir(LOG_DIR)) {
			if (!name.endsWith('.log')) continue
			const stats = await fs.stat(path.join(LOG_DIR, name)).catch(() => null)
			if (stats && stats.mtimeMs < cutoff) {
				await fs.unlink(path.join(LOG_DIR, name)).catch(() => {})
			}
		}
	} catch {
		// Directory may not exist yet
	}
}

/**
 * @typedef {('DEBUG'|'INFO'|'WARN'|'ERROR')} LogLevel
 */

/**
 * Ensures the log directory exists.
 */
async function ensureLogDir () {
    try {
        await fs.mkdir(LOG_DIR, { recursive: true })
    } catch (err) {
        console.error('[Logger] Failed to create log directory:', err)
    }
}

/**
 * Formats a log entry.
 * @param {LogLevel} level 
 * @param {string} message 
 * @param {Object} [context] 
 * @returns {string}
 */
function formatEntry (level, message, context) {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : ''
    return `[${timestamp}] [${level}] ${message}${contextStr}\n`
}

/**
 * Persistence: Writes log to file.
 * @param {string} entryFormatted 
 */
async function writeToFile (entryFormatted) {
    await ensureLogDir()
    await pruneOldLogs()
    const date = new Date().toISOString().split('T')[0]
    const logFile = path.join(LOG_DIR, `${date}.log`)
    try {
        await fs.appendFile(logFile, entryFormatted)
    } catch (err) {
        console.error('[Logger] Failed to write to log file:', err)
    }
}

/**
 * Sends an email alert for errors.
 * @param {string} message 
 * @param {Error|Object} [error] 
 * @param {Object} [context] 
 */
/**
 * Send one operational email, if mail is configured
 *
 * Exported because not every alert comes from an exception: the site going down
 * and coming back are state changes, and they are the two messages most worth
 * receiving. Never throws - a failure to alert must not become a second failure
 *
 * @param {Object} options
 * @param {string} options.subject
 * @param {string} options.text
 * @param {string} [options.throttleKey] - Repeats within 5 minutes are dropped.
 *   Pass null to send regardless, for state changes that are rare by nature
 * @returns {Promise<boolean>} Whether a message was actually sent
 */
export async function sendAlertEmail ({ subject, text, throttleKey }) {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ALERT_EMAIL_TO } = env

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !ALERT_EMAIL_TO) {
        // Unconfigured is a normal state, not an error
        return false
    }

    const now = Date.now()
    if (throttleKey) {
        const previous = emailLastSent.get(throttleKey)
        if (previous && now - previous < EMAIL_THROTTLE_MS) return false
    }

    try {
        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: parseInt(SMTP_PORT),
            secure: parseInt(SMTP_PORT) === 465,
            auth: { user: SMTP_USER, pass: SMTP_PASS }
        })

        await transporter.sendMail({
            from: `"Switch Performance Alerts" <${SMTP_USER}>`,
            to: ALERT_EMAIL_TO,
            subject,
            text
        })

        if (throttleKey) emailLastSent.set(throttleKey, now)
        return true
    } catch (err) {
        console.error('[Logger] Failed to send alert email:', err)
        return false
    }
}

/**
 * @param {string} message
 * @param {Error|Object} [error]
 * @param {Object} [context]
 */
async function sendEmailAlert (message, error, context) {
    const errorDetails = error instanceof Error
        ? `${error.message}\n${error.stack}`
        : JSON.stringify(error, null, 2)

    await sendAlertEmail({
        subject: `[ERROR] ${message}`,
        text: `Message: ${message}\n\nError Details:\n${errorDetails}\n\nContext:\n${JSON.stringify(context, null, 2)}`,
        throttleKey: message
    })
}

const logger = {
    /**
     * @param {string} message 
     * @param {Object} [context] 
     */
    debug (message, context) {
        if (env.NODE_ENV === 'production') return
        const entry = formatEntry('DEBUG', message, context)
        console.debug(entry.trim())
        writeToFile(entry)
    },

    /**
     * @param {string} message 
     * @param {Object} [context] 
     */
    info (message, context) {
        const entry = formatEntry('INFO', message, context)
        console.info(entry.trim())
        writeToFile(entry)
    },

    /**
     * @param {string} message 
     * @param {Object} [context] 
     */
    warn (message, context) {
        const entry = formatEntry('WARN', message, context)
        console.warn(entry.trim())
        writeToFile(entry)
    },

    /**
     * @param {string} message 
     * @param {Error|Object} [error] 
     * @param {Object} [context] 
     */
    async error (message, error, context = {}) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        const entry = formatEntry('ERROR', message, { ...context, error: errorMsg })
        console.error(entry.trim())
        if (error instanceof Error && error.stack) {
            console.error(error.stack)
        }

        await writeToFile(entry)
        await sendEmailAlert(message, error, context)

        // notify() never rejects, so a missing or broken webhook cannot turn
        // logging an error into a second error
        await notify({
            event: 'error',
            title: message,
            detail: error instanceof Error ? error.stack ?? error.message : errorMsg,
            context
        })
    }
}

export default logger
