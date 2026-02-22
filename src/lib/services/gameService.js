import * as gameRepo from '$lib/repositories/gameRepository'
import * as searchRepo from '$lib/repositories/searchRepository'
import * as requestRepo from '$lib/repositories/requestRepository'
import { calculatePlayabilityScore } from '$lib/playability'

/**
 * Get detailed game info with user context (e.g. requests status)
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string} titleId - Game ID
 * @param {string} [userId] - Optional User ID
 * @returns {Promise<Object|null>}
 */
export async function getGameContext (db, titleId, userId) {
	const details = await gameRepo.getGameDetails(db, titleId)

	if (!details) {
		return null
	}

	let hasRequested = false

	if (userId) {
		hasRequested = await requestRepo.hasUserRequestedData(db, userId, titleId)
	}

	return {
		...details,
		userContext: {
			hasRequested
		}
	}
}

/**
 * Search games with business rules applied
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {URLSearchParams} searchParams
 * @returns {Promise<Object>}
 */
export async function searchGames (db, searchParams) {
	return await searchRepo.searchGames(db, searchParams)
}

/**
 * Handle a user request for game data
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string} userId - User ID
 * @param {string} gameId - Game ID
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function requestGameData (db, userId, gameId) {
	if (!userId) {
		throw new Error('User must be logged in to request data')
	}

	const game = await gameRepo.findGameById(db, gameId)
	if (!game) {
		throw new Error('Game not found')
	}

	const exists = await requestRepo.hasUserRequestedData(db, userId, gameId)
	if (exists) {
		await requestRepo.removeDataRequest(db, userId, gameId)
		return { requested: false }
	}

	await requestRepo.createDataRequest(db, userId, gameId)
	return { requested: true }
}

/**
 * Get publisher statistics
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string} publisherName
 * @returns {Promise<Object>}
 */
export async function getPublisherStats (db, publisherName) {
	// We need a high limit to get accurate stats
	const searchParams = new URLSearchParams()
	searchParams.set('publisher', publisherName)
	searchParams.set('limit', '1000') // Assuming no publisher has > 1000 games for now

	const { results } = await searchRepo.searchGames(db, searchParams)

	const stats = {
		totalGames: results.length,
		tiers: {
			Perfect: 0,
			Great: 0,
			Playable: 0,
			Rough: 0,
			Unknown: 0
		}
	}

	results.forEach(game => {
		// Logic here mimics what PlayabilityBadge does
		const profile = game.performance || {}
		const scoreObj = calculatePlayabilityScore(profile)
		const score = scoreObj.score
		if (score && stats.tiers[score] !== undefined) {
			stats.tiers[score]++
		} else {
			stats.tiers.Unknown++
		}
	})

	return stats
}
/**
 * Get random games for discovery with optional limit
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {number} [limit=12]
 * @returns {Promise<Array>}
 */
export async function getRandomGames (db, limit = 12) {
	return await searchRepo.getRandomGames(db, limit)
}
