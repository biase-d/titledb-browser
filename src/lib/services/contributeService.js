/**
 * @file Contribute Service
 * @description Business logic for the contribute page - games missing performance/graphics data
 */

import * as contributionRepo from '$lib/repositories/contributionRepository'
import { getStats } from '$lib/repositories/statsRepository'
import { badgeProgress, badgeFor } from '$lib/badges'
import { countContributions } from '$lib/contributions'

/**
 * Get impact stats for the contribute page hero
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @returns {Promise<Object>}
 */
export async function getImpactStats (db) {
	const stats = await getStats(db, new URLSearchParams())
	return {
		totalContributors: stats.kpis.contributors,
		totalUpdates: stats.kpis.contributions,
		totalRequests: stats.kpis.requests,
		coverage: stats.kpis.coverage,
		groups: stats.kpis.groups,
		groupsWithData: stats.kpis.groupsWithData,
		topContributors: (stats.topContributors || []).slice(0, 8).map((/** @type {any} */ c) => ({
			name: c.name,
			contributions: c.contributions,
			badge: badgeFor(c.contributions)
		}))
	}
}

/**
 * How a signed-in contributor stands: their count and the next badge
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string} login
 */
export async function getMyProgress (db, login) {
	const data = await contributionRepo.getUserContributionStats(db, login)
	const total = countContributions([...data.perfContribs, ...data.graphicsContribs, ...data.videoContribs])
	return badgeProgress(total)
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
export async function getMissingDataGames (db, { page, sortBy, preferredRegion, platform }) {
	return contributionRepo.getMissingDataGroups(db, { page, sortBy, preferredRegion, platform })
}
