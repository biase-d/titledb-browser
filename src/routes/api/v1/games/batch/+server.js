import { json, error } from '@sveltejs/kit';
import { sql } from '$lib/db/postgres'

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
    try {
        const { ids } = await request.json();

        if (!Array.isArray(ids) || ids.length === 0) {
            return json([]);
        }

        const games = await sql`
            SELECT id, names, icon_url FROM games WHERE id IN ${sql(ids)}
        `;

        return json(games);

    } catch (e) {
        console.error('API Batch Error:', e);
        throw error(500, 'Failed to fetch batch game data.');
    }
}