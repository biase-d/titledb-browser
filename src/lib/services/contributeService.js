/**
 * @file Contribute Service
 * @description Business logic for the contribute page - games missing performance/graphics data
 */

import * as gameRepo from '$lib/repositories/gameRepository'

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
	return gameRepo.getMissingDataGroups(db, { page, sortBy, preferredRegion })
}
