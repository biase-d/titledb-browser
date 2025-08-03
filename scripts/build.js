import fs from 'node:fs/promises'
import path from 'node:path'
import { Octokit } from '@octokit/rest'
import { drizzle } from 'drizzle-orm/postgres-js'
import { sql, inArray, eq, and } from 'drizzle-orm'
import postgres from 'postgres'
import { simpleGit } from 'simple-git'
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
	const coAuthorRegex = /Co-authored-by:.*<(?:\d+\+)?(?<username>[\w-]+)@users\.noreply\.github\.com>/
	const commitMessage = commit.commit.message;
	const coAuthorMatch = commitMessage.match(coAuthorRegex);
	return coAuthorMatch?.groups?.username || null;
}

async function buildDateMap () {
  console.log('Building file date map from Git history...');
  const dateMap = { performance: {}, graphics: {}, videos: {} };
  const dataRepoPath = REPOS.nx_performance.path;

  for (const type of Object.keys(dateMap)) {
    const dirPath = path.join(dataRepoPath, type === 'performance' ? 'profiles' : type);
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      for (const file of files) {
        const isProfileDir = type === 'performance' && file.isDirectory();
        const isJsonFile = path.extname(file.name) === '.json';
        
        if (isProfileDir) {
          const groupId = file.name;
          const versionFiles = await fs.readdir(path.join(dirPath, groupId));
          for (const versionFile of versionFiles) {
            const filePath = `profiles/${groupId}/${versionFile}`;
            const log = await git.cwd(dataRepoPath).log({ file: filePath, n: 1 });
            if (log.latest) {
               if (!dateMap.performance[groupId] || new Date(log.latest.date) > dateMap.performance[groupId]) {
                 dateMap.performance[groupId] = new Date(log.latest.date);
               }
            }
          }
        } else if (isJsonFile) {
          const groupId = path.basename(file.name, '.json');
          const filePath = `${type}/${file.name}`;
          const log = await git.cwd(dataRepoPath).log({ file: filePath, n: 1 });
          if (log.latest) {
            dateMap[type][groupId] = new Date(log.latest.date);
          }
        }
      }
    } catch (e) {
      console.warn(`Could not process directory ${dirPath}. Skipping. Error: ${e.message}`);
    }
  }
  console.log('File date map built.');
  return dateMap;
}

async function buildFullContributorMap () {
  console.log('Building comprehensive contributor map from PR history...');
  const contributorMap = { performance: {}, graphics: {}, videos: {} };
  try {
    const prs = await octokit.paginate(octokit.pulls.list, { owner: 'biase-d', repo: 'nx-performance', state: 'closed', per_page: 100 });
    const mergedPrs = prs.filter(pr => pr.merged_at);
    console.log(`Found ${mergedPrs.length} merged PRs to process.`);
    for (const pr of mergedPrs) {
      const { data: commits } = await octokit.pulls.listCommits({ owner: 'biase-d', repo: 'nx-performance', pull_number: pr.number, per_page: 1 });
      if (commits.length === 0) continue;
      const contributor = getContributorFromCommit(commits[0]);
      if (!contributor) continue;
      const prInfo = { contributor, sourcePrUrl: pr.html_url };
      const { data: files } = await octokit.pulls.listFiles({ owner: 'biase-d', repo: 'nx-performance', pull_number: pr.number, per_page: 100 });
      for (const file of files) {
        const filePath = file.filename;
        let match;
        if ((match = filePath.match(/^profiles\/([A-F0-9]{16})\//))) {
          contributorMap.performance[match[1]] = prInfo;
        } else if ((match = filePath.match(/^graphics\/([A-F0-9]{16})\.json/))) {
          contributorMap.graphics[match[1]] = prInfo;
        } else if ((match = filePath.match(/^videos\/([A-F0-9]{16})\.json/))) {
          contributorMap.videos[match[1]] = prInfo;
        }
      }
    }
  } catch (apiError) {
    console.error(`Failed to build contributor map from GitHub API: ${apiError.message}`);
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

async function doFullRebuild() {
  console.log('Starting FULL database rebuild process...');
  await db.execute(sql`TRUNCATE TABLE games, performance_profiles, graphics_settings, youtube_links, game_groups RESTART IDENTITY CASCADE;`)

  const dateMap = await buildDateMap();
  const gameUpdateMap = {};

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
    const groupId = customGroupMap.get(id) || getBaseId(id);
    allGroupIds.add(groupId);
    if (!gameUpdateMap[groupId]) gameUpdateMap[groupId] = { lastUpdated: new Date(0) };
  }

  for (const type of ['performance', 'graphics', 'videos']) {
      for (const [groupId, date] of Object.entries(dateMap[type])) {
          if (!gameUpdateMap[groupId] || date > gameUpdateMap[groupId].lastUpdated) {
              gameUpdateMap[groupId] = { lastUpdated: date };
          }
      }
  }
  
  const gameGroupsToInsert = Array.from(allGroupIds).map(id => ({ id, lastUpdated: gameUpdateMap[id]?.lastUpdated || new Date() }))
  if (gameGroupsToInsert.length > 0) {
    console.log(`Inserting ${gameGroupsToInsert.length} game groups...`)
    await db.insert(gameGroups).values(gameGroupsToInsert)
  }

  const contributorMap = await buildFullContributorMap()

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
						sourcePrUrl: contributionInfo.sourcePrUrl,
						lastUpdated: dateMap.performance[groupId] || new Date()
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
				contributor: contributionInfo.contributor,
				lastUpdated: dateMap.graphics[groupId] || new Date()
      })
    }
  }
  if (graphicsToUpsert.length > 0) await db.insert(graphicsSettings).values(graphicsToUpsert).onConflictDoUpdate({ target: graphicsSettings.groupId, set: { settings: sql`excluded.settings`, contributor: sql`excluded.contributor`, last_updated: sql`excluded.last_updated` } })

  const linksToInsert = [];
  for (const file of await fs.readdir(videosDir).catch(() => [])) {
    if (path.extname(file) === '.json') {
      const groupId = path.basename(file, '.json')
      const entries = JSON.parse(await fs.readFile(path.join(videosDir, file), 'utf-8'));
      for (const entry of entries) {
        if (entry.url) {
          linksToInsert.push({
            groupId,
            url: entry.url,
            notes: entry.notes,
            submittedBy: entry.submittedBy,
						submittedAt: dateMap.videos[groupId] || new Date()
          });
        }
      }
    }
  }
  if (linksToInsert.length > 0) await db.insert(youtubeLinks).values(linksToInsert);

  console.log('Reading and merging base game data...')
  const titleIdDir = path.join(DATA_DIR, 'titledb_filtered', 'output', 'titleid')
  const gamesToUpsert = []
  for (const [id, names] of Object.entries(mainGamesList)) {
    if (!names || !Array.isArray(names) || names.length === 0) continue
    let details = {}
    try {
      details = JSON.parse(await fs.readFile(path.join(titleIdDir, `${id}.json`), 'utf-8'))
    } catch (e) {
      if (e.code !== 'ENOENT') console.warn(`Could not read detail file for ${id}:`, e.message)
    }
    const groupId = customGroupMap.get(id) || getBaseId(id);
    gamesToUpsert.push({
      id, groupId, names,
      publisher: details.publisher, releaseDate: details.releaseDate,
      sizeInBytes: parseSizeToBytes(details.size), iconUrl: details.iconUrl,
      bannerUrl: details.bannerUrl, screenshots: details.screenshots,
			lastUpdated: gameUpdateMap[groupId]?.lastUpdated || new Date()
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
        last_updated: sql`excluded.last_updated`
      }
    })
  }
  console.log('Full database rebuild complete.');
}

async function doIncrementalUpdate() {
  console.log('Starting STATE-BASED incremental database synchronization...');
  const affectedGroupIds = new Set();
  const dataRepoPath = REPOS.nx_performance.path;

  console.log('Syncing performance profiles...');
  const perfDir = path.join(dataRepoPath, 'profiles');
  const dbProfiles = await db.select().from(performanceProfiles);
  const dbProfilesMap = new Map(dbProfiles.map(p => [`${p.groupId}-${p.gameVersion}`, p]));
  const localProfiles = new Set();

  for (const groupDir of await fs.readdir(perfDir, { withFileTypes: true }).catch(() => [])) {
    if (groupDir.isDirectory()) {
      const groupId = groupDir.name;
      for (const versionFile of await fs.readdir(path.join(perfDir, groupId)).catch(() => [])) {
        const gameVersion = path.basename(versionFile, '.json');
        const key = `${groupId}-${gameVersion}`;
        localProfiles.add(key);

        const filePath = `profiles/${groupId}/${versionFile}`;
        const log = await git.cwd(dataRepoPath).log({ file: filePath, n: 1 });
        const lastUpdated = log.latest ? new Date(log.latest.date) : new Date();
        
        const dbRecord = dbProfilesMap.get(key);
        if (!dbRecord || lastUpdated > dbRecord.lastUpdated) {
          console.log(`Upserting performance profile for ${key}`);
          const content = JSON.parse(await fs.readFile(path.join(perfDir, groupId, versionFile), 'utf-8'));
          await db.insert(performanceProfiles).values({
            groupId, gameVersion, profiles: content,
            contributor: content.contributor,
            sourcePrUrl: content.sourcePrUrl,
            lastUpdated
          }).onConflictDoUpdate({
            target: [performanceProfiles.groupId, performanceProfiles.gameVersion],
            set: { profiles: content, contributor: content.contributor, sourcePrUrl: content.sourcePrUrl, lastUpdated }
          });
          affectedGroupIds.add(groupId);
        }
      }
    }
  }
  
  if (affectedGroupIds.size > 0) {
    const groupsToInsert = Array.from(affectedGroupIds).map(id => ({ id }));
    await db.insert(gameGroups).values(groupsToInsert).onConflictDoNothing();
  }

  for (const [key, profile] of dbProfilesMap.entries()) {
    if (!localProfiles.has(key)) {
      console.log(`Deleting performance profile for ${key}`);
      await db.delete(performanceProfiles).where(and(eq(performanceProfiles.groupId, profile.groupId), eq(performanceProfiles.gameVersion, profile.gameVersion)));
      affectedGroupIds.add(profile.groupId);
    }
  }
  
  for (const type of ['graphics', 'videos']) {
    console.log(`Syncing ${type}...`);
    const dataDir = path.join(dataRepoPath, type);
    const table = type === 'graphics' ? graphicsSettings : youtubeLinks;
    const dbRecords = await db.select().from(table);
    const dbRecordsMap = new Map(dbRecords.map(r => [r.groupId, r]));
    const localRecords = new Set();

    for (const file of await fs.readdir(dataDir).catch(() => [])) {
      const groupId = path.basename(file, '.json');
      localRecords.add(groupId);

      const filePath = `${type}/${file}`;
      const log = await git.cwd(dataRepoPath).log({ file: filePath, n: 1 });
      const lastUpdated = log.latest ? new Date(log.latest.date) : new Date();

      const dbRecord = dbRecordsMap.get(groupId);
      if (!dbRecord || lastUpdated > (dbRecord.lastUpdated || dbRecord.submittedAt)) {
         console.log(`Upserting ${type} for ${groupId}`);
         const content = JSON.parse(await fs.readFile(path.join(dataDir, file), 'utf-8'));
         if (type === 'graphics') {
            await db.insert(graphicsSettings).values({
              groupId, settings: content, contributor: content.contributor, lastUpdated
            }).onConflictDoUpdate({ target: graphicsSettings.groupId, set: { settings: content, contributor: content.contributor, lastUpdated }});
         } else {
            await db.delete(youtubeLinks).where(eq(youtubeLinks.groupId, groupId));
            if (Array.isArray(content) && content.length > 0) {
              const linksToInsert = content.reduce((acc, entry) => {
                if (entry.url) {
                  acc.push({
                    groupId,
                    url: entry.url,
                    notes: entry.notes,
                    submittedBy: entry.submittedBy,
                    submittedAt: lastUpdated
                  });
                }
                return acc;
              }, []);
              
              if (linksToInsert.length > 0) {
                await db.insert(youtubeLinks).values(linksToInsert);
              }
            }
         }
         affectedGroupIds.add(groupId);
      }
    }

    if (affectedGroupIds.size > 0) {
        const groupsToInsert = Array.from(affectedGroupIds).map(id => ({ id }));
        await db.insert(gameGroups).values(groupsToInsert).onConflictDoNothing();
    }

    for (const [groupId, record] of dbRecordsMap.entries()) {
      if (!localRecords.has(groupId)) {
        console.log(`Deleting ${type} for ${groupId}`);
        await db.delete(table).where(eq(table.groupId, groupId));
        affectedGroupIds.add(groupId);
      }
    }
  }

  if (affectedGroupIds.size > 0) {
    const groupIdsArray = Array.from(affectedGroupIds);
    console.log(`Updating timestamps for ${groupIdsArray.length} affected groups...`);
    await db.update(gameGroups).set({ lastUpdated: new Date() }).where(inArray(gameGroups.id, groupIdsArray));
    await db.update(games).set({ lastUpdated: new Date() }).where(inArray(games.groupId, groupIdsArray));
  }

  console.log('Incremental database synchronization complete.');
}

(async () => {
  try {
    const isFullRebuild = process.argv.includes('--full-rebuild');
    
    await db.execute(sql`SELECT 1;`); console.log('DB connection successful.')
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm;`)
    await fs.mkdir(DATA_DIR, { recursive: true })
    await Promise.all(Object.values(REPOS).map(repo => cloneOrPull(repo.path, repo.url)))
    
    if (isFullRebuild) {
      await doFullRebuild();
    } else {
      await doIncrementalUpdate();
    }

  } catch (error) {
    console.error('An unexpected error occurred:', error)
    process.exit(1)
  } finally {
    await client.end()
    console.log('Database connection closed.')
  }
})()