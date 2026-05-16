import { db } from '$lib/db'
import { performanceProfiles } from '$lib/db/schema'
import { sql, count } from 'drizzle-orm'
import { searchGames as repoSearch } from '$lib/repositories/searchRepository'

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

/**
 * Proxy to the repository search with additional frontend mapping
 * @param {URLSearchParams} searchParams
 */
export async function searchGames (searchParams) {
	const { results, pagination } = await repoSearch(db, searchParams)

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
			releaseDate: r.releaseDate,
			graphics: undefined,
			performanceSummary: undefined
		}
	})

	const mainStatsQuery = db.select({
		totalGames: sql`count(distinct ${performanceProfiles.groupId})`,
		totalProfiles: count()
	}).from(performanceProfiles)

	const uniqueContributorsQuery = db.select({ count: count() }).from(
		db.selectDistinct({ c: sql`unnest(${performanceProfiles.contributor})` }).from(performanceProfiles).as('unique_contribs')
	)

	const [mainStatsResult, contributorStatsResult] = await Promise.all([
		mainStatsQuery,
		uniqueContributorsQuery
	])

	const isSearchingOrFiltering = searchParams.get('q') || 
                                   searchParams.get('publisher') || 
                                   searchParams.get('region_filter') || 
                                   searchParams.get('docked_fps') || 
                                   searchParams.get('handheld_fps') || 
                                   searchParams.get('res_type')

	let recentUpdates = []
    const sort = searchParams.get('sort') || (searchParams.get('q') ? 'relevance-desc' : 'date-desc')
	if (parseInt(searchParams.get('page') || '1', 10) === 1 && !isSearchingOrFiltering && sort === 'date-desc') {
		recentUpdates = mappedResults.slice(0, 15)
	}

	return {
		results: mappedResults,
		recentUpdates,
		pagination,
		stats: {
			totalGames: mainStatsResult[0]?.totalGames || 0,
			totalProfiles: mainStatsResult[0]?.totalProfiles || 0,
			totalContributors: contributorStatsResult[0]?.count || 0
		}
	}
}
