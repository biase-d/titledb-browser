/**
 * @file Statistics Repository
 * @description Pure functions for aggregating game statistics
 * Migrated from $lib/getStats.js
 */

import { games } from '$lib/db/schema';
import { and, count, countDistinct, desc, eq, gte, lt, sql } from 'drizzle-orm';

/**
 * Get comprehensive database statistics
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {URLSearchParams} searchParams - Filter parameters
 * @returns {Promise<Object>}
 */
export async function getStats(db, searchParams) {
    const publisher = searchParams.get('publisher');
    const year = searchParams.get('year');
    const sizeBucket = searchParams.get('sizeBucket');

    const whereConditions = [];

    if (publisher) {
        whereConditions.push(eq(games.publisher, publisher));
    }

    if (year) {
        whereConditions.push(sql`CAST(FLOOR("release_date" / 10000) AS INTEGER) = ${Number(year)}`);
    }

    if (sizeBucket) {
        const sizeRanges = {
            '<5GB': { max: '5368709120' },
            '5-10GB': { min: '5368709120', max: '10737418240' },
            '10-15GB': { min: '10737418240', max: '16106127360' },
            '15-20GB': { min: '16106127360', max: '21474836480' },
            '>20GB': { min: '21474836480' }
        };
        const range = sizeRanges[sizeBucket];
        if (range) {
            if (range.min) whereConditions.push(gte(games.sizeInBytes, range.min)); // Start using camelCase column names from schema
            if (range.max) whereConditions.push(lt(games.sizeInBytes, range.max));
        }
    }

    const combinedWheres = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Use sql template for complex count queries that might be specific to Postgres
    // but try to keep it standard SQL where possible
    const kpisQuery = db
        .select({
            total_titles: count(games.id),
            total_publishers: countDistinct(games.publisher)
        })
        .from(games)
        .where(combinedWheres);

    const releasesByYearQuery = db
        .select({
            year: sql`CAST(FLOOR("release_date" / 10000) AS INTEGER)`.as('year'),
            count: count(games.id)
        })
        .from(games)
        .where(and(sql`"release_date" IS NOT NULL`, combinedWheres))
        .groupBy(sql`year`)
        .orderBy(sql`year`);

    const topPublishersQuery = db
        .select({
            publisher: games.publisher,
            count: count(games.id)
        })
        .from(games)
        .where(and(sql`"publisher" IS NOT NULL`, combinedWheres))
        .groupBy(games.publisher)
        .orderBy(desc(count(games.id)))
        .limit(10);

    // Note: CASE statements are widely supported
    const sizeBucketCase = sql`
        CASE
            WHEN "size_in_bytes" < 5368709120 THEN '<5GB'
            WHEN "size_in_bytes" >= 5368709120 AND "size_in_bytes" < 10737418240 THEN '5-10GB'
            WHEN "size_in_bytes" >= 10737418240 AND "size_in_bytes" < 16106127360 THEN '10-15GB'
            WHEN "size_in_bytes" >= 16106127360 AND "size_in_bytes" < 21474836480 THEN '15-20GB'
            ELSE '>20GB'
        END`;

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
                WHEN '<5GB' THEN 1
                WHEN '5-10GB' THEN 2
                WHEN '10-15GB' THEN 3
                WHEN '15-20GB' THEN 4
                WHEN '>20GB' THEN 5
            END
        `);

    const [kpisResult, releasesByYear, topPublishers, sizeDistribution] = await Promise.all([
        kpisQuery,
        releasesByYearQuery,
        topPublishersQuery,
        sizeDistributionQuery
    ]);

    return {
        kpis: kpisResult[0],
        releasesByYear,
        topPublishers,
        sizeDistribution,
        activeFilters: { publisher, year, sizeBucket }
    };
}
