import { games, performanceProfiles, graphicsSettings, gameGroups, youtubeLinks, submissions } from '$lib/db/schema'
import { desc, eq, sql, inArray, and, or } from 'drizzle-orm'

/**
 * Find a single game by ID
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string} titleId - Game title ID
 * @returns {Promise<Object|null>}
 */
export async function findGameById (db, titleId) {
	const result = await db.query.games.findFirst({
		where: eq(games.id, titleId)
	})

	return result || null
}

/**
 * Get detailed game information including performance history
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string} titleId - Game title ID
 * @returns {Promise<Object|null>}
 */
export async function getGameDetails (db, titleId) {
	const game = await db.query.games.findFirst({
		where: eq(games.id, titleId)
	})

	if (!game) {
		return null
	}

	const { groupId } = game

	const [groupInfo, allTitlesInGroup, allPerformanceProfiles, graphics, links, pendingSubmissions] = await Promise.all([
		db.query.gameGroups.findFirst({ where: eq(gameGroups.id, groupId) }),
		db.query.games.findMany({
			where: or(eq(games.groupId, groupId), sql`${games.names}[1] = ${game.names[0]}`),
			columns: { id: true, names: true, regions: true }
		}),
		db.query.performanceProfiles.findMany({
			where: and(eq(performanceProfiles.groupId, groupId), eq(performanceProfiles.status, 'approved'))
		}),
		db.query.graphicsSettings.findFirst({
			where: and(eq(graphicsSettings.groupId, groupId), eq(graphicsSettings.status, 'approved'))
		}),
		db.query.youtubeLinks.findMany({
			where: and(eq(youtubeLinks.groupId, groupId), eq(youtubeLinks.status, 'approved'))
		}),
		db.select().from(submissions).where(
			and(eq(submissions.groupId, groupId), eq(submissions.status, 'pending'))
		)
	])

	// Sort profiles by semantic version
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

	// Flatten pending performance submissions into profile-shaped objects
	const pendingProfiles = pendingSubmissions
		.filter(s => s.type === 'performance' && Array.isArray(s.data))
		.flatMap(s => s.data.map(profile => ({
			id: `pending-${s.id}-${profile.gameVersion}`,
			gameVersion: profile.gameVersion,
			suffix: profile.suffix || '',
			profiles: profile.profiles || {},
			contributor: profile.contributor || [],
			sourcePrUrl: null,
			lastUpdated: s.createdAt,
			isPending: true
		})))

	const latestProfile = allPerformanceProfiles[0] || null

	const gameData = {
		...game,
		graphics: graphics || null,
		performanceHistory: [
			...allPerformanceProfiles.map(p => ({
				id: p.id,
				gameVersion: p.gameVersion,
				suffix: p.suffix || '',
				profiles: p.profiles,
				contributor: p.contributor,
				sourcePrUrl: p.sourcePrUrl,
				lastUpdated: p.lastUpdated
			})),
			...pendingProfiles
		],
		contributor: latestProfile?.contributor,
		sourcePrUrl: latestProfile?.sourcePrUrl
	}

	return {
		game: gameData,
		allTitlesInGroup: allTitlesInGroup.map((t) => ({
			id: t.id,
			name: t.names[0],
			regions: t.regions
		})),
		youtubeLinks: links,
		youtubeContributors: groupInfo?.youtubeContributors || []
	}
}

/**
 * Get game IDs and last updated for sitemap generation
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {number} [limit=45000] - Maximum number of games
 * @returns {Promise<Array<{id: string, lastUpdated: Date|null}>>}
 */
export async function getGameIdsForSitemap (db, limit = 45000) {
	return await db.select({
		id: games.id,
		lastUpdated: games.lastUpdated
	})
		.from(games)
		.orderBy(desc(games.lastUpdated))
		.limit(limit)
}

/**
 * Get game with performance data for OG image generation
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string} gameId - Game ID
 * @returns {Promise<{game: Object, performance: Object|null, graphics: Object|null}|null>}
 */
export async function getGameWithPerformanceForOg (db, gameId) {
	const game = await db.query.games.findFirst({ where: eq(games.id, gameId) })
	if (!game) return null

	const groupId = game.groupId
	const [allProfiles, graphics] = await Promise.all([
		db.query.performanceProfiles.findMany({
			where: and(eq(performanceProfiles.groupId, groupId), eq(performanceProfiles.status, 'approved'))
		}),
		db.query.graphicsSettings.findFirst({
			where: and(eq(graphicsSettings.groupId, groupId), eq(graphicsSettings.status, 'approved'))
		})
	])

	// Sort profiles by semantic version
	allProfiles.sort((a, b) => {
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

	const perf = allProfiles[0] || null

	return { game, performance: perf, graphics: graphics || null }
}

/**
 * Get favorited games with performance data
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string[]} gameIds - Array of game IDs
 * @returns {Promise<Array>}
 */
export async function getFavoriteGamesWithPerformance (db, gameIds) {
	if (!gameIds || gameIds.length === 0) return []

	const latestProfileSubquery = db.$with('latest_profile').as(
		db.selectDistinctOn([performanceProfiles.groupId], {
			groupId: performanceProfiles.groupId,
			profiles: performanceProfiles.profiles
		}).from(performanceProfiles).orderBy(performanceProfiles.groupId, desc(performanceProfiles.gameVersion))
	)

	return await db.with(latestProfileSubquery)
		.select({
			id: games.id,
			groupId: games.groupId,
			names: games.names,
			regions: games.regions,
			iconUrl: games.iconUrl,
			publisher: games.publisher,
			performance: sql`
                jsonb_build_object(
                    'docked', jsonb_build_object(
                        'target_fps', 
                        COALESCE(
                            (${latestProfileSubquery.profiles}->'docked'->>'target_fps'), 
                            (${graphicsSettings.settings}->'docked'->'framerate'->>'targetFps'),
                            (${graphicsSettings.settings}->'docked'->'framerate'->>'lockType')
                        )
                    ),
                    'handheld', jsonb_build_object(
                        'target_fps', 
                        COALESCE(
                            (${latestProfileSubquery.profiles}->'handheld'->>'target_fps'), 
                            (${graphicsSettings.settings}->'handheld'->'framerate'->>'targetFps'),
                            (${graphicsSettings.settings}->'handheld'->'framerate'->>'lockType')
                        )
                    )
                )
            `
		})
		.from(games)
		.leftJoin(latestProfileSubquery, eq(games.groupId, latestProfileSubquery.groupId))
		.leftJoin(graphicsSettings, eq(games.groupId, graphicsSettings.groupId))
		.where(inArray(games.id, gameIds))
}

/**
 * Get games for a list of group IDs (for profile contributions display)
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string[]} groupIds
 * @returns {Promise<Array>}
 */
export async function getGamesForGroups (db, groupIds) {
	if (!groupIds || groupIds.length === 0) return []

	return await db.selectDistinctOn([games.groupId], {
		id: games.id,
		groupId: games.groupId,
		names: games.names,
		regions: games.regions,
		iconUrl: games.iconUrl
	}).from(games).where(inArray(games.groupId, groupIds))
}
