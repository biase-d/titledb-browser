import fs from 'node:fs/promises'
import path from 'node:path'
import { Octokit } from '@octokit/rest'
import { drizzle } from 'drizzle-orm/postgres-js'
import { sql, inArray, eq, and, isNull } from 'drizzle-orm'
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

function getContributorsFromCommit(commit) {
	const contributors = new Set();
	const coAuthorRegex = /Co-authored-by:.*<(?:\d+\+)?(?<username>[\w-]+)@users\.noreply\.github\.com>/g;
	const commitMessage = commit.commit.message;
	const coAuthorMatches = [...commitMessage.matchAll(coAuthorRegex)];

	for (const match of coAuthorMatches) {
		if (match.groups.username) {
			contributors.add(match.groups.username);
		}
	}
	return Array.from(contributors);
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
            const baseName = path.basename(versionFile, '.json');
            const [gameVersion, ...suffixParts] = baseName.split('$');
            const suffix = suffixParts.join('$') || '';
            const key = `${groupId}-${gameVersion}-${suffix}`;

            const filePath = `profiles/${groupId}/${versionFile}`;
            const log = await git.cwd(dataRepoPath).log({ file: filePath, n: 1 });
            if (log.latest) {
              dateMap.performance[key] = new Date(log.latest.date);
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

async function buildFullContributorMap (cachedMap = null, lastProcessedDate = null) {
let contributorMap = cachedMap || { performance: {}, graphics: {}, videos: {} };
  let latestMergedAt = lastProcessedDate;

  for (const type of ['graphics', 'videos']) {
    if (contributorMap[type]) {
      for (const groupId in contributorMap[type]) {
        const value = contributorMap[type][groupId];
        contributorMap[type][groupId] = new Set(Array.isArray(value) ? value : []);
      }
    }
  }

  console.log('Building/updating contributor map from PR history...');
  
  try {
    const prs = await octokit.paginate('GET /repos/{owner}/{repo}/pulls', { 
      owner: 'biase-d', 
      repo: 'nx-performance', 
      state: 'closed', 
      sort: 'updated',
      direction: 'desc',
      per_page: 100 
    });

    const mergedPrs = prs.filter(pr => pr.merged_at);
    if (!latestMergedAt) {
      console.log(`Found ${mergedPrs.length} total merged PRs to process (full build).`);
    } else {
      console.log(`Checking for new PRs merged after ${latestMergedAt.toISOString()}`);
    }
    
    for (const pr of mergedPrs) {
      const mergedAt = new Date(pr.merged_at);

      if (lastProcessedDate && mergedAt <= lastProcessedDate) {
        console.log('No more new PRs to process.');
        break; 
      }

      if (!latestMergedAt || mergedAt > latestMergedAt) {
        latestMergedAt = mergedAt;
      }
      
      const { data: commits } = await octokit.pulls.listCommits({ owner: 'biase-d', repo: 'nx-performance', pull_number: pr.number, per_page: 1 });
      if (commits.length === 0) continue;

      const contributorsInPr = getContributorsFromCommit(commits[0]);
      if (contributorsInPr.length === 0) continue;

      const prInfo = { contributors: contributorsInPr, sourcePrUrl: pr.html_url };

      const { data: files } = await octokit.pulls.listFiles({ owner: 'biase-d', repo: 'nx-performance', pull_number: pr.number, per_page: 100 });
      for (const file of files) {
        const filePath = file.filename;
        let match;
        if ((match = filePath.match(/^profiles\/([A-F0-9]{16})\/(.+)\.json/))) {
          const groupId = match[1];
          const fileBaseName = match[2];
          const [gameVersion, ...suffixParts] = fileBaseName.split('$');
          const suffix = suffixParts.join('$') || '';
          const key = `${groupId}-${gameVersion}-${suffix}`;
          contributorMap.performance[key] = prInfo;
        } else if ((match = filePath.match(/^graphics\/([A-F0-9]{16})\.json/))) {
          const groupId = match[1];
          if (!contributorMap.graphics[groupId]) {
            contributorMap.graphics[groupId] = new Set();
          }
          prInfo.contributors.forEach(c => contributorMap.graphics[groupId].add(c));
        } else if ((match = filePath.match(/^videos\/([A-F0-9]{16})\.json/))) {
          const groupId = match[1];
          if (!contributorMap.videos[groupId]) {
            contributorMap.videos[groupId] = new Set();
          }
          prInfo.contributors.forEach(c => contributorMap.videos[groupId].add(c));
        }
      }
    }

    for (const type of ['graphics', 'videos']) {
      for (const groupId in contributorMap[type]) {
        contributorMap[type][groupId] = Array.from(contributorMap[type][groupId]);
      }
    }

  } catch (apiError) {
    console.error(`Failed to build contributor map from GitHub API: ${apiError.message}`);
  }
  console.log('-> Contributor map build/update complete.')
  return { contributorMap, latestMergedAt };
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

async function syncDatabase (contributorMap, dateMap, metadata) {
  console.log('Starting database synchronization...');
  
  const allGroupIds = new Set();
  const customGroupMap = new Map();
  const dataRepoPath = REPOS.nx_performance.path;

  const groupDirs = ['groups', 'profiles', 'graphics', 'videos'];
  for (const dirName of groupDirs) {
    const dirPath = path.join(dataRepoPath, dirName);
    try {
      for (const file of await fs.readdir(dirPath, { withFileTypes: true })) {
        if (dirName === 'groups' && file.isFile() && path.extname(file.name) === '.json') {
          const customGroupId = path.basename(file.name, '.json');
          allGroupIds.add(customGroupId);
          const titleIds = JSON.parse(await fs.readFile(path.join(dirPath, file.name), 'utf-8'));
          for (const titleId of titleIds) customGroupMap.set(titleId, customGroupId);
        } else if (dirName === 'profiles' && file.isDirectory()) {
          allGroupIds.add(file.name);
        } else if ((dirName === 'graphics' || dirName === 'videos') && file.isFile() && path.extname(file.name) === '.json') {
          allGroupIds.add(path.basename(file.name, '.json'));
        }
      }
    } catch (e) {
      console.warn(`Could not process directory ${dirPath}. Skipping.`);
    }
  }

  const mainJsonPath = path.join(REPOS.titledb_filtered.path, 'output', 'main.json');
  const mainGamesList = JSON.parse(await fs.readFile(mainJsonPath, 'utf-8'));
  for (const id of Object.keys(mainGamesList)) {
    allGroupIds.add(customGroupMap.get(id) || getBaseId(id));
  }
  
  if (allGroupIds.size > 0) {
    console.log(`Ensuring ${allGroupIds.size} game groups exist...`);
    const groupsToInsert = Array.from(allGroupIds).map(id => ({ id }));
    await db.insert(gameGroups).values(groupsToInsert).onConflictDoNothing();
  }

  const affectedGroupIds = new Set();
  const syncConfig = { dataRepoPath, contributorMap, dateMap, affectedGroupIds, db };
  await syncDataType({ ...syncConfig, type: 'performance', table: performanceProfiles });
  await syncDataType({ ...syncConfig, type: 'graphics', table: graphicsSettings });
  await syncDataType({ ...syncConfig, type: 'videos', table: youtubeLinks });

  console.log('Syncing base game data...');
  const titleIdDir = path.join(REPOS.titledb_filtered.path, 'output', 'titleid');
  const titledbRepoPath = REPOS.titledb_filtered.path;
  const currentTitledbHash = (await git.cwd(titledbRepoPath).log(['-n', '1', '--pretty=format:%H'])).latest.hash;

  let gamesToUpsert = [];
  if (metadata.titledbFilteredHash !== currentTitledbHash) {
    console.log(' -> Changes detected in titledb_filtered. Syncing all game records.');
    metadata.titledbFilteredHash = currentTitledbHash;
    for (const [id, names] of Object.entries(mainGamesList)) {
      if (!names || !Array.isArray(names) || names.length === 0) continue;
      let details = {};
      try {
        details = JSON.parse(await fs.readFile(path.join(titleIdDir, `${id}.json`), 'utf-8'));
      } catch (e) { /* ignore ENOENT */ }
      const groupId = customGroupMap.get(id) || getBaseId(id);

      // Get the correct historical date for this game's group
      let mostRecentPerfDate = null;
      for (const key in dateMap.performance) {
        if (key.startsWith(groupId)) {
          const date = dateMap.performance[key];
          if (!mostRecentPerfDate || date > mostRecentPerfDate) {
            mostRecentPerfDate = date;
          }
        }
      }
      const lastUpdate = mostRecentPerfDate || dateMap.graphics[groupId] || dateMap.videos[groupId] || new Date();
      
      gamesToUpsert.push({
        id, groupId, names,
        publisher: details.publisher, releaseDate: details.releaseDate,
        sizeInBytes: parseSizeToBytes(details.size), iconUrl: details.iconUrl,
        bannerUrl: details.bannerUrl, screenshots: details.screenshots,
        lastUpdated: lastUpdate
      });
    }
  } else {
    console.log(' -> titledb_filtered has not changed. Skipping game data sync.');
  }

  if (gamesToUpsert.length > 0) {
    console.log(`Upserting ${gamesToUpsert.length} game records...`);
    const batchSize = 500;
    for (let i = 0; i < gamesToUpsert.length; i += batchSize) {
      const batch = gamesToUpsert.slice(i, i + batchSize);
      await db.insert(games).values(batch).onConflictDoUpdate({
        target: games.id,
        set: {
          names: sql`excluded.names`,
          publisher: sql`excluded.publisher`,
          release_date: sql`excluded.release_date`,
          size_in_bytes: sql`excluded.size_in_bytes`,
          icon_url: sql`excluded.icon_url`,
          banner_url: sql`excluded.banner_url`,
          screenshots: sql`excluded.screenshots`,
          group_id: sql`excluded.group_id`,
          last_updated: sql`excluded.last_updated`
        }
      });
    }
  }

  const allAffected = new Set([...affectedGroupIds, ...gamesToUpsert.map(g => g.groupId)]);
  if (allAffected.size > 0) {
    console.log(`Updating timestamps for ${allAffected.size} affected groups...`);
    const updatePromises = [];
    for (const groupId of allAffected) {
      let mostRecentPerfDate = null;
      for (const key in dateMap.performance) {
        if (key.startsWith(groupId)) {
          const date = dateMap.performance[key];
          if (!mostRecentPerfDate || date > mostRecentPerfDate) {
            mostRecentPerfDate = date;
          }
        }
      }
      const lastUpdate = mostRecentPerfDate || dateMap.graphics[groupId] || dateMap.videos[groupId] || new Date();
      
      updatePromises.push(
        db.update(gameGroups).set({ lastUpdated: lastUpdate }).where(eq(gameGroups.id, groupId)),
        db.update(games).set({ lastUpdated: lastUpdate }).where(eq(games.groupId, groupId))
      );
    }
    await Promise.all(updatePromises);
  }

  console.log('Database synchronization complete.');
}

async function syncDataType(config) {
  const { type, dataRepoPath, table, contributorMap, dateMap, affectedGroupIds, db } = config;
  console.log(`- Syncing ${type}...`);

  const dataDir = path.join(dataRepoPath, type === 'performance' ? 'profiles' : type);
  const dbRecords = await db.select().from(table);
  const localFileKeys = new Set();
  
  const dbRecordsMap = (type === 'performance')
    ? new Map(dbRecords.map(p => [`${p.groupId}-${p.gameVersion}-${p.suffix || ''}`, p]))
    : new Map(dbRecords.map(r => [r.groupId, r]));

  const files = await fs.readdir(dataDir, { withFileTypes: true }).catch(() => []);
  for (const file of files) {
    let groupId;
    if (type === 'performance' && file.isDirectory()) {
      groupId = file.name;
    } else if (path.extname(file.name) === '.json') {
      groupId = path.basename(file.name, '.json');
    }

    if (groupId) {
      await db.insert(gameGroups).values({ id: groupId }).onConflictDoNothing();
    }

    if (type === 'performance' && file.isDirectory()) {
      groupId = file.name;
      const versionFiles = await fs.readdir(path.join(dataDir, groupId)).catch(() => []);
      for (const versionFile of versionFiles) {
        // This inner loop handles the performance profile logic
        const baseName = path.basename(versionFile, '.json');
        const [gameVersion, ...suffixParts] = baseName.split('$');
        const suffix = suffixParts.join('$') || null;
        const fileKey = `${groupId}-${gameVersion}-${suffix || ''}`;
        localFileKeys.add(fileKey);

        const lastUpdated = dateMap.performance?.[fileKey] || new Date();
        const dbRecord = dbRecordsMap.get(fileKey);

        // Compare timestamps by seconds to avoid millisecond precision issues from cache
        const hasChanged = !dbRecord || Math.floor(lastUpdated.getTime() / 1000) > Math.floor(dbRecord.lastUpdated.getTime() / 1000);

        if (hasChanged) {
          console.log(`Processing performance profile for ${fileKey}`);
          await db.insert(gameGroups).values({ id: groupId }).onConflictDoNothing();
          const content = JSON.parse(await fs.readFile(path.join(dataDir, groupId, versionFile), 'utf-8'));
          
          const contributorKey = `${groupId}-${gameVersion}-${suffix || ''}`;
          const contributionInfo = contributorMap.performance?.[contributorKey] || {};

          const recordData = {
            groupId, gameVersion, suffix, profiles: content,
            contributor: contributionInfo.contributors ? contributionInfo.contributors[0] : null, // Get first contributor from array
            sourcePrUrl: contributionInfo.sourcePrUrl, 
            lastUpdated
          };
          
          if (dbRecord) {
            await db.update(performanceProfiles).set({
              groupId: recordData.groupId,
              gameVersion: recordData.gameVersion,
              suffix: recordData.suffix,
              profiles: recordData.profiles,
              contributor: recordData.contributor,
              sourcePrUrl: recordData.sourcePrUrl,
              lastUpdated: recordData.lastUpdated
            }).where(eq(performanceProfiles.id, dbRecord.id));
          } else {
            await db.insert(performanceProfiles).values(recordData);
          }
          affectedGroupIds.add(groupId);
        }
      }
    } else if (path.extname(file.name) === '.json') {
      const groupId = path.basename(file.name, '.json');
      localFileKeys.add(groupId);
      
      const lastUpdated = dateMap[type]?.[groupId] || new Date();
      const dbRecord = dbRecordsMap.get(groupId);

      const dbTimestamp = dbRecord?.lastUpdated || dbRecord?.submittedAt;
      const hasChanged = !dbRecord || (dbTimestamp && Math.floor(lastUpdated.getTime() / 1000) > Math.floor(dbTimestamp.getTime() / 1000));
      
      if (hasChanged) {
        console.log(`Processing ${type} for ${groupId}`);
        const content = JSON.parse(await fs.readFile(path.join(dataDir, file.name), 'utf-8'));

        if (type === 'graphics') {
          const historicalContributors = contributorMap.graphics?.[groupId] || [];
          const fileContributors = Array.isArray(content.contributor) ? content.contributor : (content.contributor ? [content.contributor] : []);
          const allContributors = [...new Set([...historicalContributors, ...fileContributors])];
          await db.insert(graphicsSettings).values({
            groupId, settings: content, contributor: allContributors.length > 0 ? allContributors : null, lastUpdated
          }).onConflictDoUpdate({ target: graphicsSettings.groupId, set: { settings: sql`excluded.settings`, contributor: sql`excluded.contributor`, lastUpdated: sql`excluded.last_updated` }});
        } else if (type === 'videos') {
          await db.delete(youtubeLinks).where(eq(youtubeLinks.groupId, groupId));
          if (Array.isArray(content) && content.length > 0) {
            const linksToInsert = content.filter(e => e.url).map(e => ({
              groupId, url: e.url, notes: e.notes, submittedBy: e.submittedBy, submittedAt: lastUpdated
            }));
            if (linksToInsert.length > 0) await db.insert(youtubeLinks).values(linksToInsert);
          }
        }
        affectedGroupIds.add(groupId);
      }
    }
  }

  for (const [key, record] of dbRecordsMap.entries()) {
    if (!localFileKeys.has(key)) {
      console.log(`Deleting ${type} for ${key}`);
      const deleteCondition = eq(table.id, record.id);
      await db.delete(table).where(deleteCondition);
      affectedGroupIds.add(record.groupId);
    }
  }
}

(async () => {
  try {
    const isFullRebuild = process.argv.includes('--full-rebuild');
    const useCache = !process.argv.includes('--no-cache');
    
    const CACHE_DIR = '.cache';
    const CONTRIBUTOR_MAP_CACHE = path.join(CACHE_DIR, 'contributorMap.json');
    const METADATA_CACHE = path.join(CACHE_DIR, 'metadata.json');
    const DATE_MAP_CACHE = path.join(CACHE_DIR, 'dateMap.json');
    let metadata = {};

    await db.execute(sql`SELECT 1;`); console.log('DB connection successful.')
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm;`)
    await fs.mkdir(DATA_DIR, { recursive: true })
    await Promise.all(Object.values(REPOS).map(repo => cloneOrPull(repo.path, repo.url)))
    
    let cachedMap = null;
    let cachedMetadata = null;

    if (useCache && !isFullRebuild) {
      try {
        cachedMap = JSON.parse(await fs.readFile(CONTRIBUTOR_MAP_CACHE, 'utf-8'));
        cachedMetadata = JSON.parse(await fs.readFile(METADATA_CACHE, 'utf-8'));
        console.log('Successfully loaded contributor map and metadata from cache.');
      } catch {
        console.log('Contributor map or metadata cache not found. Will perform a full build.');
        cachedMap = null;
        cachedMetadata = null;
      }
    }

    const { contributorMap, latestMergedAt } = await buildFullContributorMap(cachedMap, cachedMetadata ? new Date(cachedMetadata.lastProcessedDate) : null);
    
    metadata = {
      lastProcessedDate: latestMergedAt ? latestMergedAt.toISOString() : cachedMetadata?.lastProcessedDate,
      titledbFilteredHash: cachedMetadata?.titledbFilteredHash
    };

    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(CONTRIBUTOR_MAP_CACHE, JSON.stringify(contributorMap, null, 2));
    await fs.writeFile(METADATA_CACHE, JSON.stringify(metadata));
    console.log('Contributor map and metadata have been built/updated and cached.');


    let dateMap;
    if (useCache && !isFullRebuild) {
      try {
        await fs.access(DATE_MAP_CACHE);
        console.log('Loading date map from cache...');
        const dateMapJson = JSON.parse(await fs.readFile(DATE_MAP_CACHE, 'utf-8'));
        dateMap = {};
        for (const type in dateMapJson) {
          dateMap[type] = {};
          for (const groupId in dateMapJson[type]) {
            dateMap[type][groupId] = new Date(dateMapJson[type][groupId]);
          }
        }
      } catch {
        console.log('Date map cache not found.');
        cachedMap = null;
      }
    }

        if (!useCache || !dateMap) {
      console.log('Building date map...');
      dateMap = await buildDateMap();
      dateMap.lastTitledbCommit = (await git.cwd(REPOS.titledb_filtered.path).log(['-n', '1'])).latest.hash;
      await fs.mkdir(CACHE_DIR, { recursive: true });
      await fs.writeFile(DATE_MAP_CACHE, JSON.stringify(dateMap));
      console.log('Date map has been built and cached.');
    }

    if (isFullRebuild) {
      console.log('Starting FULL database rebuild process...');
      await db.execute(sql`TRUNCATE TABLE games, performance_profiles, graphics_settings, youtube_links, game_groups RESTART IDENTITY CASCADE;`)
    }
    
    await syncDatabase(contributorMap, dateMap, metadata);
    await fs.writeFile(METADATA_CACHE, JSON.stringify(metadata));

  } catch (error) {
    console.error('An unexpected error occurred:', error)
    process.exit(1)
  } finally {
    await client.end()
    console.log('Database connection closed.')
  }
})()
