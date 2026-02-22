import { performanceProfiles, graphicsSettings, youtubeLinks, gameGroups, games, dataRequests } from '$lib/db/schema'
import { eq, sql, and, desc, inArray, count, notExists } from 'drizzle-orm'

const CONTRIBUTE_PAGE_SIZE = 50

/**
 * Save a pending contribution to the database
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {Object} contribution
 * @returns {Promise<void>}
 */
export async function savePendingContribution (db, contribution) {
    const { groupId, performance, graphics, youtube, prNumber } = contribution

    const inserts = []

    if (performance && performance.length > 0) {
        performance.forEach(profile => {
            inserts.push(db.insert(performanceProfiles).values({
                groupId,
                gameVersion: profile.gameVersion,
                suffix: profile.suffix,
                profiles: profile.profiles,
                contributor: profile.contributor,
                status: 'pending',
                prNumber
            }))
        })
    }

    if (graphics) {
        inserts.push(db.insert(graphicsSettings).values({
            groupId,
            settings: graphics.settings,
            contributor: graphics.contributor,
            status: 'pending',
            prNumber
        }).onConflictDoUpdate({
            target: graphicsSettings.groupId,
            set: {
                settings: graphics.settings,
                contributor: graphics.contributor,
                status: 'pending',
                prNumber,
                lastUpdated: sql`NOW()`
            }
        }))
    }

    if (youtube && youtube.length > 0) {
        youtube.forEach(link => {
            inserts.push(db.insert(youtubeLinks).values({
                groupId,
                url: link.url,
                notes: link.notes,
                submittedBy: link.submittedBy,
                status: 'pending',
                prNumber
            }))
        })
    }

    await Promise.all(inserts)
}

/**
 * Get all pending contributions
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @returns {Promise<Object>}
 */
export async function getPendingContributions (db) {
    const [perf, graphs, vids] = await Promise.all([
        db.query.performanceProfiles.findMany({ where: eq(performanceProfiles.status, 'pending') }),
        db.query.graphicsSettings.findMany({ where: eq(graphicsSettings.status, 'pending') }),
        db.query.youtubeLinks.findMany({ where: eq(youtubeLinks.status, 'pending') })
    ])

    return {
        performance: perf,
        graphics: graphs,
        youtube: vids
    }
}

/**
 * Approve a pending contribution
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {number} prNumber
 * @returns {Promise<void>}
 */
export async function approveContribution (db, prNumber) {
    await Promise.all([
        db.update(performanceProfiles).set({ status: 'approved' }).where(eq(performanceProfiles.prNumber, prNumber)),
        db.update(graphicsSettings).set({ status: 'approved' }).where(eq(graphicsSettings.prNumber, prNumber)),
        db.update(youtubeLinks).set({ status: 'approved' }).where(eq(youtubeLinks.prNumber, prNumber))
    ])
}

/**
 * Reject a pending contribution
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {number} prNumber
 * @returns {Promise<void>}
 */
export async function rejectContribution (db, prNumber) {
    await Promise.all([
        db.update(performanceProfiles).set({ status: 'rejected' }).where(eq(performanceProfiles.prNumber, prNumber)),
        db.update(graphicsSettings).set({ status: 'rejected' }).where(eq(graphicsSettings.prNumber, prNumber)),
        db.update(youtubeLinks).set({ status: 'rejected' }).where(eq(youtubeLinks.prNumber, prNumber))
    ])
}

/**
 * Get user contribution statistics for profile page
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string} username
 * @returns {Promise<{perfContribs: Array<any>, graphicsContribs: Array<any>, videoContribs: Array<any>}>}
 */
export async function getUserContributionStats (db, username) {
    const [perfContribs, graphicsContribs, videoContribs] = await Promise.all([
        db.select({
            groupId: performanceProfiles.groupId,
            gameVersion: performanceProfiles.gameVersion,
            profiles: performanceProfiles.profiles,
            sourcePrUrl: performanceProfiles.sourcePrUrl,
            prNumber: performanceProfiles.prNumber
        }).from(performanceProfiles).where(
            and(
                sql`${username} ILIKE ANY(${performanceProfiles.contributor})`,
                eq(performanceProfiles.status, 'approved')
            )
        ),

        db.select({
            groupId: graphicsSettings.groupId,
            prNumber: graphicsSettings.prNumber
        }).from(graphicsSettings).where(
            and(
                sql`${username} ILIKE ANY(${graphicsSettings.contributor})`,
                eq(graphicsSettings.status, 'approved')
            )
        ),

        db.select({
            groupId: youtubeLinks.groupId,
            prNumber: youtubeLinks.prNumber
        }).from(youtubeLinks).where(
            and(
                sql`${youtubeLinks.submittedBy} ILIKE ${username}`,
                eq(youtubeLinks.status, 'approved')
            )
        )
    ])

    return { perfContribs, graphicsContribs, videoContribs }
}

/**
 * Get groups missing performance/graphics data for contribute page
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {Object} options
 * @param {number} options.page
 * @param {string} options.sortBy
 * @param {string} options.preferredRegion
 * @returns {Promise<{games: Array, sortBy: string, pagination: Object}>}
 */
export async function getMissingDataGroups (db, { page, sortBy, preferredRegion }) {
    const subqueryPerformance = db
        .select({ groupId: performanceProfiles.groupId })
        .from(performanceProfiles)
        .where(eq(performanceProfiles.groupId, gameGroups.id))

    const subqueryGraphics = db
        .select({ groupId: graphicsSettings.groupId })
        .from(graphicsSettings)
        .where(eq(graphicsSettings.groupId, gameGroups.id))

    // Find groups that have NO data
    const countQuery = db
        .select({ count: count() })
        .from(gameGroups)
        .where(and(notExists(subqueryPerformance), notExists(subqueryGraphics)))

    // Get total count for pagination
    const totalCountResult = await countQuery
    const totalItems = totalCountResult[0].count
    const totalPages = Math.ceil(totalItems / CONTRIBUTE_PAGE_SIZE)

    const groupsQuery = db
        .select({ id: gameGroups.id })
        .from(gameGroups)
        .leftJoin(games, eq(games.groupId, gameGroups.id))
        .where(and(notExists(subqueryPerformance), notExists(subqueryGraphics)))
        .groupBy(gameGroups.id)
        .orderBy(desc(sql`MAX(${games.lastUpdated})`))

    // Get paginated group IDs
    let groupIds = []

    if (sortBy === 'requests') {
        const rankedGroups = await db.select({
            groupId: games.groupId,
            requestCount: count(dataRequests.userId)
        })
            .from(games)
            .leftJoin(dataRequests, eq(games.id, dataRequests.gameId))
            .where(inArray(games.groupId, groupsQuery))
            .groupBy(games.groupId)
            .orderBy(desc(count(dataRequests.userId)))
            .limit(CONTRIBUTE_PAGE_SIZE)
            .offset((page - 1) * CONTRIBUTE_PAGE_SIZE)

        groupIds = rankedGroups.map(g => g.groupId)
    } else {
        const groupsWithMissingData = await groupsQuery.limit(CONTRIBUTE_PAGE_SIZE).offset((page - 1) * CONTRIBUTE_PAGE_SIZE)
        groupIds = groupsWithMissingData.map(g => g.id)
    }

    let gamesList = []
    if (groupIds.length > 0) {
        const regionPriority = sql`
            CASE 
                WHEN ${games.regions} @> ARRAY[${preferredRegion}]::text[] THEN 0 
                WHEN ${games.regions} @> ARRAY['US']::text[] THEN 1
                ELSE 2 
            END
        `

        const requestCountSubquery = db.select({
            gameId: dataRequests.gameId,
            count: count(dataRequests.userId).as('req_count')
        }).from(dataRequests).groupBy(dataRequests.gameId).as('req_counts')

        gamesList = await db
            .selectDistinctOn([games.groupId], {
                id: games.id,
                names: games.names,
                iconUrl: games.iconUrl,
                regions: games.regions,
                requestCount: sql`COALESCE(${requestCountSubquery.count}, 0)`
            })
            .from(games)
            .leftJoin(requestCountSubquery, eq(games.id, requestCountSubquery.gameId))
            .where(inArray(games.groupId, groupIds))
            .orderBy(games.groupId, regionPriority)

        if (sortBy === 'requests') {
            gamesList.sort((a, b) => Number(b.requestCount) - Number(a.requestCount))
        } else {
            // Restore intended sequence of latest updated groups from groupIds
            const groupOrderMap = new Map(groupIds.map((id, index) => [id, index]))
            gamesList.sort((a, b) => groupOrderMap.get(a.groupId) - groupOrderMap.get(b.groupId))
        }
    }

    return {
        games: gamesList,
        sortBy,
        pagination: {
            currentPage: page,
            totalPages,
            totalItems
        }
    }
}
