import { db } from '$lib/db'
import { games, performanceProfiles, graphicsSettings } from '$lib/db/schema'
import { desc, eq, sql, or, and, count, countDistinct, gte, lt } from 'drizzle-orm'

const PAGE_SIZE = 50

/**
 * Maps graphics settings (from graphics_settings table) to the performance profile structure
 * so the frontend can display them uniformly (e.g. in the Hero or List badges)
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
			fps_behavior: fps.lockType === 'API' ? 'Locked' : 'Stable' // Approximate mapping
		}
	}

	return {
		docked: mapMode(graphics.docked),
		handheld: mapMode(graphics.handheld)
	}
}

/**
 * Checks if a performance profile object has meaningful data
 */
function isPerformanceValid (perf) {
	if (!perf) return false
	// Check if it's just an empty object or only has contributor data
	const keys = Object.keys(perf)
	if (keys.length === 0) return false
	if (keys.length === 1 && keys[0] === 'contributor') return false

	// Check if specific modes have data
	const hasDocked = perf.docked && (perf.docked.resolution_type || perf.docked.target_fps)
	const hasHandheld = perf.handheld && (perf.handheld.resolution_type || perf.handheld.target_fps)

	return hasDocked || hasHandheld
}

export async function searchGames (searchParams) {
	const page = parseInt(searchParams.get('page') || '1', 10)
	const q = searchParams.get('q') || ''
	const publisher = searchParams.get('publisher')
	const dockedFps = searchParams.get('docked_fps')
	const handheldFps = searchParams.get('handheld_fps')
	const resolutionType = searchParams.get('res_type')
	const minSizeMB = searchParams.get('minSizeMB')
	const maxSizeMB = searchParams.get('maxSizeMB')
	const sort = searchParams.get('sort') || (q ? 'relevance-desc' : 'date-desc')

	const preferredRegion = searchParams.get('region') || 'US'
	const regionFilter = searchParams.get('region_filter')

	const latestProfileSubquery = db.$with('latest_profile').as(
		db.selectDistinctOn([performanceProfiles.groupId], {
			groupId: performanceProfiles.groupId,
			profiles: performanceProfiles.profiles
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

	if (minSizeMB) {
		whereClauses.push(gte(games.sizeInBytes, parseInt(minSizeMB, 10) * 1024 * 1024))
	}
	if (maxSizeMB) {
		whereClauses.push(lt(games.sizeInBytes, parseInt(maxSizeMB, 10) * 1024 * 1024))
	}

	const isSearchingOrFiltering = q || publisher || regionFilter || dockedFps || handheldFps || resolutionType || minSizeMB || maxSizeMB

	if (!isSearchingOrFiltering) {
		const hasGraphics = sql`${graphicsSettings.groupId} IS NOT NULL`
		const hasMeaningfulPerformance = sql`(${latestProfileSubquery.groupId} IS NOT NULL AND ${latestProfileSubquery.profiles}::text != '{}')`
		whereClauses.push(or(hasGraphics, hasMeaningfulPerformance))
	}

	const where = whereClauses.length > 0 ? and(...whereClauses) : undefined

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
		lastUpdated: innerQuery.lastUpdated,
		performance: innerQuery.performance,
		graphics: innerQuery.graphics,
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
		// Fallback Logic: If performance profile is missing or empty, try to use graphics settings
		let finalPerformance = r.performance

		if (!isPerformanceValid(finalPerformance) && r.graphics) {
			finalPerformance = mapGraphicsToPerformance(r.graphics)
		}

		// If still no valid performance object, fall back to the SQL summary (just FPS)
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

	const mainStatsQuery = db.select({
		totalGames: countDistinct(performanceProfiles.groupId),
		totalProfiles: count()
	}).from(performanceProfiles)

	const uniqueContributorsQuery = db.select({ count: count() }).from(
		db.selectDistinct({ c: sql`unnest(${performanceProfiles.contributor})` }).from(performanceProfiles).as('unique_contribs')
	)

	const [mainStatsResult, contributorStatsResult] = await Promise.all([
		mainStatsQuery,
		uniqueContributorsQuery
	])

	let recentUpdates = []
	if (page === 1 && !isSearchingOrFiltering && sort === 'date-desc') {
		recentUpdates = mappedResults.slice(0, 15)
	}

	return {
		results: mappedResults,
		recentUpdates,
		pagination: { currentPage: page, totalPages: Math.ceil((countResult[0]?.count || 0) / PAGE_SIZE), totalItems: countResult[0]?.count || 0 },
		stats: {
			totalGames: mainStatsResult[0]?.totalGames || 0,
			totalProfiles: mainStatsResult[0]?.totalProfiles || 0,
			totalContributors: contributorStatsResult[0]?.count || 0
		}
	}
}
