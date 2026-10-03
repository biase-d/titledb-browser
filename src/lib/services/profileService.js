import * as gameRepo from '$lib/repositories/gameRepository'
import * as contributionRepo from '$lib/repositories/contributionRepository'
import * as prefRepo from '$lib/repositories/preferencesRepository'
import { countContributions } from '$lib/contributions'

import { BADGES } from '$lib/badges'

/**
 * @typedef {Object} UserContributionResult
 * @property {Array<any>} contributions
 * @property {number} totalContributions
 * @property {string|null} currentTierName
 * @property {any|null} featuredGame
 * @property {{currentPage: number, totalPages: number, totalItems: number}|null} pagination
 */

/**
 * Get user contributions with badge calculation
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string} username
 * @param {number} page
 * @returns {Promise<UserContributionResult>}
 */
export async function getUserContributions (db, username, page) {
	const PAGE_SIZE = 24

	/** @type {[any, any]} */
	const [data, preferences] = await Promise.all([
		contributionRepo.getUserContributionStats(db, username),
		prefRepo.getUserPreferences(db, username)
	])

	// Fetch featured game info if set
	let featuredGame = null
	if (preferences?.featuredGameId) {
		featuredGame = await gameRepo.findGameById(db, preferences.featuredGameId)
	}

	// One pull request is one contribution, however many profiles, graphics
	// settings or videos it carried. The same rule as the stats page
	const totalContributions = countContributions([
		...data.perfContribs,
		...data.graphicsContribs,
		...data.videoContribs
	])
	const currentTier = BADGES.find(badge => totalContributions >= badge.threshold) || null

	const allGroupIds = [...new Set([
		...data.perfContribs.map((/** @type {any} */ p) => p.groupId),
		...data.graphicsContribs.map((/** @type {any} */ g) => g.groupId),
		...data.videoContribs.map((/** @type {any} */ v) => v.groupId)
	])]

	if (allGroupIds.length === 0) {
		return {
			contributions: [],
			totalContributions: 0,
			currentTierName: null,
			featuredGame: null,
			pagination: null
		}
	}

	const totalItems = allGroupIds.length
	const totalPages = Math.ceil(totalItems / PAGE_SIZE)
	const offset = (page - 1) * PAGE_SIZE
	const paginatedGroupIds = allGroupIds.slice(offset, offset + PAGE_SIZE)

	if (paginatedGroupIds.length === 0) {
		return {
			contributions: [],
			totalContributions,
			currentTierName: currentTier?.name || null,
			featuredGame,
			pagination: { currentPage: page, totalPages, totalItems }
		}
	}

	const gamesInvolved = await gameRepo.getGamesForGroups(db, paginatedGroupIds)

	const contributionsByGroup = new Map()

	for (const game of gamesInvolved) {
		contributionsByGroup.set(game.groupId, {
			game: { name: game.names[0], id: game.id, iconUrl: game.iconUrl, regions: game.regions },
			versions: [],
			hasGraphics: false,
			hasYoutube: false,
			performance: { docked: null, handheld: null }
		})
	}

	for (const profile of data.perfContribs) {
		if (contributionsByGroup.has(profile.groupId)) {
			const group = contributionsByGroup.get(profile.groupId)
			group.versions.push({
				version: profile.gameVersion,
				sourcePrUrl: profile.sourcePrUrl
			})

			// Capture latest performance metrics
			if (profile.profiles) {
				if (profile.profiles.docked?.target_fps && !group.performance.docked) {
					group.performance.docked = profile.profiles.docked.target_fps
				}
				if (profile.profiles.handheld?.target_fps && !group.performance.handheld) {
					group.performance.handheld = profile.profiles.handheld.target_fps
				}
			}
		}
	}
	for (const graphic of data.graphicsContribs) {
		if (contributionsByGroup.has(graphic.groupId)) {
			contributionsByGroup.get(graphic.groupId).hasGraphics = true
		}
	}
	for (const video of data.videoContribs) {
		if (contributionsByGroup.has(video.groupId)) {
			contributionsByGroup.get(video.groupId).hasYoutube = true
		}
	}

	return {
		contributions: Array.from(contributionsByGroup.values()),
		totalContributions,
		currentTierName: currentTier?.name || null,
		featuredGame,
		pagination: {
			currentPage: page,
			totalPages,
			totalItems
		}
	}
}

export { BADGES, badgeProgress } from '$lib/badges'
