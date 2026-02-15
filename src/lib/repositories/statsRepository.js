import { games, performanceProfiles, graphicsSettings, youtubeLinks, gameGroups, dataRequests, favorites } from '$lib/db/schema'
import { and, count, countDistinct, desc, eq, gte, lt, sql, sum } from 'drizzle-orm'

/**
 * Get comprehensive database statistics
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {URLSearchParams} searchParams - Filter parameters
 * @returns {Promise<Object>}
 */
export async function getStats(db, searchParams) {
	const publisher = searchParams.get('publisher')
	const year = searchParams.get('year')
	const sizeBucket = searchParams.get('sizeBucket')

	const whereConditions = []

	if (publisher) {
		whereConditions.push(eq(games.publisher, publisher))
	}

	if (year) {
		whereConditions.push(sql`CAST(FLOOR("release_date" / 10000) AS INTEGER) = ${Number(year)}`)
	}

	if (sizeBucket) {
		const sizeRanges = {
			'<500MB': { max: '524288000' },
			'500MB-1GB': { min: '524288000', max: '1073741824' },
			'1-2GB': { min: '1073741824', max: '2147483648' },
			'2-3GB': { min: '2147483648', max: '3221225472' },
			'3-4GB': { min: '3221225472', max: '4294967296' },
			'4-5GB': { min: '4294967296', max: '5368709120' },
			'5-10GB': { min: '5368709120', max: '10737418240' },
			'10-15GB': { min: '10737418240', max: '16106127360' },
			'15-20GB': { min: '16106127360', max: '21474836480' },
			'>20GB': { min: '21474836480' }
		}
		const range = (/** @type {any} */ (sizeRanges))[sizeBucket]
		if (range) {
			if (range.min) whereConditions.push(gte(games.sizeInBytes, range.min))
			if (range.max) whereConditions.push(lt(games.sizeInBytes, range.max))
		}
	}

	// Always exclude titles with 0 size (likely placeholders or data entry errors)
	whereConditions.push(gte(games.sizeInBytes, 1))

	const combinedWheres = whereConditions.length > 0 ? and(...whereConditions) : undefined

	// KPI queries
	const basicKpisQuery = db
		.select({
			total_titles: count(games.id),
			total_publishers: countDistinct(games.publisher),
			total_size: sum(games.sizeInBytes)
		})
		.from(games)
		.where(combinedWheres)

	const yearExpr = sql`CAST(FLOOR("release_date" / 10000) AS INTEGER)`
	const releasesByYearQuery = db
		.select({
			year: yearExpr.as('year'),
			count: count(games.id)
		})
		.from(games)
		.where(
			and(
				sql`"release_date" IS NOT NULL`,
				combinedWheres,
				gte(yearExpr, 1990),
				lt(yearExpr, 2027)
			)
		)
		.groupBy(sql`year`)
		.orderBy(sql`year`)

	const topPublishersQuery = db
		.select({
			publisher: games.publisher,
			count: count(games.id)
		})
		.from(games)
		.where(and(sql`"publisher" IS NOT NULL`, combinedWheres))
		.groupBy(games.publisher)
		.orderBy(desc(count(games.id)))
		.limit(10)

	const sizeBucketCase = sql`
        CASE
            WHEN "size_in_bytes" < 524288000 THEN '<500MB'
            WHEN "size_in_bytes" >= 524288000 AND "size_in_bytes" < 1073741824 THEN '500MB-1GB'
            WHEN "size_in_bytes" >= 1073741824 AND "size_in_bytes" < 2147483648 THEN '1-2GB'
            WHEN "size_in_bytes" >= 2147483648 AND "size_in_bytes" < 3221225472 THEN '2-3GB'
            WHEN "size_in_bytes" >= 3221225472 AND "size_in_bytes" < 4294967296 THEN '3-4GB'
            WHEN "size_in_bytes" >= 4294967296 AND "size_in_bytes" < 5368709120 THEN '4-5GB'
            WHEN "size_in_bytes" >= 5368709120 AND "size_in_bytes" < 10737418240 THEN '5-10GB'
            WHEN "size_in_bytes" >= 10737418240 AND "size_in_bytes" < 16106127360 THEN '10-15GB'
            WHEN "size_in_bytes" >= 16106127360 AND "size_in_bytes" < 21474836480 THEN '15-20GB'
            ELSE '>20GB'
        END`

	const sizeDistributionQuery = db
		.select({
			bucket: sizeBucketCase.as('bucket'),
			count: count(games.id)
		})
		.from(games)
		.where(and(sql`"size_in_bytes" IS NOT NULL`, combinedWheres))
		.groupBy(sizeBucketCase)
		.orderBy(sql`
            CASE (${sizeBucketCase})
                WHEN '<500MB' THEN 1
                WHEN '500MB-1GB' THEN 2
                WHEN '1-2GB' THEN 3
                WHEN '2-3GB' THEN 4
                WHEN '3-4GB' THEN 5
                WHEN '4-5GB' THEN 6
                WHEN '5-10GB' THEN 7
                WHEN '10-15GB' THEN 8
                WHEN '15-20GB' THEN 9
                WHEN '>20GB' THEN 10
            END
        `)

	// Top Requested Games
	const topRequestedQuery = db
		.select({
			gameId: dataRequests.gameId,
			name: sql`MIN(${games.names}[1])`.as('name'),
			count: count(dataRequests.gameId)
		})
		.from(dataRequests)
		.innerJoin(games, eq(dataRequests.gameId, games.id))
		.groupBy(dataRequests.gameId)
		.orderBy(desc(count(dataRequests.gameId)))
		.limit(5)

	// Top Favorited Games
	const topFavoritedQuery = db
		.select({
			gameId: favorites.gameId,
			name: sql`MIN(${games.names}[1])`.as('name'),
			count: count(favorites.gameId)
		})
		.from(favorites)
		.innerJoin(games, eq(favorites.gameId, games.id))
		.groupBy(favorites.gameId)
		.orderBy(desc(count(favorites.gameId)))
		.limit(5)

	// Total unique contributors across all tables
	const totalContributorsQuery = db.select({
		count: sql`COUNT(DISTINCT contributor_name)`.as('count')
	}).from(sql`(
        SELECT unnest(contributor) as contributor_name FROM ${performanceProfiles}
        UNION
        SELECT unnest(contributor) as contributor_name FROM ${graphicsSettings}
        UNION
        SELECT submitted_by as contributor_name FROM ${youtubeLinks}
    ) as subquery`).where(sql`contributor_name IS NOT NULL AND contributor_name != ''`)

	const [
		basicKpis,
		releasesByYear,
		topPublishers,
		sizeDistribution,
		totalPerf,
		totalGraphics,
		totalYoutube,
		totalGroups,
		totalRequests,
		totalFavorites,
		topRequested,
		topFavorited,
		contributorsResult
	] = await Promise.all([
		basicKpisQuery,
		releasesByYearQuery,
		topPublishersQuery,
		sizeDistributionQuery,
		db.select({ count: count() }).from(performanceProfiles).then((/** @type {any} */ r) => r[0].count),
		db.select({ count: count() }).from(graphicsSettings).then((/** @type {any} */ r) => r[0].count),
		db.select({ count: count() }).from(youtubeLinks).then((/** @type {any} */ r) => r[0].count),
		db.select({ count: count() }).from(gameGroups).then((/** @type {any} */ r) => r[0].count),
		db.select({ count: count() }).from(dataRequests).then((/** @type {any} */ r) => r[0].count),
		db.select({ count: count() }).from(favorites).then((/** @type {any} */ r) => r[0].count),
		topRequestedQuery,
		topFavoritedQuery,
		totalContributorsQuery.then((/** @type {any} */ r) => r[0])
	])

	return {
		kpis: {
			...basicKpis[0],
			total_performance: totalPerf,
			total_graphics: totalGraphics,
			total_youtube: totalYoutube,
			total_groups: totalGroups,
			total_requests: totalRequests,
			total_favorites: totalFavorites,
			total_contributors: Number(contributorsResult?.count || 0)
		},
		releasesByYear,
		topPublishers,
		sizeDistribution,
		topRequested,
		topFavorited,
		activeFilters: { publisher, year, sizeBucket }
	}
}
