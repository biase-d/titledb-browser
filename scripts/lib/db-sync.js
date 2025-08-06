import fs from 'node:fs/promises';
import path from 'node:path';
import { sql, inArray, eq } from 'drizzle-orm';
import { simpleGit } from 'simple-git';
import { games, gameGroups, performanceProfiles, graphicsSettings, youtubeLinks } from '../../src/lib/db/schema.js';
import { DATA_SOURCES } from './config.js';
import { discoverDataSources, parseSizeToBytes } from './data-sources.js';

// Helper function, as it's used in this module
function getBaseId(titleId) { return titleId.substring(0, 13) + '000'; }

/**
 * The main database synchronization function
 * Orchestrates the syncing of all data types
 */
export async function syncDatabase(db, REPOS, contributorMap, dateMap, metadata) {
  console.log('Starting database synchronization...');

  // Discover all data sources and mappings
  const { allGroupIds, customGroupMap, mainGamesList } = await discoverDataSources(REPOS);

  // Ensure all game groups exist in the database
  if (allGroupIds.size > 0) {
    console.log(`Ensuring ${allGroupIds.size} game groups exist...`);
    const groupsToInsert = Array.from(allGroupIds).map(id => ({ id }));
    await db.insert(gameGroups).values(groupsToInsert).onConflictDoNothing();
  }

  // Sync each data type defined in the config
  // The syncDataType function will now also handle timestamp updates internally
  const affectedGroupIds = new Set();
  for (const [type, config] of Object.entries(DATA_SOURCES)) {
    await syncDataType({ db, REPOS, type, config, contributorMap, dateMap, affectedGroupIds });
  }

  // Sync the base game data from titledb_filtered
  await syncBaseGameData(db, REPOS, mainGamesList, customGroupMap, metadata);
  
  console.log('Database synchronization complete.');
}

/**
 * A generic function to sync a specific data type
 */
async function syncDataType(context) {
  const { db, REPOS, type, config, contributorMap, dateMap, affectedGroupIds } = context;
  console.log(`- Syncing ${type}...`);

  const dataDir = path.join(REPOS.nx_performance.path, config.path);
  const dbRecords = await db.select().from(config.table);
  const localFileKeys = new Set();

  const dbRecordsMap = new Map(dbRecords.map(r => {
    const key = (type === 'performance') ? `${r.groupId}-${r.gameVersion}-${r.suffix || ''}` : r.groupId;
    return [key, r];
  }));

  const files = await fs.readdir(dataDir, { withFileTypes: true }).catch(() => []);
  for (const file of files) {
    if (config.isHierarchical && file.isDirectory()) {
      const groupId = file.name;
      const subFiles = await fs.readdir(path.join(dataDir, groupId)).catch(() => []);
      for (const subFile of subFiles) {
        if (path.extname(subFile) !== '.json') continue;
        const fileKey = config.getKey(groupId, { name: subFile });
        localFileKeys.add(fileKey);

        const lastUpdated = dateMap.performance?.[fileKey]; // DO NOT FALLBACK
        if (!lastUpdated) {
            console.warn(`Could not find date for performance key: ${fileKey}. Skipping timestamp update.`);
            continue; // Skip processing if we don't have a valid date
        }
        const dbRecord = dbRecordsMap.get(fileKey);
        const hasChanged = !dbRecord || Math.floor(lastUpdated.getTime() / 1000) > Math.floor(dbRecord.lastUpdated.getTime() / 1000);

        if (hasChanged) {
          console.log(`Processing ${type} for ${fileKey}`);
          const content = JSON.parse(await fs.readFile(path.join(dataDir, groupId, subFile), 'utf-8'));
          const metadata = contributorMap.performance?.[fileKey] || {};
          const recordData = config.buildRecord(fileKey.split('-'), content, metadata);
          recordData.lastUpdated = lastUpdated;

          if (dbRecord) {
            await db.update(config.table).set(recordData).where(eq(config.table.id, dbRecord.id));
          } else {
            await db.insert(config.table).values(recordData);
          }
          affectedGroupIds.add(groupId);
          // Update parent table timestamps immediately
          await db.update(gameGroups).set({ lastUpdated }).where(eq(gameGroups.id, groupId));
          await db.update(games).set({ lastUpdated }).where(eq(games.groupId, groupId));
        }
      }
    } else if (!config.isHierarchical && path.extname(file.name) === '.json') {
      const groupId = path.basename(file.name, '.json');
      const fileKey = config.getKey(groupId, file);
      localFileKeys.add(fileKey);

      const lastUpdated = dateMap[type]?.[fileKey];
      if (!lastUpdated) {
          console.warn(`Could not find date for ${type} key: ${fileKey}. Skipping timestamp update.`);
          continue; // Skip processing if we don't have a valid date
      }
      const dbRecord = dbRecordsMap.get(fileKey);
      const dbTimestamp = dbRecord?.lastUpdated || dbRecord?.submittedAt;
      const hasChanged = !dbRecord || (dbTimestamp && Math.floor(lastUpdated.getTime() / 1000) > Math.floor(dbTimestamp.getTime() / 1000));
      
      if (hasChanged) {
        console.log(`Processing ${type} for ${fileKey}`);
        const content = JSON.parse(await fs.readFile(path.join(dataDir, file.name), 'utf-8'));
        const metadata = { contributors: contributorMap[type]?.[fileKey] || [] };
        const recordData = config.buildRecord([fileKey], content, metadata);
        
        if (type === 'videos') {
          await db.delete(youtubeLinks).where(eq(youtubeLinks.groupId, groupId));
          if (Array.isArray(recordData) && recordData.length > 0) {
            const linksToInsert = recordData.map(r => ({ ...r, submittedAt: lastUpdated }));
            await db.insert(youtubeLinks).values(linksToInsert);
          }
        } else { // Graphics
          recordData.lastUpdated = lastUpdated;
          await db.insert(config.table).values(recordData).onConflictDoUpdate({
            target: config.table.groupId,
            set: { settings: sql`excluded.settings`, contributor: sql`excluded.contributor`, lastUpdated: sql`excluded.last_updated` }
          });
        }
        affectedGroupIds.add(groupId);
        // Update parent table timestamps immediately
        await db.update(gameGroups).set({ lastUpdated }).where(eq(gameGroups.id, groupId));
        await db.update(games).set({ lastUpdated }).where(eq(games.groupId, groupId));
      }
    }
  }

  for (const [key, record] of dbRecordsMap.entries()) {
    if (!localFileKeys.has(key)) {
      console.log(`Deleting ${type} for ${key}`);
      const deleteCondition = (type === 'performance') ? eq(config.table.id, record.id) : eq(config.table.groupId, record.groupId);
      await db.delete(config.table).where(deleteCondition);
      affectedGroupIds.add(record.groupId);
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