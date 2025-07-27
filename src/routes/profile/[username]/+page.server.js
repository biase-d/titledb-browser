import { error } from '@sveltejs/kit'
import { Octokit } from '@octokit/rest'
import { dataRepo } from '$lib/index.js'
import { GITHUB_BOT_TOKEN } from '$env/static/private'

/** @type {import('./$types').PageServerLoad} */
export async function load ({ params, locals }) {
  const { username } = params
  const { owner, repo } = dataRepo

  const octokit = new Octokit({ auth: GITHUB_BOT_TOKEN })

  try {
    const searchQuery = `is:pr repo:${owner}/${repo} author:${username}`

    const { data } = await octokit.search.issuesAndPullRequests({
      q: searchQuery,
      sort: 'created',
      order: 'desc'
    })

    const mergedPullRequests = []
    const pendingPullRequests = []

    for (const pr of data.items) {
      const prData = {
        title: pr.title.replace(/\[(Contribution|Update)\] /g, ''),
        url: pr.html_url,
        number: pr.number,
        createdAt: pr.created_at,
        state: pr.state // 'open' or 'closed'
      }

      if (pr.pull_request?.merged_at) {
        mergedPullRequests.push(prData)
      } else if (pr.state === 'open') {
        pendingPullRequests.push(prData)
      }
    }

    return {
      username,
      mergedPullRequests,
      pendingPullRequests,
      session: await locals.auth()
    }
  } catch (e) {
    console.error(`Failed to fetch contributions for ${username}:`, e)
    throw error(500, 'Could not retrieve user contributions.')
  }
}