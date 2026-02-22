/**
 * @file Health Service
 * @description Logic for checking system health and component status
 */

import { sql } from 'drizzle-orm'
import { getPlatformInfo } from '$lib/platform/adapter'
import logger from '$lib/services/loggerService'
import { getBuildStatus } from '$lib/repositories/buildStatusRepository'

/**
 * Check health of all system components
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {import('$lib/storage/types').StorageAdapter|null} storage
 * @param {Object} platform
 * @returns {Promise<Object>}
 */
export async function checkHealth (db, storage, platform) {
	const start = globalThis.performance.now()

	// Check Database
	let dbStatus = 'unknown'
	let dbLatency = 0
	try {
		const dbStart = globalThis.performance.now()
		await db.execute(sql`SELECT 1`)
		dbLatency = globalThis.performance.now() - dbStart
		dbStatus = 'healthy'
	} catch (e) {
		dbStatus = 'unhealthy'
		const err = e instanceof Error ? e : new Error(String(e))
		logger.error('DB Health Check Failed', err)
	}

	// Check Storage
	let storageStatus = 'not-configured'
	if (storage) {
		storageStatus = 'configured'
	}

	// Check Build Status
	const buildStatus = await getBuildStatus(db)

	const info = getPlatformInfo(platform)

	return {
		status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
		latency: Math.round(globalThis.performance.now() - start),
		services: {
			database: { status: dbStatus, latency: Math.round(dbLatency) + 'ms' },
			storage: { status: storageStatus },
			platform: info,
			build: buildStatus || { isBuilding: false, phase: null }
		},
		timestamp: new Date().toISOString()
	}
}

