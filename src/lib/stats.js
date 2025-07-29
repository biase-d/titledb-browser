import { db } from '$lib/db'
import { games } from '$lib/db/schema'
import { and, count, countDistinct, desc, eq, gte, lt, sql } from 'drizzle-orm'

export async function getStats (searchParams) {
  const publisher = searchParams.get('publisher')
  const year = searchParams.get('year')
  const sizeBucket = searchParams.get('sizeBucket')

  const whereConditions = []

  if (publisher) {
    whereConditions.push(eq(games.publisher, publisher))
  }

  if (year) {
    whereConditions.push(sql`CAST(FLOOR("releaseDate" / 10000) AS INTEGER) = ${Number(year)}`)
  }

  if (sizeBucket) {
    const sizeRanges = {
      '<5GB': { max: '5368709120' },
      '5-10GB': { min: '5368709120', max: '10737418240' },
      '10-15GB': { min: '10737418240', max: '16106127360' },
      '15-20GB': { min: '16106127360', max: '21474836480' },
      '>20GB': { min: '21474836480' }
    }
    const range = sizeRanges[sizeBucket]
    if (range) {
      if (range.min) whereConditions.push(gte(games.sizeInBytes, range.min))
      if (range.max) whereConditions.push(lt(games.sizeInBytes, range.max))
    }
  }

  const combinedWheres = and(...whereConditions)

  const kpisQuery = db
    .select({
      total_titles: count(games.id),
      total_publishers: countDistinct(games.publisher)
    })
    .from(games)
    .where(combinedWheres)

  const releasesByYearQuery = db
    .select({
      year: sql`CAST(FLOOR("releaseDate" / 10000) AS INTEGER)`.as('year'),
      count: count(games.id)
    })
    .from(games)
    .where(and(sql`"releaseDate" IS NOT NULL`, combinedWheres))
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

  const sizeDistributionQuery = db
    .select({
      bucket: sql`
        CASE
          WHEN "sizeInBytes" < 5368709120 THEN '<5GB'
          WHEN "sizeInBytes" >= 5368709120 AND "sizeInBytes" < 10737418240 THEN '5-10GB'
          WHEN "sizeInBytes" >= 10737418240 AND "sizeInBytes" < 16106127360 THEN '10-15GB'
          WHEN "sizeInBytes" >= 16106127360 AND "sizeInBytes" < 21474836480 THEN '15-20GB'
          ELSE '>20GB'
        END`.as('bucket'),
      count: count(games.id)
    })
    .from(games)
    .where(and(sql`"sizeInBytes" IS NOT NULL`, combinedWheres))
    .groupBy(sql`
        CASE
        WHEN "sizeInBytes" < 5368709120 THEN '<5GB'
        WHEN "sizeInBytes" >= 5368709120 AND "sizeInBytes" < 10737418240 THEN '5-10GB'
        WHEN "sizeInBytes" >= 10737418240 AND "sizeInBytes" < 16106127360 THEN '10-15GB'
        WHEN "sizeInBytes" >= 16106127360 AND "sizeInBytes" < 21474836480 THEN '15-20GB'
        ELSE '>20GB'
        END`)
    .orderBy(sql`
    CASE (
        CASE
        WHEN "sizeInBytes" < 5368709120 THEN '<5GB'
        WHEN "sizeInBytes" >= 5368709120 AND "sizeInBytes" < 10737418240 THEN '5-10GB'
        WHEN "sizeInBytes" >= 10737418240 AND "sizeInBytes" < 16106127360 THEN '10-15GB'
        WHEN "sizeInBytes" >= 16106127360 AND "sizeInBytes" < 21474836480 THEN '15-20GB'
        ELSE '>20GB'
        END
    )
        WHEN '<5GB' THEN 1
        WHEN '5-10GB' THEN 2
        WHEN '10-15GB' THEN 3
        WHEN '15-20GB' THEN 4
        WHEN '>20GB' THEN 5
    END
    `)

const [kpisResult, releasesByYear, topPublishers, sizeDistribution] = await Promise.all([
    kpisQuery,
    releasesByYearQuery,
    topPublishersQuery,
    sizeDistributionQuery
  ])

  return {
    kpis: kpisResult[0],
    releasesByYear,
    topPublishers,
    sizeDistribution,
    activeFilters: { publisher, year, sizeBucket }
  }
}