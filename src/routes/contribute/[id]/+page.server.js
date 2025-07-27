import { error, redirect } from '@sveltejs/kit'
import { Octokit } from '@octokit/rest'
import { dataRepo } from '$lib/index.js'

/** @type {import('./$types').PageServerLoad} */
export async function load ({ locals, params, parent }) {
  const session = await locals.auth()
  if (!session?.accessToken) {
    throw redirect(302, '/')
  }

  const { id } = params
  const { titleIndex } = await parent()
  const gameNames = titleIndex[id]

  if (!gameNames) {
    throw error(404, 'Game not found in title index')
  }

  const name = gameNames[0]
  let existingData = null
  let existingSha = null

  const octokit = new Octokit({ auth: session.accessToken })
  try {
    const { data } = await octokit.repos.getContent({
      owner: dataRepo.owner,
      repo: dataRepo.repo,
      path: `data/performance/${id}.json`
    })

    if ('content' in data) {
      const content = Buffer.from(data.content, 'base64').toString('utf-8')
      existingData = JSON.parse(content)
      existingSha = data.sha
    }
  } catch (e) {
    if (e.status !== 404) {
      console.error('Failed to fetch existing performance data:', e)
    }
  }

  return {
    id,
    name,
    existingData,
    existingSha
  }
}

/** @type {import('./$types').Actions} */
export const actions = {
  default: async ({ locals, request }) => {
    const session = await locals.auth()
    if (!session?.accessToken) {
      throw error(401, 'Unauthorized')
    }

    const formData = await request.formData()
    const titleId = formData.get('titleId')
    const gameName = formData.get('gameName')
    const performanceData = formData.get('performanceData')
    const sha = formData.get('sha') || null

    if (!titleId || !gameName || !performanceData) {
      throw error(400, 'Missing required form data')
    }

    const { owner, repo } = dataRepo
    const octokit = new Octokit({ auth: session.accessToken })

    try {
      const user = await octokit.users.getAuthenticated()
      const userLogin = user.data.login

      const repoData = await octokit.repos.get({ owner, repo })
      const defaultBranch = repoData.data.default_branch

      const { data: refData } = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${defaultBranch}`
      })
      const latestCommitSha = refData.object.sha

      const newBranchName = `${userLogin}-${titleId}-${Date.now().toString().slice(-5)}`.replace(/[:?*[\]~^]/g, '')
      await octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${newBranchName}`,
        sha: latestCommitSha
      })

      const commitMessage = sha
        ? `feat(perf): Update data for ${gameName} (${titleId})`
        : `feat(perf): Add data for ${gameName} (${titleId})`

      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: `data/performance/${titleId}.json`,
        message: commitMessage,
        content: Buffer.from(JSON.stringify(JSON.parse(performanceData), null, 2)).toString(
          'base64'
        ),
        branch: newBranchName,
        sha
      })

      const prTitle = sha ? `[Update] ${gameName}` : `[Contribution] ${gameName}`

      const { data: prData } = await octokit.pulls.create({
        owner,
        repo,
        title: prTitle,
        head: newBranchName,
        base: defaultBranch,
        body: `Performance data submission for **${gameName}** (${titleId}) by @${userLogin}.`
      })

      return { success: true, prUrl: prData.html_url }
    } catch (e) {
      console.error('[GitHub PR ERROR]', e)
      throw error(500, 'Failed to create Pull Request on GitHub.')
    }
  }
}