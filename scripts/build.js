import fs from 'node:fs/promises'
import path from 'node:path'
import { Octokit } from '@octokit/rest'
import { drizzle } from 'drizzle-orm/postgres-js'
import { sql,  } from 'drizzle-orm'
import postgres from 'postgres'
import simpleGit from 'simple-git'
import { games, performanceProfiles } from '../src/lib/db/schema.js'

const DATA_DIR = 'data'
const REPOS = {
  nx_performance: { url: 'https://github.com/biase-d/nx-performance.git', path: path.join(DATA_DIR, 'nx-performance') },
  titledb_filtered: { url: 'https://github.com/masagrator/titledb_filtered.git', path: path.join(DATA_DIR, 'titledb_filtered') }
}

const git = simpleGit()
const octokit = new Octokit({ auth: process.env.ACCESS_TOKEN })
const client = postgres(process.env.POSTGRES_URL, { ssl: 'require' })
const db = drizzle(client)

/**
 * Clones a repository if it doesnt exist or pulls the latest changes if it does.
 * @param {string} repoPath The local path to the repository.
 * @param {string} repoUrl The remote URL of the repository.
 */
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
/**
 * Builds a map of groupId to contributor username and source PR URL from the commit history of merged PRs.
 * @returns {Promise<{[key: string]: {contributor: string, sourcePrUrl: string}}>} A map of contribution info.
 */
async function buildContributorMap () {
  console.log('Building contributor map from biase-d/nx-performance PR history...')
  const contributorMap = {}
  const coAuthorRegex = /Co-authored-by: .+ <(?:\d+\+)?(.+?)@users\.noreply\.github\.com>/

  try {
    const prs = await octokit.paginate(octokit.pulls.list, {
      owner: 'biase-d',
      repo: 'nx-performance',
      state: 'closed',
      per_page: 100
    })

    console.log(`Found ${prs.length} closed PRs to process.`)

    for (const pr of prs) {
      if (!pr.merged_at) continue

      const branchName = pr.head.ref
      const groupIdMatch = branchName.match(/([A-F0-9]{16})$/i)
      if (!groupIdMatch) continue

      const groupId = groupIdMatch[1].toUpperCase()

      const { data: commits } = await octokit.pulls.listCommits({
        owner: 'biase-d',
        repo: 'nx-performance',
        pull_number: pr.number,
        per_page: 1
      })
      if (commits.length === 0) continue

      const commit = commits[0]
      const commitMessage = commit.commit.message
      const primaryAuthorLogin = commit.author?.login

      let contributor = null
      const coAuthorMatch = commitMessage.match(coAuthorRegex)

      if (coAuthorMatch && coAuthorMatch[1]) {
        contributor = coAuthorMatch[1]
      } else if (primaryAuthorLogin && primaryAuthorLogin.toLowerCase() !== 'web-flow') {
        contributor = primaryAuthorLogin
      }

      if (contributor) {
        contributorMap[groupId] = {
          contributor,
          sourcePrUrl: pr.html_url
        }
      }
    }
  } catch (apiError) {
    console.error(`Failed to build contributor map from GitHub API: ${apiError.message}`)
  }

  console.log(`-> Contributor map built with ${Object.keys(contributorMap).length} entries.`)
  return contributorMap
}

/**
 * Extracts the base ID from a full Title ID.
 * @param {string} titleId The full Title ID.
 * @returns {string} The base ID.
 */
function getBaseId (titleId) {
  return titleId.substring(0, 13) + '000'
}

/**
 * Parses a size string (e.g., "1.07 GiB") into bytes.
 * @param {string} sizeStr The size string.
 * @returns {number | null} The size in bytes or null if parsing fails.
 */
function parseSizeToBytes (sizeStr) {
  if (!sizeStr) return null
  const match = sizeStr.match(/([\d.]+)\s*(\w+)/)
  if (!match) return null

  const value = parseFloat(match[1])
  const unit = match[2].toLowerCase()

  switch (unit) {
    case 'kib': return Math.round(value * 1024)
    case 'mib': return Math.round(value * 1024 ** 2)
    case 'gib': return Math.round(value * 1024 ** 3)
    case 'kb': return Math.round(value * 1000)
    case 'mb': return Math.round(value * 1000 ** 2)
    case 'gb': return Math.round(value * 1000 ** 3)
    default: return Math.round(value)
  }
}

async function syncDatabase () {
  console.log('Starting database synchronization process...')
  await db.execute(sql`SELECT 1;`)
  console.log('Database connection successful.')
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm;`)

  try {
    await db.select().from(games).limit(1)
    await db.select().from(performanceProfiles).limit(1)
    console.log('Database schema assumed to be up to date.')
  } catch (e) {
    console.error('Database schema is not up to date. Please run `npm run db:push` to apply migrations.')
    process.exit(1)
  }

  const customGroupMap = new Map()
  const groupsDir = path.join(DATA_DIR, 'nx-performance', 'groups')
  try {
    const groupFiles = await fs.readdir(groupsDir)
    for (const file of groupFiles) {
      if (path.extname(file) === '.json') {
        const customGroupId = path.basename(file, '.json')
        const filePath = path.join(groupsDir, file)
        const titleIds = JSON.parse(await fs.readFile(filePath, 'utf-8'))
        for (const titleId of titleIds) {
          customGroupMap.set(titleId, customGroupId)
        }
      }
    }
    console.log(`Loaded ${customGroupMap.size} custom title groupings.`)
  } catch (e) {
    console.log('No custom groups directory found, skipping.')
  }

  const contributorMap = await buildContributorMap()

  const performanceDir = path.join(DATA_DIR, 'nx-performance', 'data')
  const performanceFiles = await fs.readdir(performanceDir)
  const profilesToUpsert = []
  for (const file of performanceFiles) {
    if (path.extname(file) === '.json') {
      const groupId = path.basename(file, '.json')
      const filePath = path.join(performanceDir, file)
      const content = await fs.readFile(filePath, 'utf-8')
      const contributionInfo = contributorMap[groupId] || {}
      profilesToUpsert.push({
        groupId,
        profiles: JSON.parse(content),
        contributor: contributionInfo.contributor || null,
        sourcePrUrl: contributionInfo.sourcePrUrl || null,
        lastUpdated: new Date()
      })
    }
  }
  console.log(`Processing ${profilesToUpsert.length} performance data files...`)

  if (profilesToUpsert.length > 0) {
    await db.insert(performanceProfiles)
      .values(profilesToUpsert)
      .onConflictDoUpdate({
        target: performanceProfiles.groupId,
        set: {
          profiles: sql`excluded.profiles`,
          contributor: sql`excluded.contributor`,
          sourcePrUrl: sql`excluded."sourcePrUrl"`,
          lastUpdated: sql`excluded."lastUpdated"`
        }
      })
  }

  console.log('Reading and merging base game data...')
  const mainJsonPath = path.join(DATA_DIR, 'titledb_filtered', 'output', 'main.json')
  const titleIdDir = path.join(DATA_DIR, 'titledb_filtered', 'output', 'titleid')
  const mainGamesList = JSON.parse(await fs.readFile(mainJsonPath, 'utf-8'))

  const gamesToUpsert = []

  for (const [id, names] of Object.entries(mainGamesList)) {
    if (!names || !Array.isArray(names) || names.length === 0) {
      continue // Skip entries without valid names
    }

    let details = {}
    try {
      const detailPath = path.join(titleIdDir, `${id}.json`)
      details = JSON.parse(await fs.readFile(detailPath, 'utf-8'))
    } catch (e) {
      if (e.code !== 'ENOENT') {
        console.warn(`Could not read detail file for ${id}:`, e.message)
      }
    }

    const groupId = customGroupMap.get(id) || getBaseId(id)

    gamesToUpsert.push({
      id,
      groupId,
      names,
      publisher: details.publisher,
      releaseDate: details.releaseDate,
      sizeInBytes: parseSizeToBytes(details.size),
      iconUrl: details.iconUrl,
      bannerUrl: details.bannerUrl,
      screenshots: details.screenshots,
      description: details.description,
      lastUpdated: new Date()
    })
  }

  console.log(`Upserting ${gamesToUpsert.length} game records...`)
  const batchSize = 500
  for (let i = 0; i < gamesToUpsert.length; i += batchSize) {
    const batch = gamesToUpsert.slice(i, i + batchSize)
    console.log(`  -> Batch ${i / batchSize + 1}/${Math.ceil(gamesToUpsert.length / batchSize)}...`)
    try {
      await db.insert(games)
        .values(batch)
        .onConflictDoUpdate({
          target: games.id,
          set: {
            names: sql`excluded.names`,
            publisher: sql`excluded.publisher`,
            releaseDate: sql`excluded."releaseDate"`,
            sizeInBytes: sql`excluded."sizeInBytes"`,
            iconUrl: sql`excluded."iconUrl"`,
            bannerUrl: sql`excluded."bannerUrl"`,
            screenshots: sql`excluded.screenshots`,
            groupId: sql`excluded."groupId"`, 
            lastUpdated: sql`excluded."lastUpdated"`
          }
        })
    } catch (err) {
      console.error('An error occurred during the database operation:', err)
      process.exit(1)
    }
  }

  console.log('Database synchronization complete.')
}

(async () => {
  try {
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
