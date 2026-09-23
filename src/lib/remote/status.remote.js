/**
 * System status, as the UI actually consumes it
 *
 * The footer and the error page previously each fetched an endpoint and reached
 * into the raw health payload themselves, which is how they ended up reading a
 * shape that endpoint never returned. This query is the contract instead: it
 * returns a narrow, named shape, so both callers read the same three fields and
 * cannot disagree about them
 *
 * The /api/health and /api/v1/status endpoints are left in place for external
 * monitoring
 */
import { query, getRequestEvent } from '$app/server'
import { getDatabase } from '$lib/database/context'
import { getStorage } from '$lib/storage/context'
import { checkHealth } from '$lib/services/healthService'

/**
 * @typedef {Object} SystemStatus
 * @property {boolean} databaseHealthy - Whether the database answered a ping
 * @property {boolean} isBuilding - Whether the sync pipeline is mid-rebuild
 * @property {string|null} buildPhase - Current pipeline phase, when building
 */

/** @type {import('@sveltejs/kit').RemoteQueryFunction<void, SystemStatus>} */
export const getSystemStatus = query(async () => {
	const { locals, platform } = getRequestEvent()

	const health = await checkHealth(
		getDatabase(locals),
		getStorage(locals),
		platform
	)

	const build = health.services?.build

	return {
		databaseHealthy: health.services?.database?.status === 'healthy',
		isBuilding: Boolean(build?.isBuilding),
		buildPhase: build?.phase ?? null
	}
})
