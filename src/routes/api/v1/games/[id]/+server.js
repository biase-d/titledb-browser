import { json, error } from '@sveltejs/kit';
import postgres from 'postgres';
import { POSTGRES_URL } from '$env/static/private';

const sql = postgres(POSTGRES_URL, { ssl: 'require' });

/** @type {import('./$types').RequestHandler} */
export async function GET({ params }) {
    const { id } = params;

    if (!id) {
        throw error(400, 'A game ID is required.');
    }

    try {
        const game = await sql`
        SELECT * FROM games WHERE id = ${id}
        `.then(rows => rows[0]);

        if (!game) {
            throw error(404, `Game with ID ${id} not found.`);
        }

        return json(game);

    } catch (e) {
        if (e.status) throw e;
        console.error('Database query failed:', e);
        throw error(500, 'Failed to retrieve game data from the database.');
    }
}