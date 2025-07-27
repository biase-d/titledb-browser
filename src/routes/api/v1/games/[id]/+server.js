import { json, error } from '@sveltejs/kit';
import postgres from 'postgres';
import { Octokit } from '@octokit/rest';
import { POSTGRES_URL, GITHUB_BOT_TOKEN } from '$env/static/private';
import { dataRepo } from '$lib/index.js';

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

    if (game.performance) {
        try {
            const octokit = new Octokit({ auth: GITHUB_BOT_TOKEN });
            const commitsRes = await octokit.repos.listCommits({
                owner: dataRepo.owner,
                repo: dataRepo.repo,
                path: `data/${id}.json`,
                per_page: 1
            });

            if (commitsRes.data.length > 0) {
                game.performance.contributor = { 
                    name: commitsRes.data[0].author?.login,
                    avatar: commitsRes.data[0].author?.avatar_url
                };
            }
        } catch (gitHubError) {
            console.error(`Could not fetch contributor for ${id}:`, gitHubError);
        }
    }

    return json(game);

} catch (e) {
    if (e.status) throw e;
        console.error('Database query failed:', e);
        throw error(500, 'Failed to retrieve game data from the database.');
    }
}