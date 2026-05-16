import fs from 'node:fs/promises';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { loadCache, saveCache } from '../pipeline/cache.js';
import { cloneOrPull, buildFullContributorMap, buildDateMapOptimized } from '../pipeline/git-api.js';
import { syncDatabase } from '../pipeline/db-sync.js';
import { ensureSchemas, getActiveSchema, getStandbySchema, prepareStandbySchema, swapSchemas } from '../pipeline/schema-manager.js';
import { setBuildStarted, setBuildPhase, setBuildComplete } from '../pipeline/build-status.js';
import { printBuildSummary } from '../pipeline/progress.js';

function extractPrNumber (url) {
  const m = url?.match(/\/pull\/(\d+)$/);
  return m ? Number(m[1]) : null;
}

function getPrNumbersFromMap (contributorMap) {
  const prNumbers = new Set();
  for (const entry of Object.values(contributorMap.performance || {})) {
    const n = extractPrNumber(entry.sourcePrUrl);
    if (n) prNumbers.add(n);
  }
  return Array.from(prNumbers);
}

async function promoteSubmissions (db, prNumbers) {
  if (prNumbers.length === 0) return;
  // Fallback if db does not support unsafe. Using the raw sql syntax.
  const result = await db.execute(sql`
    UPDATE public.submissions
    SET status = 'approved', data = '{}', updated_at = now()
    WHERE status = 'pending'
      AND github_pr_number = ANY(ARRAY[${sql.join(prNumbers, sql`, `)}]::int[])
  `);
  console.log(`[Build] Promoted submission(s) to approved.`);
}

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
        // Extension might already be in the correct schema
      }
    }
  }
}

/**
 * Run the unified build/sync pipeline.
 * @param {import('$lib/database/types').DatabaseAdapter} db
 */
export async function runPipeline(drizzleDb) {
  // If the passed db object exposes a native client, we can use it.
  // Otherwise we can create our own raw postgres client for schema commands.
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) throw new Error('POSTGRES_URL environment variable is required');
  
  const sqlClient = postgres(connectionString, { max: 1 });
  const buildStart = Date.now();
  const isFullRebuild = process.env.PIPELINE_FULL_REBUILD === 'true';
  const useCache = process.env.PIPELINE_NO_CACHE !== 'true' && !isFullRebuild;

  console.log(`--- Starting Data Sync Process (${isFullRebuild ? 'FULL REBUILD' : 'Incremental'}) ---`);

  try {
    // Phase 1: Setup
    await setupExtensions(sqlClient);
    await ensureSchemas(sqlClient);
    await setBuildStarted(sqlClient, 'setup');
    await fs.mkdir(DATA_DIR, { recursive: true });

    // Phase 2: Clone/pull repos
    await setBuildPhase(sqlClient, 'cloning');
    await Promise.all(Object.values(REPOS).map(repo => cloneOrPull(repo.path, repo.url)));

    // Phase 3: Build contributor/date maps
    await setBuildPhase(sqlClient, 'building-maps');
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

    // Phase 4: Sync data
    if (process.env.PIPELINE_SKIP_DATA === 'true') {
      console.log('⚠️ Skipping data sync.');
    } else if (isFullRebuild) {
      await setBuildPhase(sqlClient, 'preparing-standby');
      const activeSchema = await getActiveSchema(sqlClient);
      const standbySchema = await getStandbySchema(sqlClient);
      console.log(`Active: ${activeSchema} | Writing to standby: ${standbySchema}`);

      await prepareStandbySchema(sqlClient, standbySchema);

      await setBuildPhase(sqlClient, 'syncing-data');
      const dbInstance = drizzle(sqlClient);

      await dbInstance.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET search_path TO "${standbySchema}"`));
        await syncDatabase(tx, REPOS, contributorMap, dateMap, metadata, groupsChanged);
      });

      await setBuildPhase(sqlClient, 'swapping-schemas');
      await swapSchemas(sqlClient, standbySchema);
      console.log(`Schema swap complete: ${activeSchema} → ${standbySchema}`);

      await setBuildPhase(sqlClient, 'promoting-submissions');
      await promoteSubmissions(drizzleDb || dbInstance, getPrNumbersFromMap(contributorMap));

      printBuildSummary({
        mode: 'Full Rebuild',
        games: 0,
        profiles: 0,
        graphics: 0,
        videos: 0,
        schemaSwap: `${activeSchema} → ${standbySchema}`,
        duration: (Date.now() - buildStart) / 1000
      });
    } else {
      await setBuildPhase(sqlClient, 'syncing-data');
      const activeSchema = await getActiveSchema(sqlClient);
      console.log(`Incremental sync into active schema: ${activeSchema}`);

      const dbInstance = drizzle(sqlClient);

      await dbInstance.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET search_path TO "${activeSchema}"`));
        await syncDatabase(tx, REPOS, contributorMap, dateMap, metadata, groupsChanged);
      });

      await promoteSubmissions(drizzleDb || dbInstance, getPrNumbersFromMap(contributorMap));

      printBuildSummary({
        mode: 'Incremental',
        games: 0,
        profiles: 0,
        graphics: 0,
        videos: 0,
        duration: (Date.now() - buildStart) / 1000
      });
    }

    await saveCache(contributorMap, metadata);
    await setBuildComplete(sqlClient);
    
    return { success: true };
  } catch (error) {
    console.error('Build failed:', error);
    try { await setBuildComplete(sqlClient); } catch (e) {}
    throw error;
  } finally {
    await sqlClient.end();
  }
}
