import fs from 'node:fs/promises'
import path from 'node:path'
import { Octokit } from '@octokit/rest'
import { drizzle } from 'drizzle-orm/postgres-js'
import { sql, inArray } from 'drizzle-orm'
import postgres from 'postgres'
import simpleGit from 'simple-git'
import { games, graphicsSettings, performanceProfiles, youtubeLinks, gameGroups } from '../src/lib/db/schema.js'

const DATA_DIR = 'data'
const REPOS = {
  nx_performance: { url: 'https://github.com/biase-d/nx-performance.git', path: path.join(DATA_DIR, 'nx-performance') },
  titledb_filtered: { url: 'https://github.com/masagrator/titledb_filtered.git', path: path.join(DATA_DIR, 'titledb_filtered') }
}

const git = simpleGit()
const octokit = new Octokit({ auth: process.env.ACCESS_TOKEN })
const client = postgres(process.env.POSTGRES_URL, { ssl: 'require' })
const db = drizzle(client)

async function cloneOrPull (repoPath, repoUrl) {
  try {
    await fs.access(repoPath)
    console.log(`Pulling latest changes for ${repoPath}...`)
    await git.cwd(repoPath).pull()
  } catch {
    console.log(`Cloning ${repoUrl} into ${repoPath}...`)
    await git.clone(repoUrl, repoPath)
  }
}

function getContributorFromCommit(commit) {
	const coAuthorRegex = /Co-authored-by: .*<(?:\d+\+)?([\w-]+)@users\.noreply\.github\.com>/g
	const commitMessage = commit.commit.message;
	const primaryAuthorLogin = commit.author?.login;

	const coAuthorMatches = [...commitMessage.matchAll(coAuthorRegex)];
	if (coAuthorMatches.length > 0) {
		const lastMatch = coAuthorMatches[coAuthorMatches.length - 1];
		return lastMatch[1];
	}
	if (primaryAuthorLogin && primaryAuthorLogin.toLowerCase() !== 'web-flow') {
		return primaryAuthorLogin;
	}
	return null;
}

async function buildContributorMap () {
  console.log('Building comprehensive contributor map from PR history...')
  const contributorMap = {
		performance: {},
		graphics: {},
		videos: {}
	};

  try {
    const prs = await octokit.paginate(octokit.pulls.list, {
      owner: 'biase-d',
      repo: 'nx-performance',
      state: 'closed',
      per_page: 100
    })

    for (const pr of prs) {
      if (!pr.merged_at) continue;

			const { data: commit } = await octokit.repos.getCommit({
				owner: 'biase-d',
				repo: 'nx-performance',
				ref: pr.merge_commit_sha
			})

			const contributor = getContributorFromCommit(commit)
			if (!contributor) continue;
			
			const prInfo = { contributor, sourcePrUrl: pr.html_url };

			for (const file of commit.files) {
				const filePath = file.filename;
				let match;

				if (match = filePath.match(/^profiles\/([A-F0-9]{16})\//)) {
					contributorMap.performance[match[1]] = prInfo;
				} else if (match = filePath.match(/^graphics\/([A-F0-9]{16})\.json/)) {
					contributorMap.graphics[match[1]] = prInfo;
				} else if (match = filePath.match(/^videos\/([A-F0-9]{16})\.json/)) {
					contributorMap.videos[match[1]] = prInfo;
				}
			}
    }
  } catch (apiError) {
    console.error(`Failed to build contributor map from GitHub API: ${apiError.message}`)
  }

  console.log('-> Contributor map built.')
  return contributorMap;
}


function getBaseId (titleId) { return titleId.substring(0, 13) + '000' }
function parseSizeToBytes (sizeStr) {
  if (!sizeStr) return null
  const match = sizeStr.match(/([\d.]+)\s*(\w+)/)
  if (!match) return null
  const value = parseFloat(match[1])
  const unit = match[2].toLowerCase()
  const units = { kib: 1024, mib: 1024 ** 2, gib: 1024 ** 3, kb: 1000, mb: 1000 ** 2, gb: 1000 ** 3 }
  return Math.round(value * (units[unit] || 1))
}

async function syncDatabase () {
  console.log('Starting database synchronization process...')
  await db.execute(sql`TRUNCATE TABLE games, performance_profiles, graphics_settings, youtube_links, game_groups RESTART IDENTITY CASCADE;`)

  const allGroupIds = new Set()
  const customGroupMap = new Map()

  const groupsDir = path.join(DATA_DIR, 'nx-performance', 'groups')
  try {
    const groupFiles = await fs.readdir(groupsDir)
    for (const file of groupFiles) {
      if (path.extname(file) === '.json') {
        const customGroupId = path.basename(file, '.json')
        allGroupIds.add(customGroupId)
        const titleIds = JSON.parse(await fs.readFile(path.join(groupsDir, file), 'utf-8'))
        for (const titleId of titleIds) customGroupMap.set(titleId, customGroupId)
      }
    }
  } catch (e) { /* ignore */ }

  const performanceDir = path.join(DATA_DIR, 'nx-performance', 'profiles')
  for (const groupDir of await fs.readdir(performanceDir, { withFileTypes: true }).catch(() => [])) {
    if (groupDir.isDirectory()) allGroupIds.add(groupDir.name)
  }
  const graphicsDir = path.join(DATA_DIR, 'nx-performance', 'graphics')
  for (const file of await fs.readdir(graphicsDir).catch(() => [])) {
    if (path.extname(file) === '.json') allGroupIds.add(path.basename(file, '.json'))
  }
  const videosDir = path.join(DATA_DIR, 'nx-performance', 'videos')
  for (const file of await fs.readdir(videosDir).catch(() => [])) {
    if (path.extname(file) === '.json') allGroupIds.add(path.basename(file, '.json'))
  }

  const mainJsonPath = path.join(DATA_DIR, 'titledb_filtered', 'output', 'main.json')
  const mainGamesList = JSON.parse(await fs.readFile(mainJsonPath, 'utf-8'))
  for (const id of Object.keys(mainGamesList)) {
    allGroupIds.add(customGroupMap.get(id) || getBaseId(id))
  }

  const gameGroupsToInsert = Array.from(allGroupIds).map(id => ({ id }))
  if (gameGroupsToInsert.length > 0) {
    console.log(`Inserting ${gameGroupsToInsert.length} game groups...`)
    await db.insert(gameGroups).values(gameGroupsToInsert)
  }

  const contributorMap = await buildContributorMap()

  const profilesToInsert = [];
	for (const groupDir of await fs.readdir(performanceDir, { withFileTypes: true }).catch(() => [])) {
		if (groupDir.isDirectory()) {
			const groupId = groupDir.name;
			const contributionInfo = contributorMap.performance[groupId] || {};
			for (const versionFile of await fs.readdir(path.join(performanceDir, groupId)).catch(() => [])) {
				if (path.extname(versionFile) === '.json') {
					const gameVersion = path.basename(versionFile, '.json')
					const content = JSON.parse(await fs.readFile(path.join(performanceDir, groupId, versionFile), 'utf-8'))
					profilesToInsert.push({
						groupId, gameVersion, profiles: content,
						contributor: contributionInfo.contributor,
						sourcePrUrl: contributionInfo.sourcePrUrl
					})
				}
			}
		}
	}
  if (profilesToInsert.length > 0) await db.insert(performanceProfiles).values(profilesToInsert)

  const graphicsToUpsert = [];
  for (const file of await fs.readdir(graphicsDir).catch(() => [])) {
    if (path.extname(file) === '.json') {
      const groupId = path.basename(file, '.json')
			const contributionInfo = contributorMap.graphics[groupId] || {};
      graphicsToUpsert.push({
        groupId,
        settings: JSON.parse(await fs.readFile(path.join(graphicsDir, file), 'utf-8')),
				contributor: contributionInfo.contributor
      })
    }
  }
  if (graphicsToUpsert.length > 0) await db.insert(graphicsSettings).values(graphicsToUpsert).onConflictDoUpdate({ target: graphicsSettings.groupId, set: { settings: sql`excluded.settings`, contributor: sql`excluded.contributor` } })

  const linksToInsert = [];
  for (const file of await fs.readdir(videosDir).catch(() => [])) {
    if (path.extname(file) === '.json') {
      const groupId = path.basename(file, '.json')
			const contributionInfo = contributorMap.videos[groupId] || {};
      const urls = JSON.parse(await fs.readFile(path.join(videosDir, file), 'utf-8'))
      for (const url of urls) linksToInsert.push({ groupId, url, submittedBy: contributionInfo.contributor })
    }
  }
  if (linksToInsert.length > 0) await db.insert(youtubeLinks).values(linksToInsert)

  console.log('Reading and merging base game data...')
  const titleIdDir = path.join(DATA_DIR, 'titledb_filtered', 'output', 'titleid')
  const gamesToUpsert = []
  for (const [id, names] of Object.entries(mainGamesList)) {
    if (!names || !Array.isArray(names) || names.length === 0) {
      continue
    }
    let details = {}
    try {
      details = JSON.parse(await fs.readFile(path.join(titleIdDir, `${id}.json`), 'utf-8'))
    } catch (e) {
      if (e.code !== 'ENOENT') console.warn(`Could not read detail file for ${id}:`, e.message)
    }
    gamesToUpsert.push({
      id, groupId: customGroupMap.get(id) || getBaseId(id), names,
      publisher: details.publisher, releaseDate: details.releaseDate,
      sizeInBytes: parseSizeToBytes(details.size), iconUrl: details.iconUrl,
      bannerUrl: details.bannerUrl, screenshots: details.screenshots
    })
  }

  console.log(`Upserting ${gamesToUpsert.length} game records...`)
  const batchSize = 500
  for (let i = 0; i < gamesToUpsert.length; i += batchSize) {
    const batch = gamesToUpsert.slice(i, i + batchSize)
    await db.insert(games).values(batch).onConflictDoUpdate({
      target: games.id,
      set: {
        names: sql`excluded.names`, publisher: sql`excluded.publisher`,
        release_date: sql`excluded.release_date`, size_in_bytes: sql`excluded.size_in_bytes`,
        icon_url: sql`excluded.icon_url`, banner_url: sql`excluded.banner_url`,
        screenshots: sql`excluded.screenshots`, group_id: sql`excluded.group_id`,
        last_updated: new Date()
      }
    })
  }

  console.log('Database synchronization complete.')
}

(async () => {
  try {
    await db.execute(sql`SELECT 1;`) console.log('DB connection successful.')
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm;`)
    await fs.mkdir(DATA_DIR, { recursive: true })
    await Promise.all(Object.values(REPOS).map(repo => cloneOrPull(repo.path, repo.url)))
    await syncDatabase()
  } catch (error) {
    console.error('An unexpected error occurred:', error)
    process.exit(1)
  } finally {
    await client.end()
    console.log('Database connection closed.')
  }
})()