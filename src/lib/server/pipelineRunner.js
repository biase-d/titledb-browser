/**
 * @file Pipeline Runner
 * @description Starts the sync pipeline as its own process
 *
 * Deliberately not run inside the web server. A sync takes minutes, holds a lot
 * of memory while it builds the contributor map, and clones two repositories -
 * doing that in the request process means one bad build can take the site down
 * with it. A separate process can fail on its own, and the request returns as
 * soon as it has been started rather than holding a webhook open for minutes
 *
 * Overlapping runs are already impossible: the pipeline takes a Postgres
 * advisory lock and a second one exits as a no-op. The flag here just avoids
 * spawning a process that would immediately do nothing
 */

import { spawn } from 'node:child_process'
import { open, mkdir } from 'node:fs/promises'
import path from 'node:path'
import logger from '$lib/services/loggerService'

const LOG_DIR = path.resolve('data/logs')

/** Whether this process has a pipeline running that it started */
let running = false

/**
 * @param {Object} [options]
 * @param {boolean} [options.fullRebuild]
 * @param {string} [options.reason] - Recorded in the log, e.g. what triggered it
 * @returns {Promise<{ started: boolean, reason?: string }>}
 */
export async function startPipeline ({ fullRebuild = false, reason = 'manual' } = {}) {
	if (running) return { started: false, reason: 'already running' }

	const args = [path.resolve('scripts/build.js')]
	if (fullRebuild) args.push('--full-rebuild')

	// Output goes to a file rather than being discarded: when a sync fails at
	// 3am the reason has to be somewhere. build_status carries the phase for
	// the UI, but not the error
	await mkdir(LOG_DIR, { recursive: true })
	const date = new Date().toISOString().split('T')[0]
	const logFile = await open(path.join(LOG_DIR, `pipeline-${date}.log`), 'a')

	running = true
	try {
		const child = spawn(process.execPath, args, {
			cwd: process.cwd(),
			detached: true,
			stdio: ['ignore', logFile.fd, logFile.fd]
		})

		logger.info('Pipeline started', { pid: child.pid, fullRebuild, reason })

		child.on('exit', (code) => {
			running = false
			logFile.close().catch(() => {})
			if (code === 0) {
				logger.info('Pipeline finished', { reason })
			} else {
				// Reaches the webhook and the inbox, because a sync that stops
				// working is invisible otherwise - the site keeps serving the
				// data it already has
				logger.error(
					`Pipeline exited with code ${code}`,
					new Error(`See data/logs/pipeline-${date}.log`),
					{ reason, fullRebuild }
				)
			}
		})

		child.on('error', (err) => {
			running = false
			logFile.close().catch(() => {})
			logger.error('Pipeline could not be started', err, { reason })
		})

		// Let the server exit without waiting on the sync
		child.unref()

		return { started: true }
	} catch (e) {
		running = false
		await logFile.close().catch(() => {})
		throw e
	}
}
