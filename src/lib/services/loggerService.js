/**
 * Logger Service for server-side logging and error alerting.
 * Provides file persistence and email notifications for critical errors.
 */

import fs from 'fs/promises'
import path from 'path'
import nodemailer from 'nodemailer'
import { env } from '$env/dynamic/private'

const LOG_DIR = path.resolve('data/logs')
const EMAIL_THROTTLE_MS = 5 * 60 * 1000 // 5 minutes
const emailLastSent = new Map()

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
async function sendEmailAlert (message, error, context) {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ALERT_EMAIL_TO } = env

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !ALERT_EMAIL_TO) {
        // Silently skip if mail is not configured (as requested by user for dev)
        return
    }

    // Throttle emails for the same message to avoid spam
    const now = Date.now()
    if (emailLastSent.has(message) && (now - emailLastSent.get(message)) < EMAIL_THROTTLE_MS) {
        return
    }

    try {
        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: parseInt(SMTP_PORT),
            secure: parseInt(SMTP_PORT) === 465,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS
            }
        })

        const errorDetails = error instanceof Error ? `${error.message}\n${error.stack}` : JSON.stringify(error, null, 2)

        await transporter.sendMail({
            from: `"TitleDB Browser Alerts" <${SMTP_USER}>`,
            to: ALERT_EMAIL_TO,
            subject: '[ERROR] Alert in TitleDB Browser',
            text: `Message: ${message}\n\nError Details:\n${errorDetails}\n\nContext:\n${JSON.stringify(context, null, 2)}`
        })

        emailLastSent.set(message, now)
    } catch (err) {
        console.error('[Logger] Failed to send alert email:', err)
    }
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
    }
}

export default logger
