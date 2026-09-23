import { json } from '@sveltejs/kit'
import { getDatabase } from '$lib/database/context'
import { getStorage } from '$lib/storage/context'
import { checkHealth } from '$lib/services/healthService'
import logger from '$lib/services/loggerService'

/** @type {import('./$types').RequestHandler} */
export const GET = async ({ locals, platform }) => {
	// In strict environments, we might want to dependency inject via locals,
	// but the context helpers handle lazy loading correctly from locals.
	const db = getDatabase(locals)
	const storage = getStorage(locals)

	// Pass platform context
	const currentPlatform = platform || locals.platform

	try {
		const health = await checkHealth(db, storage, currentPlatform)

		// Return 200 even if degraded, 503 if completely down?
		// 200 is safer for monitoring dashboards unless critical.
		// We'll return 200 with status field.
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
