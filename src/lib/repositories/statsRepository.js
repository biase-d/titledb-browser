import { games, performanceProfiles, graphicsSettings, youtubeLinks, dataRequests, favorites } from '$lib/db/schema'
import { and, count, countDistinct, desc, eq, gte, inArray, lt, or, sql, sum } from 'drizzle-orm'
import { countContributions, tallyContributors } from '$lib/contributions'

const GB = 1024 ** 3
const MB = 1024 ** 2

/**
 * Size buckets, in display order. The filter, the CASE expression and the sort
 * order are all generated from this one list
 * @type {Array<{ label: string, min: number, max: number | null }>}
 */
export const SIZE_BUCKETS = [
	{ label: '<100MB', min: 0, max: 100 * MB },
	{ label: '100-200MB', min: 100 * MB, max: 200 * MB },
	{ label: '200-300MB', min: 200 * MB, max: 300 * MB },
	{ label: '300-400MB', min: 300 * MB, max: 400 * MB },
	{ label: '400-500MB', min: 400 * MB, max: 500 * MB },
	{ label: '500MB-1GB', min: 500 * MB, max: GB },
	{ label: '1-2GB', min: GB, max: 2 * GB },
	{ label: '2-3GB', min: 2 * GB, max: 3 * GB },
	{ label: '3-4GB', min: 3 * GB, max: 4 * GB },
	{ label: '4-5GB', min: 4 * GB, max: 5 * GB },
	{ label: '5-10GB', min: 5 * GB, max: 10 * GB },
	{ label: '10-15GB', min: 10 * GB, max: 15 * GB },
	{ label: '15-20GB', min: 15 * GB, max: 20 * GB },
	{ label: '>20GB', min: 20 * GB, max: null }
]

const REGION_CODE = /^[A-Z]{2}$/

/**
 * Turns a raw frame-rate value from a profile into a bucket label
 * @param {string | null} value
 * @returns {string | null} null when the profile has no value for it
 */
function fpsBucket (value) {
	if (value === null || value === undefined || value === '') return null
	if (/^unlocked$/i.test(value)) return 'Unlocked'
	const n = Number(value)
	return Number.isFinite(n) && n > 0 ? String(Math.round(n)) : 'Other'
}

/**
 * @param {Array<string | null>} values
 * @returns {Array<{ label: string, count: number }>} numeric buckets ascending, then Unlocked, then Other
 */
function tallyFps (values) {
	/** @type {Map<string, number>} */
	const counts = new Map()
	for (const v of values) {
		const bucket = fpsBucket(v)
		if (bucket) counts.set(bucket, (counts.get(bucket) ?? 0) + 1)
	}
	const rank = (/** @type {string} */ label) => label === 'Other' ? Infinity : label === 'Unlocked' ? 1e6 : Number(label)
	return [...counts.entries()]
		.map(([label, n]) => ({ label, count: n }))
		.sort((a, b) => rank(a.label) - rank(b.label))
}

/**
 * Get statistics for the library, scoped by the given filters
 *
 * Every figure on the page reflects the filters, including the contribution
 * numbers: they are computed for the title groups that have at least one title
 * matching, so choosing a region shows that region's data and its contributors
 *
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {URLSearchParams} searchParams - region, publisher, year, sizeBucket
 * @returns {Promise<Object>}
 */
export async function getStats (db, searchParams) {
	const regionParam = searchParams.get('region')?.toUpperCase() ?? null
	const region = regionParam && REGION_CODE.test(regionParam) ? regionParam : null
	const publisher = searchParams.get('publisher') || null
	const yearParam = Number(searchParams.get('year'))
	const year = Number.isInteger(yearParam) && yearParam > 0 ? yearParam : null
	const sizeBucket = SIZE_BUCKETS.some(b => b.label === searchParams.get('sizeBucket')) ? searchParams.get('sizeBucket') : null

	const yearExpr = sql`CAST(FLOOR(${games.releaseDate} / 10000) AS INTEGER)`

	/**
	 * The WHERE clause for the active filters, optionally leaving one out. A
	 * chart that picks a filter is drawn without it, so choosing a year leaves
	 * the other years visible to switch to
	 * @param {'region' | 'publisher' | 'year' | 'sizeBucket'} [except]
	 */
	const scopeWithout = (except) => {
		const conditions = []
		if (region && except !== 'region') conditions.push(sql`${games.regions} @> ARRAY[${region}]::text[]`)
		if (publisher && except !== 'publisher') conditions.push(eq(games.publisher, publisher))
		if (year && except !== 'year') conditions.push(sql`${yearExpr} = ${year}`)
		if (sizeBucket && except !== 'sizeBucket') {
			const bucket = /** @type {NonNullable<typeof SIZE_BUCKETS[number]>} */ (SIZE_BUCKETS.find(b => b.label === sizeBucket))
			conditions.push(gte(games.sizeInBytes, bucket.min === 0 ? 1 : bucket.min))
			if (bucket.max !== null) conditions.push(lt(games.sizeInBytes, bucket.max))
		}
		return conditions.length > 0 ? and(...conditions) : undefined
	}
	const gameScope = scopeWithout()

	// Title groups with at least one title in scope. Contributions belong to
	// groups, not titles, so this is what carries the region over to them
	const groupsInScope = db.select({ id: games.groupId }).from(games).where(gameScope)

	const sizeBucketCase = sql.raw(`CASE ${SIZE_BUCKETS.map(b =>
		`WHEN "size_in_bytes" >= ${b.min === 0 ? 1 : b.min}${b.max !== null ? ` AND "size_in_bytes" < ${b.max}` : ''} THEN '${b.label}'`
	).join(' ')} END`)
	const sizeBucketOrder = sql.raw(`CASE ${SIZE_BUCKETS.map((b, i) => `WHEN "size_in_bytes" >= ${b.min === 0 ? 1 : b.min}${b.max !== null ? ` AND "size_in_bytes" < ${b.max}` : ''} THEN ${i}`).join(' ')} END`)

	const approved = (/** @type {any} */ table) => eq(table.status, 'approved')

	const [
		[libraryKpis],
		regionOptions,
		releasesByYear,
		topPublishers,
		sizeDistribution,
		perfRows,
		graphicsRows,
		videoRows,
		latestProfiles,
		activityByMonth,
		[requestsTotal],
		[favoritesTotal],
		topRequested,
		topFavorited,
		filteredGames
	] = await Promise.all([
		db.select({
			titles: count(games.id),
			groups: countDistinct(games.groupId),
			publishers: countDistinct(games.publisher),
			totalSize: sum(games.sizeInBytes)
		}).from(games).where(gameScope),

		// The region picker lists every region, whatever is selected now
		db.select({ code: sql`region`.as('code'), titles: count() })
			.from(sql`${games}, unnest(${games.regions}) AS region`)
			.groupBy(sql`region`)
			.orderBy(desc(count()), sql`region`),

		db.select({ year: yearExpr.as('year'), count: count(games.id) })
			.from(games)
			.where(and(scopeWithout('year'), sql`${games.releaseDate} IS NOT NULL`, gte(yearExpr, 1990), lt(yearExpr, 2100)))
			.groupBy(sql`year`)
			.orderBy(sql`year`),

		db.select({ publisher: games.publisher, count: count(games.id) })
			.from(games)
			.where(and(scopeWithout('publisher'), sql`${games.publisher} IS NOT NULL`))
			.groupBy(games.publisher)
			.orderBy(desc(count(games.id)), games.publisher)
			// Fourteen, so the list fills the card beside the download-size chart
			.limit(14),

		// Titles with no recorded size have no bucket and are left out of this
		// chart only - they are still titles, and still counted everywhere else
		db.select({ bucket: sizeBucketCase.as('bucket'), count: count(games.id) })
			.from(games)
			.where(and(scopeWithout('sizeBucket'), gte(games.sizeInBytes, 1)))
			.groupBy(sizeBucketCase, sizeBucketOrder)
			.orderBy(sizeBucketOrder),

		db.select({
			groupId: performanceProfiles.groupId,
			prNumber: performanceProfiles.prNumber,
			sourcePrUrl: performanceProfiles.sourcePrUrl,
			contributor: performanceProfiles.contributor
		}).from(performanceProfiles)
			.where(and(approved(performanceProfiles), inArray(performanceProfiles.groupId, groupsInScope))),

		db.select({
			groupId: graphicsSettings.groupId,
			prNumber: graphicsSettings.prNumber,
			contributor: graphicsSettings.contributor
		}).from(graphicsSettings)
			.where(and(approved(graphicsSettings), inArray(graphicsSettings.groupId, groupsInScope))),

		db.select({
			groupId: youtubeLinks.groupId,
			prNumber: youtubeLinks.prNumber,
			submittedBy: youtubeLinks.submittedBy
		}).from(youtubeLinks)
			.where(and(approved(youtubeLinks), inArray(youtubeLinks.groupId, groupsInScope))),

		// The newest profile of each group, reduced to the three fields charted.
		// Combines community performance profiles and graphics settings with COALESCE,
		// matching the logic used across the site
		(() => {
			const latestProfile = db.$with('latest_profile').as(
				db.selectDistinctOn([performanceProfiles.groupId], {
					groupId: performanceProfiles.groupId,
					profiles: performanceProfiles.profiles,
					status: performanceProfiles.status,
					lastUpdated: performanceProfiles.lastUpdated
				}).from(performanceProfiles)
					.where(and(approved(performanceProfiles), inArray(performanceProfiles.groupId, groupsInScope)))
					.orderBy(performanceProfiles.groupId, desc(performanceProfiles.lastUpdated))
			)
			const scopeGroups = db.$with('scope_groups').as(
				db.selectDistinct({ groupId: games.groupId }).from(games).where(gameScope)
			)

			return db.with(latestProfile, scopeGroups).select({
				dockedFps: sql`COALESCE(
					(${latestProfile.profiles}->'docked'->>'target_fps'),
					CASE WHEN (${graphicsSettings.settings}->'docked'->'framerate'->>'lockType') = 'Unlocked' THEN 'Unlocked' END,
					(${graphicsSettings.settings}->'docked'->'framerate'->>'targetFps'),
					(${graphicsSettings.settings}->'docked'->'framerate'->>'lockType')
				)`.as('docked_fps'),
				handheldFps: sql`COALESCE(
					(${latestProfile.profiles}->'handheld'->>'target_fps'),
					CASE WHEN (${graphicsSettings.settings}->'handheld'->'framerate'->>'lockType') = 'Unlocked' THEN 'Unlocked' END,
					(${graphicsSettings.settings}->'handheld'->'framerate'->>'targetFps'),
					(${graphicsSettings.settings}->'handheld'->'framerate'->>'lockType')
				)`.as('handheld_fps'),
				dockedResolution: sql`COALESCE(
					(${latestProfile.profiles}->'docked'->>'resolution_type'),
					(${graphicsSettings.settings}->'docked'->'resolution'->>'resolutionType')
				)`.as('docked_resolution')
			}).from(scopeGroups)
				.leftJoin(latestProfile, eq(scopeGroups.groupId, latestProfile.groupId))
				.leftJoin(graphicsSettings, and(eq(scopeGroups.groupId, graphicsSettings.groupId), approved(graphicsSettings)))
				.where(or(
					sql`(${latestProfile.groupId} IS NOT NULL AND ${latestProfile.profiles}::text != '{}')`,
					sql`${graphicsSettings.groupId} IS NOT NULL`
				))
		})(),

		db.select({
			month: sql`to_char(date_trunc('month', ${performanceProfiles.lastUpdated}), 'YYYY-MM')`.as('month'),
			count: count()
		}).from(performanceProfiles)
			.where(and(
				approved(performanceProfiles),
				inArray(performanceProfiles.groupId, groupsInScope),
				sql`${performanceProfiles.lastUpdated} >= date_trunc('month', now()) - interval '11 months'`
			))
			.groupBy(sql`month`)
			.orderBy(sql`month`),

		db.select({ count: count() }).from(dataRequests)
			.innerJoin(games, eq(dataRequests.gameId, games.id)).where(gameScope),

		db.select({ count: count() }).from(favorites)
			.innerJoin(games, eq(favorites.gameId, games.id)).where(gameScope),

		db.select({
			gameId: dataRequests.gameId,
			name: sql`MIN(${games.names}[1])`.as('name'),
			count: count(dataRequests.gameId)
		}).from(dataRequests)
			.innerJoin(games, eq(dataRequests.gameId, games.id))
			.where(gameScope)
			.groupBy(dataRequests.gameId)
			.orderBy(desc(count(dataRequests.gameId)))
			.limit(5),

		db.select({
			gameId: favorites.gameId,
			name: sql`MIN(${games.names}[1])`.as('name'),
			count: count(favorites.gameId)
		}).from(favorites)
			.innerJoin(games, eq(favorites.gameId, games.id))
			.where(gameScope)
			.groupBy(favorites.gameId)
			.orderBy(desc(count(favorites.gameId)))
			.limit(5),

		db.select({
			id: games.id,
			name: sql`${games.names}[1]`.as('name'),
			publisher: games.publisher,
			regions: games.regions,
			sizeInBytes: games.sizeInBytes
		}).from(games)
			.where(gameScope)
			.orderBy(sql`${games.releaseDate} DESC NULLS LAST`, games.id)
			.limit(50)
	])

	const contributionRows = [
		...perfRows.map(r => ({ groupId: r.groupId, prNumber: r.prNumber, sourcePrUrl: r.sourcePrUrl, contributors: r.contributor ?? [] })),
		...graphicsRows.map(r => ({ groupId: r.groupId, prNumber: r.prNumber, contributors: r.contributor ?? [] })),
		...videoRows.map(r => ({ groupId: r.groupId, prNumber: r.prNumber, contributors: [r.submittedBy] }))
	]
	const people = tallyContributors(contributionRows)

	const groupsWithData = new Set([...perfRows.map(r => r.groupId), ...graphicsRows.map(r => r.groupId)]).size
	const groups = Number(libraryKpis.groups)

	// Fill months that had nothing, so the chart's axis is continuous
	const activityByMonthMap = new Map(activityByMonth.map(m => [String(m.month), Number(m.count)]))
	const now = new Date()
	const activity = Array.from({ length: 12 }, (_, i) => {
		const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (11 - i), 1))
		const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
		return { month, count: activityByMonthMap.get(month) ?? 0 }
	})

	return {
		kpis: {
			titles: Number(libraryKpis.titles),
			groups,
			publishers: Number(libraryKpis.publishers),
			totalSize: Number(libraryKpis.totalSize ?? 0),
			profiles: perfRows.length,
			graphics: graphicsRows.length,
			videos: videoRows.length,
			groupsWithData,
			coverage: groups > 0 ? groupsWithData / groups : 0,
			contributors: people.length,
			contributions: countContributions(contributionRows),
			requests: Number(requestsTotal.count),
			favorites: Number(favoritesTotal.count)
		},
		regions: regionOptions.map(r => ({ code: String(r.code), titles: Number(r.titles) })),
		releasesByYear: releasesByYear.map(r => ({ year: Number(r.year), count: Number(r.count) })),
		topPublishers,
		sizeDistribution: sizeDistribution.map(r => ({ bucket: String(r.bucket), count: Number(r.count) })),
		performance: {
			sampled: latestProfiles.length,
			dockedFps: tallyFps(latestProfiles.map(p => /** @type {string | null} */ (p.dockedFps))),
			handheldFps: tallyFps(latestProfiles.map(p => /** @type {string | null} */ (p.handheldFps))),
			resolutionTypes: [...latestProfiles
				.reduce((acc, p) => {
					const type = /** @type {string | null} */ (p.dockedResolution)
					if (type) acc.set(type, (acc.get(type) ?? 0) + 1)
					return acc
				}, /** @type {Map<string, number>} */ (new Map()))
				.entries()]
				.map(([label, n]) => ({ label, count: n }))
				.sort((a, b) => b.count - a.count)
		},
		activityByMonth: activity,
		topContributors: people.slice(0, 10),
		topRequested,
		topFavorited,
		filteredGames,
		activeFilters: { region, publisher, year: year ? String(year) : null, sizeBucket }
	}
}
