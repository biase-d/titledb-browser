import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql } from 'drizzle-orm'

import { loadCache, saveCache } from './lib/cache.js'
import { cloneOrPull, buildFullContributorMap, buildDateMapOptimized } from './lib/git-api.js'
import { syncDatabase } from './lib/db-sync.js'
import { ensureSchemas, getActiveSchema, getStandbySchema, prepareStandbySchema, swapSchemas } from './lib/schema-manager.js'
import { setBuildStarted, setBuildPhase, setBuildComplete } from './lib/build-status.js'
import { printBuildSummary } from './lib/progress.js'

const DATA_DIR = 'data'
const REPOS = {
  nx_performance: { url: 'https://github.com/biase-d/nx-performance.git', path: path.join(DATA_DIR, 'nx-performance') },
  titledb_filtered: { url: 'https://github.com/masagrator/titledb_filtered.git', path: path.join(DATA_DIR, 'titledb_filtered') }
}

async function setupExtensions(sqlClient) {
  console.log('Setting up extensions...')
  await sqlClient`CREATE SCHEMA IF NOT EXISTS extensions`

  const extensions = ['pg_trgm', 'unaccent']
  for (const ext of extensions) {
    try {
      await sqlClient.unsafe(`CREATE EXTENSION IF NOT EXISTS "${ext}" SCHEMA extensions`)
    } catch (e) {
      try {
        await sqlClient.unsafe(`ALTER EXTENSION "${ext}" SET SCHEMA extensions`)
      } catch (moveError) {
        // Extension might already be in the correct schema
      }
    }
  }
}

; (async () => {
  const buildStart = Date.now()
  const connectionString = process.env.POSTGRES_URL
  if (!connectionString) process.exit(1)

  const sqlClient = postgres(connectionString, { max: 1 })
  const isFullRebuild = process.argv.includes('--full-rebuild')
  const useCache = !process.argv.includes('--no-cache') && !isFullRebuild

  console.log(`--- Starting Data Sync Process (${isFullRebuild ? 'FULL REBUILD' : 'Incremental'}) ---`)

  try {
    // Phase 1: Setup
    await setupExtensions(sqlClient)
    await ensureSchemas(sqlClient)
    await setBuildStarted(sqlClient, 'setup')
    await fs.mkdir(DATA_DIR, { recursive: true })

    // Phase 2: Clone/pull repos
    await setBuildPhase(sqlClient, 'cloning')
    await Promise.all(Object.values(REPOS).map(repo => cloneOrPull(repo.path, repo.url)))

    // Phase 3: Build contributor/date maps
    await setBuildPhase(sqlClient, 'building-maps')
    const { cachedMap, cachedMetadata } = await loadCache(useCache)

    const { contributorMap, latestMergedAt, groupsChanged } = await buildFullContributorMap(
      cachedMap,
      cachedMetadata ? new Date(cachedMetadata.lastProcessedDate) : null
    )

    const dateMap = await buildDateMapOptimized(REPOS.nx_performance.path)

    let forceTitleRefresh = false
    if (cachedMetadata?.lastProcessedDate) {
      const lastDate = new Date(cachedMetadata.lastProcessedDate)
      if ((new Date() - lastDate) / (1000 * 60 * 60) > 24) forceTitleRefresh = true
    }

    const metadata = {
      lastProcessedDate: latestMergedAt ? latestMergedAt.toISOString() : cachedMetadata?.lastProcessedDate,
      titledbFilteredHash: forceTitleRefresh ? null : cachedMetadata?.titledbFilteredHash
    }

    // Phase 4: Sync data
    if (process.argv.includes('--skip-data')) {
      console.log('⚠️ Skipping data sync.')
    } else if (isFullRebuild) {
      // Blue-green: write to standby, then swap
      await setBuildPhase(sqlClient, 'preparing-standby')
      const activeSchema = await getActiveSchema(sqlClient)
      const standbySchema = await getStandbySchema(sqlClient)
      console.log(`Active: ${activeSchema} | Writing to standby: ${standbySchema}`)

      await prepareStandbySchema(sqlClient, standbySchema)

      await setBuildPhase(sqlClient, 'syncing-data')
      const db = drizzle(sqlClient)

      await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET search_path TO "${standbySchema}"`))

        await syncDatabase(tx, REPOS, contributorMap, dateMap, metadata, groupsChanged)
      })

      // Atomic swap
      await setBuildPhase(sqlClient, 'swapping-schemas')
      await swapSchemas(sqlClient, standbySchema)

      console.log(`Schema swap complete: ${activeSchema} → ${standbySchema}`)

      printBuildSummary({
        mode: 'Full Rebuild',
        games: 0, // TODO: track counts in syncDatabase
        profiles: 0,
        graphics: 0,
        videos: 0,
        schemaSwap: `${activeSchema} → ${standbySchema}`,
        duration: (Date.now() - buildStart) / 1000
      })
    } else {
      // Incremental: write directly to active schema
      await setBuildPhase(sqlClient, 'syncing-data')
      const activeSchema = await getActiveSchema(sqlClient)
      console.log(`Incremental sync into active schema: ${activeSchema}`)

      const db = drizzle(sqlClient)

      await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET search_path TO "${activeSchema}"`))

        await syncDatabase(tx, REPOS, contributorMap, dateMap, metadata, groupsChanged)
      })

      printBuildSummary({
        mode: 'Incremental',
        games: 0,
        profiles: 0,
        graphics: 0,
        videos: 0,
        duration: (Date.now() - buildStart) / 1000
      })
    }

    await saveCache(contributorMap, metadata)
    await setBuildComplete(sqlClient)

  } catch (error) {
    console.error('Build failed:', error)
    // Mark build as failed, but leave phase for diagnosis
    try {
      await setBuildComplete(sqlClient)
    } catch (e) {
      // Ignore - DB might be unreachable
    }
    process.exit(1)
  } finally {
    await sqlClient.end()
    console.log('Done.')
  }
})()