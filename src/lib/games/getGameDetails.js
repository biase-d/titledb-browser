import { db } from '$lib/db'
import { games, performanceProfiles, graphicsSettings, youtubeLinks, gameGroups } from '$lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Fetches comprehensive details for a single game title, including its full performance history
 * @param {string} titleId - The Titledb ID of the game to fetch
 * @returns {Promise<object | null>} An object containing all game details, or null if not found
 */
export async function getGameDetails (titleId) {
	const game = await db.query.games.findFirst({
		where: eq(games.id, titleId)
	})

	if (!game) {
		return null
	}

	const { groupId } = game

	// Fetch related data in parallel
	const [groupInfo, allTitlesInGroup, allPerformanceProfiles, graphics, links] = await Promise.all([
		db.query.gameGroups.findFirst({ where: eq(gameGroups.id, groupId) }),
		// Explicitly select regions for the group members too
		db.query.games.findMany({
			where: eq(games.groupId, groupId),
			columns: { id: true, names: true, regions: true }
		}),
		db.query.performanceProfiles.findMany({ where: eq(performanceProfiles.groupId, groupId) }),
		db.query.graphicsSettings.findFirst({ where: eq(graphicsSettings.groupId, groupId) }),
		db.query.youtubeLinks.findMany({ where: eq(youtubeLinks.groupId, groupId) })
	])

	// Sort profiles by semantic version in descending order (latest first)
	allPerformanceProfiles.sort((a, b) => {
		const partsA = a.gameVersion.split('.').map(part => parseInt(part, 10) || 0)
		const partsB = b.gameVersion.split('.').map(part => parseInt(part, 10) || 0)
		const len = Math.max(partsA.length, partsB.length)

		for (let i = 0; i < len; i++) {
			const numA = partsA[i] || 0
			const numB = partsB[i] || 0
			if (numB !== numA) {
				return numB - numA
			}
		}
		return 0
	})

	// The latest profile's info is used for the main contributor display
	const latestProfile = allPerformanceProfiles[0] || null

	const gameData = {
		...game,
		graphics: graphics || null,
		performanceHistory: allPerformanceProfiles.map(p => ({
			id: p.id,
			gameVersion: p.gameVersion,
			suffix: p.suffix || '',
			profiles: p.profiles,
			contributor: p.contributor,
			sourcePrUrl: p.sourcePrUrl,
			lastUpdated: p.lastUpdated
		})),
		contributor: latestProfile?.contributor,
		sourcePrUrl: latestProfile?.sourcePrUrl
	}

	return {
		game: gameData,
		// Pass the regions to the group list as well
		allTitlesInGroup: allTitlesInGroup.map((t) => ({
			id: t.id,
			name: t.names[0],
			regions: t.regions
		})),
		youtubeLinks: links,
		youtubeContributors: groupInfo?.youtubeContributors || []
	}
}
