import fs from 'node:fs/promises';
import path from 'node:path';
import { sql, eq } from 'drizzle-orm';
import { simpleGit } from 'simple-git';
import { games, gameGroups, performanceProfiles, graphicsSettings, youtubeLinks } from '../../src/lib/db/schema.js';
import { DATA_SOURCES } from './config.js';
import { discoverDataSources, parseSizeToBytes, getBaseId } from './data-sources.js';

/**
 * The main database synchronization function.
 * Orchestrates the syncing of all data types.
 */
export async function syncDatabase(db, REPOS, contributorMap, dateMap, metadata) {
  console.log('Starting database synchronization...');

  // Discover all data sources, groups, title mappings, and data files
  const { allGroupIds, customGroupMap, mainGamesList, discoveredFiles } = await discoverDataSources(REPOS);

  // Ensure all game group parent rows exist in the database
  if (allGroupIds.size > 0) {
    console.log(`Ensuring ${allGroupIds.size} game groups exist...`);
    const groupsToInsert = Array.from(allGroupIds).map(id => ({ id }));
    await db.insert(gameGroups).values(groupsToInsert).onConflictDoNothing();
  }

  // Sync the base game data from titledb_filtered. This must happen before timestamping
  await syncBaseGameData(db, REPOS, mainGamesList, customGroupMap, metadata);

  // Sync the performance, graphics, and video data from nx-performance
  const affectedGroupIds = new Set();
  const groupLatestUpdate = new Map(); // Tracks the most recent update timestamp for each group

  for (const [type, config] of Object.entries(DATA_SOURCES)) {
    const filesToProcess = discoveredFiles[type] || [];
    await syncDataType({ db, REPOS, type, config, contributorMap, dateMap, affectedGroupIds, groupLatestUpdate, filesToProcess });
  }

  // Apply authoritative timestamps to all groups that were affected by the data sync
  if (groupLatestUpdate.size > 0) {
    console.log(`Updating timestamps for ${groupLatestUpdate.size} affected groups...`);
    const updatePromises = [];
    for (const [groupId, mostRecentDate] of groupLatestUpdate.entries()) {
      updatePromises.push(
        db.update(gameGroups).set({ lastUpdated: mostRecentDate }).where(eq(gameGroups.id, groupId)),
        db.update(games).set({ lastUpdated: mostRecentDate }).where(eq(games.groupId, groupId))
      );
    }
    await Promise.all(updatePromises);
  }

  console.log('Database synchronization complete.');
}

/**
 * A generic function to sync a specific data type (performance, graphics, videos)
 */
async function syncDataType(context) {
  const { db, REPOS, type, config, contributorMap, dateMap, affectedGroupIds, groupLatestUpdate, filesToProcess } = context;
  console.log(`- Syncing ${type}...`);

  const dataDir = path.join(REPOS.nx_performance.path, config.path);
  const dbRecords = await db.select().from(config.table);
  const localFileKeys = new Set();

  const dbRecordsMap = new Map(dbRecords.map(r => {
    const key = config.getKeyFromRecord(r);
    return [key, r];
  }));

  const processFile = async (groupId, fileName) => {
    const { key: fileKey, parts: keyParts } = config.getKey(groupId, { name: fileName });
    localFileKeys.add(fileKey);

    try {
      const lastUpdated = (type === 'performance' ? dateMap.performance?.[fileKey] : dateMap[type]?.[groupId]) || new Date();

      const dbRecord = dbRecordsMap.get(fileKey);
      const dbTimestamp = dbRecord?.lastUpdated || dbRecord?.submittedAt;
      const hasChanged = !dbRecord || (dbTimestamp && Math.floor(lastUpdated.getTime() / 1000) > Math.floor(dbTimestamp.getTime() / 1000));

      if (!hasChanged) return;

      const existingDate = groupLatestUpdate.get(groupId);
      if (!existingDate || lastUpdated > existingDate) {
        groupLatestUpdate.set(groupId, lastUpdated);
      }

      console.log(`Processing ${type} for ${fileKey}`);

      const filePath = config.isHierarchical ? path.join(dataDir, groupId, fileName) : path.join(dataDir, fileName);
      const content = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      const metadata = (type === 'performance') ? (contributorMap.performance?.[fileKey] || {}) : { contributors: contributorMap[type]?.[fileKey] || [] };
      const recordData = config.buildRecord(keyParts, content, metadata, lastUpdated);

      if (type === 'videos') {
        await config.upsert(db, recordData, groupId);
      } else {
        await config.upsert(db, recordData);
      }
      affectedGroupIds.add(groupId);
    } catch (error) {
      console.error(`[SKIPPING] Failed to process file '${fileName}' for group ${groupId}: ${error.message}`);
    }
  };
  
  const processingPromises = filesToProcess.map(({ groupId, fileName }) => processFile(groupId, fileName));
  await Promise.all(processingPromises);
  
  for (const [key, record] of dbRecordsMap.entries()) {
    if (!localFileKeys.has(key)) {
      console.log(`Deleting ${type} for ${key}`);
      const deleteCondition = (type === 'performance') ? eq(config.table.id, record.id) : eq(config.table.groupId, record.groupId);
      await db.delete(config.table).where(deleteCondition);
      
      const existingDate = groupLatestUpdate.get(record.groupId);
      const now = new Date();
      if (!existingDate || now > existingDate) {
        groupLatestUpdate.set(record.groupId, now);
      }
    }
  }
}

/**
 * Syncs the base game information from the titledb_filtered repository
 */
async function syncBaseGameData(db, REPOS, mainGamesList, customGroupMap, metadata) {
  console.log('Syncing base game data...');
  const titleIdDir = path.join(REPOS.titledb_filtered.path, 'output', 'titleid');
  const titledbRepoPath = REPOS.titledb_filtered.path;
  const git = simpleGit();
  const currentTitledbHash = (await git.cwd(titledbRepoPath).log(['-n', '1', '--pretty=format:%H'])).latest.hash;

  if (metadata.titledbFilteredHash === currentTitledbHash) {
    console.log(' -> titledb_filtered has not changed. Skipping game data sync.');
    return;
  }
  
  console.log(' -> Changes detected in titledb_filtered. Syncing all game records.');
  metadata.titledbFilteredHash = currentTitledbHash;
  
  const gamesToUpsert = [];
  for (const [id, names] of Object.entries(mainGamesList)) {
    if (!names || !Array.isArray(names) || names.length === 0) continue;
    let details = {};
    try {
      details = JSON.parse(await fs.readFile(path.join(titleIdDir, `${id}.json`), 'utf-8'));
    } catch (e) { /* ignore */ }
    const groupId = customGroupMap.get(id) || getBaseId(id);
    gamesToUpsert.push({
      id, groupId, names,
      publisher: details.publisher, releaseDate: details.releaseDate,
      sizeInBytes: parseSizeToBytes(details.size), iconUrl: details.iconUrl,
      bannerUrl: details.bannerUrl, screenshots: details.screenshots
    });
  }

  if (gamesToUpsert.length > 0) {
    console.log(`Upserting ${gamesToUpsert.length} game records...`);
    const batchSize = 500;
    for (let i = 0; i < gamesToUpsert.length; i += batchSize) {
      const batch = gamesToUpsert.slice(i, i + batchSize);
      await db.insert(games).values(batch).onConflictDoUpdate({
        target: games.id,
        set: {
          names: sql`excluded.names`, publisher: sql`excluded.publisher`,
          release_date: sql`excluded.release_date`, size_in_bytes: sql`excluded.size_in_bytes`,
          icon_url: sql`excluded.icon_url`, banner_url: sql`excluded.banner_url`,
          screenshots: sql`excluded.screenshots`, group_id: sql`excluded.group_id`,
        }
      });
    }
  }
}