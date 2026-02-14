import { db } from '$lib/db';
import { games, performanceProfiles } from '$lib/db/schema';
import { count, sum, desc, asc, notNull, sql, eq } from 'drizzle-orm';

export async function getStats(searchParams) {
    const filters = {
        publisher: searchParams.get('publisher'),
        year: searchParams.get('year') ? parseInt(searchParams.get('year')) : null,
        minSizeMB: searchParams.get('minSizeMB') ? parseInt(searchParams.get('minSizeMB')) : null,
        maxSizeMB: searchParams.get('maxSizeMB') ? parseInt(searchParams.get('maxSizeMB')) : null,
    };

    // --- Base Aggregations ---
    const [totalTitles] = await db.select({ count: count() }).from(games);
    const [totalSize] = await db.select({ sum: sum(games.sizeInBytes) }).from(games);
    const [uniquePublishers] = await db.select({ count: count(games.publisher, { distinct: true }) }).from(games);

    // --- Fun Stats (The Extremes) ---
    const [heaviestGame] = await db.select()
        .from(games)
        .orderBy(desc(games.sizeInBytes))
        .limit(1);

    const [lightestGame] = await db.select()
        .from(games)
        .where(notNull(games.sizeInBytes))
        .orderBy(asc(games.sizeInBytes))
        .limit(1);

    const [oldestGame] = await db.select()
        .from(games)
        .where(notNull(games.releaseDate))
        .orderBy(asc(games.releaseDate))
        .limit(1);

    // --- Charts Data ---

    // 1. Releases by Year
    const releasesByYear = await db.select({
        year: games.releaseDate,
        count: count()
    })
        .from(games)
        .where(notNull(games.releaseDate))
        .groupBy(games.releaseDate)
        .orderBy(asc(games.releaseDate));

    // 2. Top Publishers
    const topPublishers = await db.select({
        publisher: games.publisher,
        count: count()
    })
        .from(games)
        .where(notNull(games.publisher))
        .groupBy(games.publisher)
        .orderBy(desc(count()))
        .limit(10);

    // 3. Size Distribution (Bucket logic in SQL)
    // 0-1GB, 1-5GB, 5-10GB, 10-20GB, 20GB+
    const sizeDistribution = await db.select({
        bucket: sql`
            CASE 
                WHEN ${games.sizeInBytes} < 1073741824 THEN '< 1GB'
                WHEN ${games.sizeInBytes} < 5368709120 THEN '1-5GB'
                WHEN ${games.sizeInBytes} < 10737418240 THEN '5-10GB'
                WHEN ${games.sizeInBytes} < 21474836480 THEN '10-20GB'
                ELSE '> 20GB'
            END
        `,
        count: count()
    })
        .from(games)
        .where(notNull(games.sizeInBytes))
        .groupBy(sql`1`) // Group by the CASE statement (column 1)
        .orderBy(sql`MIN(${games.sizeInBytes})`); // Order by size approximately

    return {
        kpis: {
            total_titles: totalTitles.count,
            total_size_bytes: totalSize.sum,
            total_publishers: uniqueIndex.count, // Error: previously defined as uniquePublishers
            unique_publishers: uniquePublishers.count
        },
        extremes: {
            heaviest: heaviestGame,
            lightest: lightestGame,
            oldest: oldestGame
        },
        releasesByYear,
        topPublishers,
        sizeDistribution,
        activeFilters: filters
    };
}
