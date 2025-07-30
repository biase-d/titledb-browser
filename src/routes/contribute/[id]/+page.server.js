import { error, redirect } from '@sveltejs/kit'
import { db } from '$lib/db'
import { games, graphics_settings, performance_profiles, youtube_links } from '$lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { GITHUB_BOT_TOKEN } from '$env/static/private'
import { Octokit } from '@octokit/rest'

const octokit = new Octokit({ auth: GITHUB_BOT_TOKEN })

const REPO_OWNER = 'biase-d'
const REPO_NAME = 'nx-performance'
const REPO_PATH = 'profiles'
const REPO_BRANCH = 'v2'

export const load = async ({ params, parent }) => {
  const { session } = await parent()
  if (!session?.user) {
    throw redirect(302, '/')
  }

  const { id } = params
  if (!id) {
    throw error(400, 'Game ID is required')
  }

  const result = await db
    .select({
      name: sql`"names"[1]`,
      groupId: games.group_id,
      existingPerformance: performance_profiles.profiles,
      existingGraphics: graphics_settings.settings
    })
    .from(games)
    .leftJoin(performance_profiles, eq(games.group_id, performance_profiles.group_id))
    .leftJoin(graphics_settings, eq(games.group_id, graphics_settings.group_id))
    .where(eq(games.id, id))
    .limit(1)

  const game = result[0]

  if (!game) {
    throw error(404, 'Game not found')
  }

  const [allTitlesInGroup, existingYoutubeLinks] = await Promise.all([
    db.select({
      id: games.id,
      name: sql`"names"[1]`
    }).from(games).where(eq(games.group_id, game.groupId)),
    db.select({ url: youtube_links.url }).from(youtube_links).where(eq(youtube_links.group_id, game.groupId))
  ])

  const shas = {
    performance: null,
    graphics: null,
    videos: null,
    groups: null
  }

  const fileTypes = ['performance', 'graphics', 'videos', 'groups']
  const filePaths = {
    performance: `profiles/${game.groupId}.json`,
    graphics: `graphics/${game.groupId}.json`,
    videos: `videos/${game.groupId}.json`,
    groups: `groups/${game.groupId}.json`
  }

  await Promise.all(fileTypes.map(async (type) => {
    try {
      const { data: file } = await octokit.repos.getContent({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: filePaths[type]
      })
      if (file && 'sha' in file) {
        shas[type] = file.sha
      }
    } catch (e) {
      if (e.status !== 404) {
        console.error(`GitHub API error getting SHA for ${type}:`, e)
        throw error(500, `Could not get SHA for ${type} data.`)
      }
    }
  }))

  return {
    id,
    name: game.name,
    allTitlesInGroup,
    existingData: game.existingPerformance,
    existingGraphics: game.existingGraphics,
    existingYoutubeLinks: existingYoutubeLinks.map(l => l.url),
    shas
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
    const graphicsDataString = formData.get('graphicsData')?.toString()
    const youtubeLinksString = formData.get('youtubeLinks')?.toString()
    const shasString = formData.get('shas')?.toString()
    const shas = shasString ? JSON.parse(shasString) : {}
    const updatedGroupDataString = formData.get('updatedGroupData')?.toString()
    const originalGroupDataString = formData.get('originalGroupData')?.toString()

    if (!titleId || !gameName || !performanceDataString || !graphicsDataString || !youtubeLinksString || !updatedGroupDataString || !originalGroupDataString) {
      return { error: 'Missing required form data.', success: false }
    }

    const gameResult = await db.select({ groupId: games.group_id }).from(games).where(eq(games.id, titleId)).limit(1)
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
    const timestamp = Date.now();
    const branchName = `contrib/${coAuthorName.toLowerCase().replace(/[^a-z0-9-]/g, '')}-${groupId}-${timestamp}`
    const performanceFilePath = `${REPO_PATH}/${groupId}.json`
    const commitMessage = `feat: ${shas.performance ? 'update' : 'add'} performance data for ${gameName} (${titleId})`
    const prTitle = `[Contribution] ${gameName}`

    try {
      const { data: mainRef } = await octokit.git.getRef({ owner: REPO_OWNER, repo: REPO_NAME, ref: `heads/${REPO_BRANCH}` })

      try {
        await octokit.git.createRef({ owner: REPO_OWNER, repo: REPO_NAME, ref: `refs/heads/${branchName}`, sha: mainRef.object.sha })
      } catch (e) {
        if (e.status !== 422) throw e // Ignore if branch already exists
      }

      const fileCommits = [{
        path: performanceFilePath,
        message: `${commitMessage}\n\nCo-authored-by: ${coAuthorName} <${coAuthorEmail}>`,
        content: performanceContent,
        sha: shas.performance
      }]

      const graphicsData = JSON.parse(graphicsDataString);
      const hasGraphicsData = Object.values(graphicsData).some(section => Object.keys(section).length > 0 && (Object.keys(section)[0] !== '' || Object.values(section)[0] !== ''));

      if (hasGraphicsData) {
        const graphicsContent = Buffer.from(JSON.stringify(graphicsData, null, 2)).toString('base64');
        const graphicsFilePath = `graphics/${groupId}.json`;
        const graphicsCommitMessage = `feat: add/update graphics settings for ${gameName} (${groupId})`;

        fileCommits.push({
          path: graphicsFilePath,
          message: graphicsCommitMessage,
          content: graphicsContent,
          sha: shas.graphics
        });
        prBody += `\n\nThis PR also includes graphics settings.`;
      }

      const youtubeLinks = JSON.parse(youtubeLinksString)
      if (Array.isArray(youtubeLinks) && youtubeLinks.length > 0) {
        const linksContent = Buffer.from(JSON.stringify(youtubeLinks.filter(Boolean), null, 2)).toString('base64')
        const linksFilePath = `videos/${groupId}.json`
        const linksCommitMessage = `feat: add/update YouTube links for ${gameName} (${groupId})`

        fileCommits.push({
          path: linksFilePath,
          message: `${linksCommitMessage}\n\nCo-authored-by: ${coAuthorName} <${coAuthorEmail}>`,
          content: linksContent,
          sha: shas.videos
        })
        prBody += `\n\nThis PR also includes YouTube links.`
      }

      if (hasGroupChanged) {
        const groupContent = Buffer.from(JSON.stringify(updatedGroup.map(t => t.id), null, 2)).toString('base64')
        const groupFilePath = `groups/${groupId}.json`
        const groupCommitMessage = `feat: update grouping for ${gameName} (${groupId})`

        fileCommits.push({
          path: groupFilePath,
          message: `${groupCommitMessage}\n\nCo-authored-by: ${coAuthorName} <${coAuthorEmail}>`,
          content: groupContent,
          sha: shas.groups
        })
        prBody += `\n\nThis PR also includes grouping changes for the associated titles`
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
        base: REPO_BRANCH,
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
