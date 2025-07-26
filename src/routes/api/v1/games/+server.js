import { json, error } from '@sveltejs/kit';
import postgres from 'postgres';
import { POSTGRES_URL } from '$env/static/private';

const sql = postgres(POSTGRES_URL, { ssl: 'require' });

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
    const { searchParams } = url;

    const query = searchParams.get('q')?.trim() || '';
    const publisher = searchParams.get('publisher') || null;
    const minYear = parseInt(searchParams.get('minYear'), 10) || null;
    const maxYear = parseInt(searchParams.get('maxYear'), 10) || null;
    const minSize = parseFloat(searchParams.get('minSizeMB')) * 1024 * 1024 || null;
    const maxSize = parseFloat(searchParams.get('maxSizeMB')) * 1024 * 1024 || null;
    const sort = searchParams.get('sort') || 'date-desc';
    const page = parseInt(searchParams.get('page'), 10) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    try {
        const whereClauses = [];
        const params = [];
        let paramIndex = 1;
        const isFiltering = !!(publisher || minYear || maxYear || minSize || maxSize);

        if (!query && !isFiltering) whereClauses.push('performance IS NOT NULL');
        if (query) {
            const formattedQuery = query.split(/\s+/).filter(Boolean).join(' & ');
            whereClauses.push(`(to_tsvector('simple', array_to_string(names, ' ')) @@ to_tsquery('simple', $${paramIndex++}) OR id ILIKE $${paramIndex++})`);
            params.push(formattedQuery, `%${query}%`);
        }
        if (publisher) { whereClauses.push(`publisher = $${paramIndex++}`); params.push(publisher); }
        if (minYear) { whereClauses.push(`release_date >= $${paramIndex++}`); params.push(minYear * 10000); }
        if (maxYear) { whereClauses.push(`release_date <= $${paramIndex++}`); params.push(maxYear * 10000 + 1231); }
        if (minSize) { whereClauses.push(`size_in_bytes >= $${paramIndex++}`); params.push(minSize); }
        if (maxSize) { whereClauses.push(`size_in_bytes <= $${paramIndex++}`); params.push(maxSize); }

        const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const countQuery = `SELECT COUNT(*) FROM games ${whereClause}`;
        const countPromise = sql.unsafe(countQuery, params);

        const sortOptions = {
            'name-asc': 'ORDER BY names[1] ASC',
            'size-desc': 'ORDER BY size_in_bytes DESC NULLS LAST',
            'date-desc': 'ORDER BY release_date DESC NULLS LAST'
        };
        const orderClause = sortOptions[sort] || sortOptions['date-desc'];
        const dataQuery = `SELECT id, names, icon_url FROM games ${whereClause} ${orderClause} LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        const dataPromise = sql.unsafe(dataQuery, [...params, limit, offset]);

        const publishersPromise = sql`SELECT DISTINCT publisher FROM games WHERE publisher IS NOT NULL ORDER BY publisher ASC;`;
        const yearsPromise = sql`SELECT DISTINCT (release_date / 10000)::int AS year FROM games WHERE release_date IS NOT NULL ORDER BY year DESC;`;

        const [countResult, results, publishers, years] = await Promise.all([countPromise, dataPromise, publishersPromise, yearsPromise]);

        const totalItems = parseInt(countResult[0].count, 10);
        const totalPages = Math.ceil(totalItems / limit);

        return json({
            results,
            meta: {
                publishers: publishers.map(p => p.publisher),
                    years: years.map(y => y.year)
            },
            pagination: {
                currentPage: page,
                totalPages,
                totalItems
            }
        });

    } catch (e) {
        console.error('API Search Error:', e);
        throw error(500, 'Failed to search for games.');
    }
}