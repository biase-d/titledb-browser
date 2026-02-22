import { games, performanceProfiles, graphicsSettings } from '$lib/db/schema'
import { desc, eq, sql, inArray, or, and, countDistinct, isNotNull, exists } from 'drizzle-orm'

const PAGE_SIZE = 50

/**
 * Get all games in a group
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string} groupId - Group ID
 * @returns {Promise<Array<any>>}
 */
export async function getGamesByGroup (db, groupId) {
    return await db.query.games.findMany({
        where: eq(games.groupId, groupId),
        columns: { id: true, names: true, regions: true }
    })
}

/**
 * Search games with filters
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {URLSearchParams} searchParams - Search parameters
 * @returns {Promise<Object>} Search results with pagination
 */
export async function searchGames (db, searchParams) {
    const page = parseInt(searchParams.get('page') || '1', 10)
    const q = searchParams.get('q') || ''
    const publisher = searchParams.get('publisher')
    const dockedFps = searchParams.get('docked_fps')
    const handheldFps = searchParams.get('handheld_fps')
    const resolutionType = searchParams.get('res_type')
    const sort = searchParams.get('sort') || (q ? 'relevance-desc' : 'date-desc')

    const preferredRegion = searchParams.get('region') || 'US'
    const regionFilter = searchParams.get('region_filter')

    const latestProfileSubquery = db.$with('latest_profile').as(
        db.selectDistinctOn([performanceProfiles.groupId], {
            groupId: performanceProfiles.groupId,
            profiles: performanceProfiles.profiles,
            status: performanceProfiles.status
        }).from(performanceProfiles).orderBy(performanceProfiles.groupId, desc(performanceProfiles.gameVersion))
    )

    const whereClauses = []
    const isTitleIdSearch = /^[0-9A-F]{16}$/i.test(q)

    if (q) {
        if (isTitleIdSearch) {
            whereClauses.push(eq(games.id, q.toUpperCase()))
        } else {
            const searchWords = q.split(' ').filter(word => word.length > 0)
            const allWordsCondition = and(
                ...searchWords.map(word => sql`extensions.unaccent(array_to_string(${games.names}, ' ')) ILIKE extensions.unaccent(${'%' + word + '%'})`)
            )
            whereClauses.push(allWordsCondition)
        }
    }

    if (publisher) {
        whereClauses.push(sql`extensions.unaccent(${games.publisher}) ILIKE extensions.unaccent(${publisher})`)
    }

    if (regionFilter) {
        if (regionFilter.length === 2) {
            whereClauses.push(sql`${games.regions} @> ARRAY[${regionFilter}]::text[]`)
        } else if (regionFilter === 'Europe') {
            const euCodes = ['GB', 'FR', 'DE', 'IT', 'ES', 'NL', 'PT', 'RU', 'AT', 'BE', 'BG', 'CH', 'CY', 'CZ', 'DK', 'EE', 'FI', 'GR', 'HR', 'HU', 'IE', 'IL', 'LT', 'LU', 'LV', 'MT', 'NO', 'PL', 'RO', 'SE', 'SI', 'SK']
            whereClauses.push(sql`${games.regions} && ARRAY[${euCodes}]::text[]`)
        } else if (regionFilter === 'Asia') {
            const asiaCodes = ['HK', 'TW', 'KR', 'CN', 'MO', 'JP', 'SG', 'TH', 'MY']
            whereClauses.push(sql`${games.regions} && ARRAY[${asiaCodes}]::text[]`)
        } else if (regionFilter === 'Americas') {
            const amCodes = ['US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE']
            whereClauses.push(sql`${games.regions} && ARRAY[${amCodes}]::text[]`)
        }
    }

    if (dockedFps) whereClauses.push(sql`COALESCE(${latestProfileSubquery.profiles}->'docked'->>'target_fps', ${graphicsSettings.settings}->'docked'->'framerate'->>'targetFps') = ${dockedFps}`)
    if (handheldFps) whereClauses.push(sql`COALESCE(${latestProfileSubquery.profiles}->'handheld'->>'target_fps', ${graphicsSettings.settings}->'handheld'->'framerate'->>'targetFps') = ${handheldFps}`)

    if (resolutionType) whereClauses.push(sql`${latestProfileSubquery.profiles}->'docked'->>'resolution_type' = ${resolutionType} OR ${latestProfileSubquery.profiles}->'handheld'->>'resolution_type' = ${resolutionType}`)

    const isSearchingOrFiltering = q || publisher || regionFilter || dockedFps || handheldFps || resolutionType

    if (!isSearchingOrFiltering) {
        const hasGraphics = sql`${graphicsSettings.groupId} IS NOT NULL`
        const hasMeaningfulPerformance = sql`(${latestProfileSubquery.groupId} IS NOT NULL AND ${latestProfileSubquery.profiles}::text != '{}')`
        whereClauses.push(or(hasGraphics, hasMeaningfulPerformance))
    }

    const baseWhere = whereClauses.length > 0 ? and(...whereClauses) : undefined
    const statusFilters = and(
        or(eq(latestProfileSubquery.status, 'approved'), sql`${latestProfileSubquery.status} IS NULL`),
        or(eq(graphicsSettings.status, 'approved'), sql`${graphicsSettings.status} IS NULL`)
    )
    const where = and(baseWhere, statusFilters)

    const regionPriority = sql`
		CASE 
			WHEN ${games.regions} @> ARRAY[${preferredRegion}]::text[] THEN 0 
			WHEN ${games.regions} @> ARRAY['US']::text[] THEN 1
			ELSE 2 
		END
	`

    const innerQuery = db.with(latestProfileSubquery)
        .selectDistinctOn([games.groupId], {
            id: games.id,
            groupId: games.groupId,
            names: games.names,
            regions: games.regions,
            iconUrl: games.iconUrl,
            bannerUrl: games.bannerUrl,
            publisher: games.publisher,
            lastUpdated: games.lastUpdated,
            sizeInBytes: games.sizeInBytes,
            dockedFps: sql`COALESCE(
				(${latestProfileSubquery.profiles}->'docked'->>'target_fps'), 
				(${graphicsSettings.settings}->'docked'->'framerate'->>'targetFps'),
				(${graphicsSettings.settings}->'docked'->'framerate'->>'lockType')
			)`.as('dockedFps'),
            handheldFps: sql`COALESCE(
				(${latestProfileSubquery.profiles}->'handheld'->>'target_fps'), 
				(${graphicsSettings.settings}->'handheld'->'framerate'->>'targetFps'),
				(${graphicsSettings.settings}->'handheld'->'framerate'->>'lockType')
			)`.as('handheldFps'),
            fullProfiles: latestProfileSubquery.profiles,
            graphicsSettings: graphicsSettings.settings
        })
        .from(games)
        .leftJoin(latestProfileSubquery, eq(games.groupId, latestProfileSubquery.groupId))
        .leftJoin(graphicsSettings, eq(games.groupId, graphicsSettings.groupId))
        .where(where)
        .orderBy(games.groupId, regionPriority, desc(games.lastUpdated))
        .as('grouped_games')

    const finalQuery = db.select({
        id: innerQuery.id,
        groupId: innerQuery.groupId,
        names: innerQuery.names,
        regions: innerQuery.regions,
        iconUrl: innerQuery.iconUrl,
        bannerUrl: innerQuery.bannerUrl,
        publisher: innerQuery.publisher,
        lastUpdated: innerQuery.lastUpdated,
        performance: innerQuery.fullProfiles,
        graphics: innerQuery.graphicsSettings,
        performanceSummary: sql`jsonb_build_object(
			'docked', jsonb_build_object('target_fps', ${innerQuery.dockedFps}),
			'handheld', jsonb_build_object('target_fps', ${innerQuery.handheldFps})
		)`
    })
        .from(innerQuery)

    if (isTitleIdSearch) {
        finalQuery.orderBy(desc(innerQuery.id))
    } else if (q) {
        finalQuery.orderBy(sql`extensions.word_similarity(extensions.unaccent(array_to_string(${innerQuery.names}, ' ')), extensions.unaccent(${q})) DESC`)
    } else {
        switch (sort) {
            case 'name-asc': finalQuery.orderBy(sql`${innerQuery.names}[1] ASC`); break
            case 'size-desc': finalQuery.orderBy(desc(innerQuery.sizeInBytes)); break
            case 'date-desc':
            default: finalQuery.orderBy(desc(innerQuery.lastUpdated)); break
        }
    }

    const results = await finalQuery.limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE)
    const mappedResults = results.map(r => {
        let finalPerformance = r.performance

        if (!finalPerformance) {
            finalPerformance = r.performanceSummary
        }

        return {
            ...r,
            performance: finalPerformance,
            graphics: undefined,
            performanceSummary: undefined
        }
    })

    const countResult = await db.with(latestProfileSubquery)
        .select({ count: countDistinct(games.groupId) })
        .from(games)
        .leftJoin(latestProfileSubquery, eq(games.groupId, latestProfileSubquery.groupId))
        .leftJoin(graphicsSettings, eq(games.groupId, graphicsSettings.groupId))
        .where(where)

    return {
        results: mappedResults,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil((countResult[0]?.count || 0) / PAGE_SIZE),
            totalItems: countResult[0]?.count || 0
        }
    }
}

/**
 * Find multiple games by their IDs
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string[]} ids - Array of game IDs
 * @returns {Promise<Array<any>>}
 */
export async function findGamesByIds (db, ids) {
    if (!ids || ids.length === 0) {
        return []
    }

    return await db.select({
        id: games.id,
        names: games.names
    })
        .from(games)
        .where(inArray(games.id, ids))
}

/**
 * Get random games for discovery
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {number} [limit=12] - Number of random games to fetch
 * @returns {Promise<Array<any>>}
 */
export async function getRandomGames (db, limit = 12) {
    return await db.select({
        id: games.id,
        names: games.names,
        iconUrl: games.iconUrl,
        publisher: games.publisher
    })
        .from(games)
        .where(
            and(
                isNotNull(games.iconUrl),
                or(
                    exists(
                        db.select({ one: sql`1` })
                            .from(performanceProfiles)
                            .where(eq(performanceProfiles.groupId, games.groupId))
                    ),
                    exists(
                        db.select({ one: sql`1` })
                            .from(graphicsSettings)
                            .where(eq(graphicsSettings.groupId, games.groupId))
                    )
                )
            )
        )
        .orderBy(sql`RANDOM()`)
        .limit(limit)
}
