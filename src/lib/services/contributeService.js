/**
 * @file Contribute Service
 * @description Business logic for the contribute page - games missing performance/graphics data
 */

import * as contributionRepo from '$lib/repositories/contributionRepository'
import { getStats } from '$lib/repositories/statsRepository'

/**
 * Get impact stats for the contribute page hero
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @returns {Promise<Object>}
 */
export async function getImpactStats (db) {
	const stats = await getStats(db, new URLSearchParams())
	return {
		totalContributors: stats.kpis.total_contributors,
		totalUpdates: stats.kpis.total_performance + stats.kpis.total_graphics,
		totalRequests: stats.kpis.total_requests
	}
}

/**
 * Get games missing performance/graphics data with pagination
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {Object} options
 * @param {number} options.page
 * @param {string} options.sortBy
 * @param {string} options.preferredRegion
 * @returns {Promise<{games: Array, pagination: Object}>}
 */
export async function getMissingDataGames (db, { page, sortBy, preferredRegion }) {
	return contributionRepo.getMissingDataGroups(db, { page, sortBy, preferredRegion })
}
