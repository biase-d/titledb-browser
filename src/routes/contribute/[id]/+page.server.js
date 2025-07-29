import { error, redirect } from '@sveltejs/kit'
import { db } from '$lib/db'
import { games, performanceProfiles } from '$lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { GITHUB_BOT_TOKEN } from '$env/static/private'
import { Octokit } from '@octokit/rest'

const octokit = new Octokit({ auth: GITHUB_BOT_TOKEN })

const REPO_OWNER = 'biase-d'
const REPO_NAME = 'nx-performance'
const REPO_PATH = 'profiles'

export const load = async ({ params, parent }) => {
  const { session } = await parent()
  if (!session?.user) {
    throw redirect(302, '/')
  }

  const { id } = params
  if (!id) {
    throw error(400, 'Game ID is required')
  }

  console.log(session)

  const result = await db
    .select({
      name: sql`"names"[1]`,
      groupId: games.groupId,
      existingData: performanceProfiles.profiles
    })
    .from(games)
    .leftJoin(performanceProfiles, eq(games.groupId, performanceProfiles.groupId))
    .where(eq(games.id, id))
    .limit(1)

  const game = result[0]

  if (!game) {
    throw error(404, 'Game not found')
  }

  const allTitlesInGroup = await db.select({
    id: games.id,
    name: sql`"names"[1]`
  }).from(games).where(eq(games.groupId, game.groupId))

  let existingSha = null
  try {
    const { data: file } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: `${REPO_PATH}/${game.groupId}.json`
    })
    if (file && 'sha' in file) {
      existingSha = file.sha
    }
  } catch (e) {
    // A 404 is expected if the file doesn't exist, so we can ignore it.
    if (e.status !== 404) {
      console.error('GitHub API error getting file SHA:', e)
      throw error(500, 'Could not communicate with GitHub to check for existing data.')
    }
  }

  return {
    id,
    name: game.name,
    allTitlesInGroup,
    existingData: game.existingData,
    existingSha
  }
}

export const actions = {
  default: async ({ request, locals }) => {
    const session = await locals.auth()
    const user = session?.user

    if (!user?.login || !user?.id) {
      return { error: 'Authentication error. Please sign out and sign back in.', success: false }
    }

    const coAuthorName = user.name || user.login
    const coAuthorEmail = `${user.id}+${user.login}@users.noreply.github.com`

    const formData = await request.formData()
    const titleId = formData.get('titleId')?.toString()
    const gameName = formData.get('gameName')?.toString()
    const performanceDataString = formData.get('performanceData')?.toString()
    const sha = formData.get('sha')?.toString() || null
    const updatedGroupDataString = formData.get('updatedGroupData')?.toString()
    const originalGroupDataString = formData.get('originalGroupData')?.toString()

    if (!titleId || !gameName || !performanceDataString || !updatedGroupDataString || !originalGroupDataString) {
      return { error: 'Missing required form data.', success: false }
    }

    const gameResult = await db.select({ groupId: games.groupId }).from(games).where(eq(games.id, titleId)).limit(1)
    const groupId = gameResult[0]?.groupId
    if (!groupId) {
      return { error: `Could not find a group ID for game ${titleId}`, success: false }
    }

    const updatedGroup = JSON.parse(updatedGroupDataString)
    const originalGroup = JSON.parse(originalGroupDataString)
    const updatedIds = new Set(updatedGroup.map(t => t.id))
    const originalIds = new Set(originalGroup.map(t => t.id))
    const hasGroupChanged = updatedIds.size !== originalIds.size || [...updatedIds].some(id => !originalIds.has(id))

    let prBody = `Performance data contribution for **${gameName}** (${titleId}) by @${session.user.login}.`

    const performanceContent = Buffer.from(JSON.stringify(JSON.parse(performanceDataString), null, 2)).toString('base64')
    const branchName = `contrib/${session.user.name.toLowerCase().replace(/[^a-z0-9-]/g, '')}-${groupId}`
    const performanceFilePath = `${REPO_PATH}/${groupId}.json`
    const commitMessage = `feat: ${sha ? 'update' : 'add'} performance data for ${gameName} (${titleId})`
    const prTitle = `[Contribution] ${gameName}`

    try {
      const { data: mainRef } = await octokit.git.getRef({ owner: REPO_OWNER, repo: REPO_NAME, ref: 'heads/main' })

      try {
        await octokit.git.createRef({ owner: REPO_OWNER, repo: REPO_NAME, ref: `refs/heads/${branchName}`, sha: mainRef.object.sha })
      } catch (e) {
        if (e.status !== 422) throw e // Ignore if branch already exists
      }

      const fileCommits = [{
        path: performanceFilePath,
        message: `${commitMessage}\n\nCo-authored-by: ${session.user.name} <${session.user.email}>`,
        content: performanceContent,
        sha
      }]

      if (hasGroupChanged) {
        const groupContent = Buffer.from(JSON.stringify(updatedGroup.map(t => t.id), null, 2)).toString('base64')
        const groupFilePath = `groups/${groupId}.json`
        const groupCommitMessage = `feat: update grouping for ${gameName} (${groupId})`

        fileCommits.push({
          path: groupFilePath,
          message: `${groupCommitMessage}\n\nCo-authored-by: ${coAuthorName} <${coAuthorEmail}>`,
          content: groupContent
        })
        prBody += `\n\nThis PR also includes grouping changes for the associated titles.`
      }

      for (const file of fileCommits) {
        await octokit.repos.createOrUpdateFileContents({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          path: file.path,
          message: file.message,
          content: file.content,
          branch: branchName,
          sha: file.sha || null
        })
      }

      const { data: pullRequest } = await octokit.pulls.create({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        title: prTitle,
        head: branchName,
        base: 'main',
        body: prBody,
        maintainer_can_modify: true
      })

      return { success: true, prUrl: pullRequest.html_url }
    } catch (e) {
      console.error('GitHub action failed:', e)
      // Attempt to clean up the branch if PR creation failed
      try {
        await octokit.git.deleteRef({ owner: REPO_OWNER, repo: REPO_NAME, ref: `heads/${branchName}` })
      } catch (cleanupError) { /* ignore */ }
      return { error: e.message || 'An unknown error occurred while creating the pull request on GitHub.', success: false }
    }
  }
}
