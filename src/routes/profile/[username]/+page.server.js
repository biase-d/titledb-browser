import { error } from '@sveltejs/kit';
import postgres from 'postgres';
import { sql } from '$lib/db/postgres'

/** @type {import('./$types').PageServerLoad} */
export async function load({ params, locals }) {
    const { username } = params;
    const session = await locals.auth();

    try {
        const contributions = await sql`
            SELECT id, names, release_date, last_updated
            FROM games 
            WHERE contributor = ${username}
            ORDER BY release_date DESC NULLS LAST;
        `;

        const mergedPullRequests = contributions.map(game => ({
            title: `${game.names[0]}`,
            url: `/title/${game.id}`,
        }));

        return {
            username,
            session,
            mergedPullRequests,
        };

    } catch (e) {
        console.error(`Failed to fetch contributions for ${username}:`, e);
        throw error(500, `Could not retrieve contribution data for ${username}.`);
    }
}