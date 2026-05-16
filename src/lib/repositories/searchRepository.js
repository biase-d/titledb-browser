import { games, performanceProfiles, graphicsSettings } from '$lib/db/schema'
import { desc, eq, sql, or, and, countDistinct, isNotNull, exists } from 'drizzle-orm'
import { calculatePlayabilityScore } from '$lib/playability'

const PAGE_SIZE = 50

/**
 * Maps graphics settings to the performance profile structure
 */
function mapGraphicsToPerformance (graphics) {
	if (!graphics) return null
	const mapMode = (gMode) => {
		if (!gMode) return {}
		const res = gMode.resolution || {}
		const fps = gMode.framerate || {}
		return {
			resolution_type: res.resolutionType,
			resolution: res.fixedResolution,
			min_res: res.minResolution,
			max_res: res.maxResolution,
			resolutions: res.multipleResolutions?.join(', '),
			target_fps: fps.targetFps || (fps.lockType === 'Unlocked' ? 'Unlocked' : null),
			fps_behavior: fps.lockType === 'API' ? 'Locked' : 'Stable'
		}
	}
	return { docked: mapMode(graphics.docked), handheld: mapMode(graphics.handheld) }
}

function isPerformanceValid (perf) {
	if (!perf) return false
	const keys = Object.keys(perf)
	if (keys.length === 0 || (keys.length === 1 && keys[0] === 'contributor')) return false
	const hasDocked = perf.docked && (perf.docked.resolution_type || perf.docked.target_fps)
	const hasHandheld = perf.handheld && (perf.handheld.resolution_type || perf.handheld.target_fps)
	return hasDocked || hasHandheld
}

/**
 * Search games with filters and mapping
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {URLSearchParams} searchParams
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
    if (q) {
        if (/^[0-9A-F]{16}$/i.test(q)) {
            whereClauses.push(eq(games.id, q.toUpperCase()))
        } else {
            const searchWords = q.split(' ').filter(word => word.length > 0)
            whereClauses.push(and(...searchWords.map(word => sql`extensions.unaccent(array_to_string(${games.names}, ' ')) ILIKE extensions.unaccent(${'%' + word + '%'})`)))
        }
    }
    if (publisher) whereClauses.push(sql`extensions.unaccent(${games.publisher}) ILIKE extensions.unaccent(${publisher})`)
    
    if (regionFilter) {
        if (regionFilter.length === 2) {
            whereClauses.push(sql`${games.regions} @> ARRAY[${regionFilter}]::text[]`)
        } else {
            const regions = regionFilter === 'Europe' ? ['GB', 'FR', 'DE', 'IT', 'ES', 'NL', 'PT', 'RU', 'AT', 'BE', 'BG', 'CH', 'CY', 'CZ', 'DK', 'EE', 'FI', 'GR', 'HR', 'HU', 'IE', 'IL', 'LT', 'LU', 'LV', 'MT', 'NO', 'PL', 'RO', 'SE', 'SI', 'SK'] :
                            regionFilter === 'Asia' ? ['HK', 'TW', 'KR', 'CN', 'MO', 'JP', 'SG', 'TH', 'MY'] :
                            regionFilter === 'Americas' ? ['US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE'] : []
            whereClauses.push(sql`${games.regions} && ARRAY[${regions}]::text[]`)
        }
    }

    if (dockedFps) whereClauses.push(sql`COALESCE(${latestProfileSubquery.profiles}->'docked'->>'target_fps', ${graphicsSettings.settings}->'docked'->'framerate'->>'targetFps') = ${dockedFps}`)
    if (handheldFps) whereClauses.push(sql`COALESCE(${latestProfileSubquery.profiles}->'handheld'->>'target_fps', ${graphicsSettings.settings}->'handheld'->'framerate'->>'targetFps') = ${handheldFps}`)
    if (resolutionType) whereClauses.push(sql`${latestProfileSubquery.profiles}->'docked'->>'resolution_type' = ${resolutionType} OR ${latestProfileSubquery.profiles}->'handheld'->>'resolution_type' = ${resolutionType}`)

    if (!(q || publisher || regionFilter || dockedFps || handheldFps || resolutionType)) {
        whereClauses.push(or(sql`${graphicsSettings.groupId} IS NOT NULL`, sql`(${latestProfileSubquery.groupId} IS NOT NULL AND ${latestProfileSubquery.profiles}::text != '{}')`))
    }

    const baseWhere = whereClauses.length > 0 ? and(...whereClauses) : undefined
    const statusFilters = and(
        or(eq(latestProfileSubquery.status, 'approved'), sql`${latestProfileSubquery.status} IS NULL`),
        or(eq(graphicsSettings.status, 'approved'), sql`${graphicsSettings.status} IS NULL`)
    )
    const where = and(baseWhere, statusFilters)

    const regionPriority = sql`CASE WHEN ${games.regions} @> ARRAY[${preferredRegion}]::text[] THEN 0 WHEN ${games.regions} @> ARRAY['US']::text[] THEN 1 ELSE 2 END`

    const innerQuery = db.with(latestProfileSubquery)
        .selectDistinctOn([games.groupId], {
            id: games.id,
            groupId: games.groupId,
            names: games.names,
            regions: games.regions,
            iconUrl: games.iconUrl,
            bannerUrl: games.bannerUrl,
            publisher: games.publisher,
            releaseDate: games.releaseDate,
            lastUpdated: games.lastUpdated,
            groupLastUpdated: sql`MAX(${games.lastUpdated}) OVER (PARTITION BY ${games.groupId})`.as('groupLastUpdated'),
            sizeInBytes: games.sizeInBytes,
            dockedFps: sql`COALESCE((${latestProfileSubquery.profiles}->'docked'->>'target_fps'), (${graphicsSettings.settings}->'docked'->'framerate'->>'targetFps'), (${graphicsSettings.settings}->'docked'->'framerate'->>'lockType'))`.as('dockedFps'),
            handheldFps: sql`COALESCE((${latestProfileSubquery.profiles}->'handheld'->>'target_fps'), (${graphicsSettings.settings}->'handheld'->'framerate'->>'targetFps'), (${graphicsSettings.settings}->'handheld'->'framerate'->>'lockType'))`.as('handheldFps'),
            performance: latestProfileSubquery.profiles,
            graphics: graphicsSettings.settings
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
        releaseDate: innerQuery.releaseDate,
        lastUpdated: innerQuery.lastUpdated,
        groupLastUpdated: innerQuery.groupLastUpdated,
        sizeInBytes: innerQuery.sizeInBytes,
        performance: innerQuery.performance,
        graphics: innerQuery.graphics,
        performanceSummary: sql`jsonb_build_object('docked', jsonb_build_object('target_fps', ${innerQuery.dockedFps}), 'handheld', jsonb_build_object('target_fps', ${innerQuery.handheldFps}))`
    }).from(innerQuery)

    if (q) {
        finalQuery.orderBy(sql`extensions.word_similarity(extensions.unaccent(array_to_string(${innerQuery.names}, ' ')), extensions.unaccent(${q})) DESC`)
    } else {
        switch (sort) {
            case 'name-asc': finalQuery.orderBy(sql`${innerQuery.names}[1] ASC`); break
            case 'size-desc': finalQuery.orderBy(desc(innerQuery.sizeInBytes)); break
            case 'date-desc':
            default: finalQuery.orderBy(desc(innerQuery.groupLastUpdated)); break
        }
    }

    const results = await finalQuery.limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE)
    const mappedResults = results.map(r => {
        let perf = r.performance
        if (!isPerformanceValid(perf) && r.graphics) perf = mapGraphicsToPerformance(r.graphics)
        if (!perf) perf = r.performanceSummary
        return { ...r, performance: perf, graphics: undefined, performanceSummary: undefined }
    })

    const countResult = await db.with(latestProfileSubquery)
        .select({ count: countDistinct(games.groupId) })
        .from(games)
        .leftJoin(latestProfileSubquery, eq(games.groupId, latestProfileSubquery.groupId))
        .leftJoin(graphicsSettings, eq(games.groupId, graphicsSettings.groupId))
        .where(where)

    return { results: mappedResults, pagination: { currentPage: page, totalPages: Math.ceil((countResult[0]?.count || 0) / PAGE_SIZE), totalItems: countResult[0]?.count || 0 } }
}

export async function getRandomGames (db, limit = 12) {
    return await db.select({ id: games.id, names: games.names, iconUrl: games.iconUrl, publisher: games.publisher })
        .from(games)
        .where(and(isNotNull(games.iconUrl), or(exists(db.select({ one: sql`1` }).from(performanceProfiles).where(eq(performanceProfiles.groupId, games.groupId))), exists(db.select({ one: sql`1` }).from(graphicsSettings).where(eq(graphicsSettings.groupId, games.groupId))))))
        .orderBy(sql`RANDOM()`)
        .limit(limit)
}

export async function getGamesByGroup (db, groupId) {
    return await db.select({ id: games.id, names: games.names, regions: games.regions }).from(games).where(eq(games.groupId, groupId))
}

export async function findGamesByIds (db, ids) {
    if (!ids || ids.length === 0) return []
    return await db.select({ id: games.id, names: games.names }).from(games).where(inArray(games.id, ids))
}
