import { error } from '@sveltejs/kit';
import { Octokit } from '@octokit/rest';
import { dataRepo as DATA_REPO } from '$lib/index.js'
import { GITHUB_BOT_TOKEN } from '$env/static/private';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
    const { username } = params;

    if (!GITHUB_BOT_TOKEN) {
        console.error("GITHUB_BOT_TOKEN is not configured.");
        throw error(500, "Server is not configured for this feature.");
    }

    const octokit = new Octokit({ auth: GITHUB_BOT_TOKEN });

    const searchQuery = `is:pr is:merged author:${username} repo:${DATA_REPO}`;

    try {
        const { data } = await octokit.search.issuesAndPullRequests({
            q: searchQuery,
            sort: 'updated',
            order: 'desc'
        });

        const pullRequests = data.items.map(pr => ({
            title: pr.title,
            url: pr.html_url,
            number: pr.number,
            createdAt: pr.created_at
        }));

        return {
            username,
            pullRequests
        };

    } catch (e) {
        console.error(`Failed to fetch contributions for ${username}:`, e);
        throw error(500, `Could not retrieve contribution data for ${username}.`);
    }
}