/**
 * @file Notify Service
 * @description Outbound alerts to a webhook receiver such as n8n
 *
 * An app cannot report its own outage. If the process is dead or the host is
 * unreachable, nothing in here runs, so a push-only setup would stay silent in
 * exactly the case that matters most. This covers the failures the app can
 * still see from the inside - a dependency failing, the sync pipeline breaking,
 * an unexpected server error. Noticing that the app itself has stopped
 * answering is the receiver's job, by polling /api/v1/status on a schedule
 * (see the Monitoring section of the README)
 */

import { env } from '$env/dynamic/private'

const THROTTLE_MS = 5 * 60 * 1000
const TIMEOUT_MS = 5000

/** @type {Map<string, number>} */
const lastSent = new Map()

/**
 * @typedef {'error'|'dependency_down'|'dependency_degraded'|'pipeline_failed'} AlertType
 */

/**
 * @typedef {Object} Alert
 * @property {AlertType} event
 * @property {string} title - One line, readable as-is in a chat message
 * @property {string} [detail] - Technical detail. Goes to operators, never to readers
 * @property {Object} [context]
 * @property {string} [dedupeKey] - Repeats within the throttle window are dropped. Defaults to `event:title`
 */

/** @param {AlertType} event */
function severityOf (event) {
	return event === 'dependency_degraded' ? 'warning' : 'critical'
}

/**
 * Sends an alert, if a webhook is configured
 *
 * Never throws and never rejects: callers are error paths, often fire and
 * forget, and an alert that fails must not become a second failure
 *
 * @param {Alert} alert
 * @returns {Promise<boolean>} Whether a request was actually sent
 */
export async function notify (alert) {
	const url = env.N8N_WEBHOOK_URL

	// Unconfigured is a normal state, not an error - matches the SMTP alerting
	if (!url) return false

	const key = alert.dedupeKey ?? `${alert.event}:${alert.title}`
	const now = Date.now()
	const previous = lastSent.get(key)

	if (previous && now - previous < THROTTLE_MS) return false
	lastSent.set(key, now)

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(env.N8N_WEBHOOK_TOKEN ? { Authorization: `Bearer ${env.N8N_WEBHOOK_TOKEN}` } : {})
			},
			body: JSON.stringify({
				source: 'titledb-browser',
				environment: env.NODE_ENV ?? 'development',
				event: alert.event,
				severity: severityOf(alert.event),
				title: alert.title,
				detail: alert.detail ?? null,
				context: alert.context ?? {},
				timestamp: new Date().toISOString()
			}),
			signal: AbortSignal.timeout(TIMEOUT_MS)
		})

		if (!response.ok) {
			console.error(`[Notify] Webhook returned HTTP ${response.status}`)
			// Let the next occurrence retry rather than sitting out the window
			lastSent.delete(key)
			return false
		}

		return true
	} catch (err) {
		console.error('[Notify] Webhook failed:', err instanceof Error ? err.message : err)
		lastSent.delete(key)
		return false
	}
}

/** Exposed for tests: forget the throttle window */
export function resetNotifyThrottle () {
	lastSent.clear()
}
