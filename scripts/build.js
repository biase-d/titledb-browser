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

(async () => {
  const client = postgres(process.env.POSTGRES_URL, { ssl: 'require' });
  const db = drizzle(client);

  try {
    const isFullRebuild = process.argv.includes('--full-rebuild');
    const useCache = !process.argv.includes('--no-cache');

    await db.execute(sql`SELECT 1;`);
    console.log('DB connection successful.');
    
    await fs.mkdir(DATA_DIR, { recursive: true });
    await Promise.all(Object.values(REPOS).map(repo => cloneOrPull(repo.path, repo.url)));

    const { cachedMap, cachedMetadata } = await loadCache(useCache && !isFullRebuild);

    const { contributorMap, latestMergedAt } = await buildFullContributorMap(cachedMap, cachedMetadata ? new Date(cachedMetadata.lastProcessedDate) : null);
    
    const dateMap = await buildDateMapOptimized(REPOS.nx_performance.path);
    
    const metadata = {
      lastProcessedDate: latestMergedAt ? latestMergedAt.toISOString() : cachedMetadata?.lastProcessedDate,
      titledbFilteredHash: cachedMetadata?.titledbFilteredHash
    };

    if (isFullRebuild) {
      console.log('Starting FULL database rebuild process...');
      // TRUNCATE is only necessary for a full rebuild to clear old data
      await db.execute(sql`TRUNCATE TABLE games, performance_profiles, graphics_settings, youtube_links, game_groups RESTART IDENTITY CASCADE;`);
    }
    
    await syncDatabase(db, REPOS, contributorMap, dateMap, metadata);
    
    await saveCache(contributorMap, metadata);

  } catch (error) {
    console.error('An unexpected error occurred:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
})();