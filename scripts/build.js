import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

import { loadCache, saveCache } from './lib/cache.js';
import { cloneOrPull, buildFullContributorMap, buildDateMapOptimized } from './lib/git-api.js';
import { syncDatabase } from './lib/db-sync.js';

const DATA_DIR = 'data';
const REPOS = {
  nx_performance: { url: 'https://github.com/biase-d/nx-performance.git', path: path.join(DATA_DIR, 'nx-performance') },
  titledb_filtered: { url: 'https://github.com/masagrator/titledb_filtered.git', path: path.join(DATA_DIR, 'titledb_filtered') }
};

async function setupExtensions(sqlClient) {
  console.log('Setting up extensions...');
  await sqlClient`CREATE SCHEMA IF NOT EXISTS extensions`;

  const extensions = ['pg_trgm', 'unaccent'];
  for (const ext of extensions) {
    try {
      await sqlClient.unsafe(`CREATE EXTENSION IF NOT EXISTS "${ext}" SCHEMA extensions`);
    } catch (e) {
      try {
        await sqlClient.unsafe(`ALTER EXTENSION "${ext}" SET SCHEMA extensions`);
      } catch (moveError) {
      }
    }
  }
}

(async () => {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) process.exit(1);

  const sqlClient = postgres(connectionString, { max: 1 });
  const db = drizzle(sqlClient);

  try {
    const isFullRebuild = process.argv.includes('--full-rebuild');
    const useCache = !process.argv.includes('--no-cache') && !isFullRebuild;

    console.log(`--- Starting Data Sync Process (${isFullRebuild ? 'FULL REBUILD' : 'Incremental'}) ---`);

    await setupExtensions(sqlClient);
    await fs.mkdir(DATA_DIR, { recursive: true });
    await Promise.all(Object.values(REPOS).map(repo => cloneOrPull(repo.path, repo.url)));

    const { cachedMap, cachedMetadata } = await loadCache(useCache);

    const { contributorMap, latestMergedAt, groupsChanged } = await buildFullContributorMap(
      cachedMap,
      cachedMetadata ? new Date(cachedMetadata.lastProcessedDate) : null
    );

    const dateMap = await buildDateMapOptimized(REPOS.nx_performance.path);

    let forceTitleRefresh = false;
    if (cachedMetadata?.lastProcessedDate) {
      const lastDate = new Date(cachedMetadata.lastProcessedDate);
      if ((new Date() - lastDate) / (1000 * 60 * 60) > 24) forceTitleRefresh = true;
    }

    const metadata = {
      lastProcessedDate: latestMergedAt ? latestMergedAt.toISOString() : cachedMetadata?.lastProcessedDate,
      titledbFilteredHash: forceTitleRefresh ? null : cachedMetadata?.titledbFilteredHash
    };

    if (process.argv.includes('--skip-data')) {
      console.log('⚠️ Skipping data sync.');
    } else {
      console.log('Syncing data into public schema...');

      await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET search_path TO "public"`));

        if (isFullRebuild) {
          console.log('Full Rebuild: Truncating all data tables...');
          await tx.execute(sql.raw(`
                    TRUNCATE TABLE 
                        "game_groups", 
                        "games", 
                        "performance_profiles", 
                        "graphics_settings", 
                        "youtube_links", 
                        "data_requests" 
                    RESTART IDENTITY CASCADE
                `));
          console.log('   Tables truncated. Starting fresh insert...');
        }

        await syncDatabase(tx, REPOS, contributorMap, dateMap, metadata, groupsChanged);
      });
    }

    await saveCache(contributorMap, metadata);

  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  } finally {
    await sqlClient.end();
    console.log('Done.');
  }
})();