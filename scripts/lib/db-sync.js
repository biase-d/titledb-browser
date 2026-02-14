import fs from 'node:fs/promises';
import path from 'node:path';
import { sql, eq } from 'drizzle-orm';
import { simpleGit } from 'simple-git';
import { games, gameGroups, youtubeLinks, dataRequests } from '../../src/lib/db/schema.js';
import { DATA_SOURCES } from './config.js';
import { discoverDataSources, parseSizeToBytes, getBaseId } from './data-sources.js';

/**
 * The main database synchronization function.
 * Orchestrates the syncing of all data types.
 */
export async function syncDatabase(db, REPOS, contributorMap, dateMap, metadata) {
  console.log('Starting database synchronization...');

  // Discover all data sources, groups, title mappings, and data files
  const { allGroupIds, mainGamesList, regionsList, discoveredFiles } = await discoverDataSources(REPOS);

  // Ensure all game group parent rows exist in the database
  if (allGroupIds.size > 0) {
    console.log(`Ensuring ${allGroupIds.size} game groups exist...`);
    const groupsToInsert = Array.from(allGroupIds).map(id => ({ id }));
    await db.insert(gameGroups).values(groupsToInsert).onConflictDoNothing();
  }

  // Sync the base game data from titledb_filtered
  await syncBaseGameData(db, REPOS, mainGamesList, regionsList, metadata);

  // Sync the performance, graphics, video, and group data from nx-performance
  const affectedGroupIds = new Set();
  const groupLatestUpdate = new Map();

  for (const [type, config] of Object.entries(DATA_SOURCES)) {
    const filesToProcess = discoveredFiles[type] || [];
    await syncDataType({ db, REPOS, type, config, contributorMap, dateMap, affectedGroupIds, groupLatestUpdate, filesToProcess });
  }

  await syncDataRequests(db, REPOS);

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
 * Reads the requests.json backup and restores votes to the DB
 */
async function syncDataRequests(db, REPOS) {
  const requestsPath = path.join(REPOS.nx_performance.path, 'meta', 'requests.json');

  try {
    const fileContent = await fs.readFile(requestsPath, 'utf-8');
    const requests = JSON.parse(fileContent);

    if (Array.isArray(requests) && requests.length > 0) {
      console.log(`Restoring ${requests.length} data requests (votes)...`);

      await db.insert(dataRequests)
        .values(requests)
        .onConflictDoNothing();
    }
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.log('No requests backup found (meta/requests.json). Skipping restore.');
    } else {
      console.warn(`Failed to restore data requests: ${e.message}`);
    }
  }
}

/**
 * A generic function to sync a specific data type (performance, graphics, videos, groups)
 */
async function syncDataType(context) {
  const { db, REPOS, type, config, contributorMap, dateMap, affectedGroupIds, groupLatestUpdate, filesToProcess } = context;
  console.log(`- Syncing ${type}...`);

  const dataDir = path.join(REPOS.nx_performance.path, config.path);
  const dbRecords = type === 'groups' ? [] : await db.select().from(config.table);
  const localFileKeys = new Set();
  const recordsToUpsert = [];

  const dbRecordsMap = new Map(dbRecords.map(r => [config.getKeyFromRecord(r), r]));

  for (const { groupId, fileName } of filesToProcess) {
    const { key: fileKey, parts: keyParts } = config.getKey(groupId, { name: fileName });
    localFileKeys.add(fileKey);

    try {
      const lastUpdated = (type === 'performance' ? dateMap.performance?.[fileKey] : dateMap[type]?.[groupId]) || new Date();
      const dbRecord = dbRecordsMap.get(fileKey);

      const dbTimestamp = dbRecord?.lastUpdated || dbRecord?.submittedAt;
      const hasChanged = type === 'groups' || !dbRecord || (dbTimestamp && Math.floor(lastUpdated.getTime() / 1000) > Math.floor(dbTimestamp.getTime() / 1000));

      if (!hasChanged) continue;

      const filePath = config.isHierarchical ? path.join(dataDir, groupId, fileName) : path.join(dataDir, fileName);
      const content = JSON.parse(await fs.readFile(filePath, 'utf-8'));

      if (type === 'performance') {
        const contentKeys = Object.keys(content);
        const isPlaceholder = contentKeys.length === 1 && contentKeys[0] === 'contributor';
        if (isPlaceholder) {
          console.log(`Skipping timestamp update for placeholder profile: ${fileKey}`);
        } else {
          const existingDate = groupLatestUpdate.get(groupId);
          if (!existingDate || lastUpdated > existingDate) {
            groupLatestUpdate.set(groupId, lastUpdated);
          }
        }
      } else if (type !== 'groups') {
        const existingDate = groupLatestUpdate.get(groupId);
        if (!existingDate || lastUpdated > existingDate) {
          groupLatestUpdate.set(groupId, lastUpdated);
        }
      }

      console.log(`Processing ${type} for ${fileKey}`);

      const metadata = (type === 'performance') ? (contributorMap.performance?.[fileKey] || {}) : { contributors: contributorMap[type]?.[fileKey] || [] };
      const recordData = config.buildRecord(keyParts, content, metadata, lastUpdated);

      if (Array.isArray(recordData)) {
        recordsToUpsert.push(...recordData);
      } else {
        recordsToUpsert.push(recordData);
      }
      affectedGroupIds.add(groupId);
    } catch (error) {
      console.error(`[SKIPPING] Failed to process file '${fileName}' for group ${groupId}: ${error.message}`);
    }
  }

  if (recordsToUpsert.length > 0) {
    console.log(`Upserting ${recordsToUpsert.length} ${type} record(s)...`);
    if (type === 'videos') {
      const recordsByGroup = recordsToUpsert.reduce((acc, record) => {
        if (!acc[record.groupId]) acc[record.groupId] = [];
        acc[record.groupId].push(record);
        return acc;
      }, {});
      for (const [groupId, groupRecords] of Object.entries(recordsByGroup)) {
        await config.upsert(db, groupRecords, groupId);
      }
    } else if (type === 'groups') {
      for (const record of recordsToUpsert) {
        await config.upsert(db, record);
      }
    } else {
      await config.upsert(db, recordsToUpsert);
    }
  }

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

  if (type === 'groups') {
    const allCustomGroupIdsInDb = (await db.selectDistinct({ groupId: games.groupId }).from(games).where(sql`${games.groupId} != substring(${games.id}, 1, 13) || '000'`)).map(g => g.groupId);

    for (const customGroupId of allCustomGroupIdsInDb) {
      if (!localFileKeys.has(customGroupId)) {
        console.log(`Deleting group for ${customGroupId} (reverting members)...`);
        await db.update(games)
          .set({ groupId: sql`substring(${games.id}, 1, 13) || '000'` })
          .where(eq(games.groupId, customGroupId));
      }
    }
  }
}

/**
 * Syncs the base game information from the titledb_filtered repository
 */
async function syncBaseGameData(db, REPOS, mainGamesList, regionsList, metadata) {
  console.log('Syncing base game data...');
  const titleIdDir = path.join(REPOS.titledb_filtered.path, 'output', 'titleid');
  const titledbRepoPath = REPOS.titledb_filtered.path;
  const git = simpleGit();

  const currentTitledbHash = (await git.cwd(titledbRepoPath).log(['-n', '1', '--pretty=format:%H'])).latest.hash;
  metadata.titledbFilteredHash = currentTitledbHash;

  const gamesToUpsert = [];
  for (const [id, names] of Object.entries(mainGamesList)) {
    if (!names || !Array.isArray(names) || names.length === 0) continue;
    let details = {};
    try {
      details = JSON.parse(await fs.readFile(path.join(titleIdDir, `${id}.json`), 'utf-8'));
    } catch (e) { /* ignore */ }

    const groupId = getBaseId(id);
    const regions = regionsList[id] || [];

    gamesToUpsert.push({
      id, groupId, names, regions,
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
          names: sql`excluded.names`,
          regions: sql`excluded.regions`,
          publisher: sql`COALESCE(excluded.publisher, games.publisher)`,
          release_date: sql`COALESCE(excluded.release_date, games.release_date)`,
          size_in_bytes: sql`COALESCE(excluded.size_in_bytes, games.size_in_bytes)`,
          icon_url: sql`COALESCE(excluded.icon_url, games.icon_url)`,
          banner_url: sql`COALESCE(excluded.banner_url, games.banner_url)`,
          screenshots: sql`COALESCE(excluded.screenshots, games.screenshots)`,
          group_id: sql`excluded.group_id`,
        }
      });
    }
  }
}