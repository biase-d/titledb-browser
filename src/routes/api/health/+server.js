import { json } from '@sveltejs/kit'
import { getDatabase } from '$lib/database/context'
import { getStorage } from '$lib/storage/context'
import { checkHealth } from '$lib/services/healthService'
import logger from '$lib/services/loggerService'

/** @type {import('./$types').RequestHandler} */
export const GET = async ({ locals }) => {
	try {
		const health = await checkHealth(getDatabase(locals), getStorage(locals))

		// 200 even when degraded: monitoring dashboards read the status field,
		// and /api/v1/status?strict=1 is the endpoint that answers with a code
		return json(health)
	} catch (err) {
		// The raw error goes to the logs, not to the caller: this endpoint is
		// public, and exception text tends to name hosts, users and drivers
		logger.error('Health check failed', err instanceof Error ? err : new Error(String(err)))
		return json({
			status: 'error',
			message: 'We could not check system status just now. Please try again shortly.',
			timestamp: new Date().toISOString()
		}, { status: 500 })
	}
}
