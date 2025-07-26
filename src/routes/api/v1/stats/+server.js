import { json, error } from '@sveltejs/kit';
import postgres from 'postgres';
import { POSTGRES_URL } from '$env/static/private';

const sql = postgres(POSTGRES_URL, { ssl: 'require' });

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
    const { searchParams } = url;

    const publisher = searchParams.get('publisher') || null;
    const year = parseInt(searchParams.get('year'), 10) || null;
    const sizeBucketParam = searchParams.get('sizeBucket') || null;

    try {
        const whereClauses = [];
        const params = [];
        let paramIndex = 1;

        if (publisher) {
            whereClauses.push(`publisher = $${paramIndex++}`);
            params.push(publisher);
        }
        if (year) {
            whereClauses.push(`release_date >= $${paramIndex++} AND release_date <= $${paramIndex++}`);
            params.push(year * 10000, year * 10000 + 1231);
        }
        if (sizeBucketParam) {
            const GIGABYTE = 1024 ** 3;
            const sizeRanges = {
                '<5GB': `size_in_bytes < ${5 * GIGABYTE}`,
                '5-10GB': `size_in_bytes >= ${5 * GIGABYTE} AND size_in_bytes < ${10 * GIGABYTE}`,
                '10-15GB': `size_in_bytes >= ${10 * GIGABYTE} AND size_in_bytes < ${15 * GIGABYTE}`,
                '15-20GB': `size_in_bytes >= ${15 * GIGABYTE} AND size_in_bytes < ${20 * GIGABYTE}`,
                '>20GB': `size_in_bytes >= ${20 * GIGABYTE}`
            };
            if (sizeRanges[sizeBucketParam]) {
                whereClauses.push(sizeRanges[sizeBucketParam]);
            }
        }

        const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const [
            kpiData,
            releasesByYear,
            topPublishers,
            sizeDistribution
        ] = await Promise.all([
            sql.unsafe(`SELECT COUNT(*) AS total_titles, COUNT(DISTINCT publisher) AS total_publishers FROM games ${whereClause}`, params),
                              sql.unsafe(`SELECT (release_date / 10000)::int AS year, COUNT(*) AS count FROM games WHERE release_date IS NOT NULL ${whereClauses.length > 0 ? 'AND' : ''} ${whereClauses.join(' AND ')} GROUP BY year ORDER BY year ASC`, params),
                              sql.unsafe(`SELECT publisher, COUNT(*) as count FROM games WHERE publisher IS NOT NULL ${whereClauses.length > 0 ? 'AND' : ''} ${whereClauses.join(' AND ')} GROUP BY publisher ORDER BY count DESC LIMIT 10`, params),
                              sql.unsafe(`
                              SELECT
                              CASE
                              WHEN size_in_bytes < ${5 * 1024**3} THEN '<5GB'
                              WHEN size_in_bytes >= ${5 * 1024**3} AND size_in_bytes < ${10 * 1024**3} THEN '5-10GB'
                              WHEN size_in_bytes >= ${10 * 1024**3} AND size_in_bytes < ${15 * 1024**3} THEN '10-15GB'
                              WHEN size_in_bytes >= ${15 * 1024**3} AND size_in_bytes < ${20 * 1024**3} THEN '15-20GB'
                              ELSE '>20GB'
                              END AS bucket,
                              COUNT(*) AS count
                              FROM games
                              WHERE size_in_bytes IS NOT NULL ${whereClauses.length > 0 ? 'AND' : ''} ${whereClauses.join(' AND ')}
                              GROUP BY bucket
                              ORDER BY MIN(size_in_bytes);
                              `, params)
        ]);

        return json({
            kpis: kpiData[0],
            releasesByYear,
            topPublishers,
            sizeDistribution,
            activeFilters: { publisher, year, sizeBucket: sizeBucketParam }
        });

    } catch (e) {
        console.error('API Stats Error:', e);
        throw error(500, 'Failed to generate statistics.');
    }
}