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

async function applyMigrationsToStaging(client, stagingSchema) {
  const journalPath = path.join('drizzle', 'meta', '_journal.json');
  const journal = JSON.parse(await fs.readFile(journalPath, 'utf-8'));
  
  const entries = journal.entries.sort((a, b) => a.idx - b.idx);

  await client.begin(async (tx) => {
    await tx.unsafe(`SET search_path TO "${stagingSchema}"`);
    
    const res = await tx`SHOW search_path`;
    console.log(`[Migration] search_path is set to: ${res[0].search_path}`);

    for (const entry of entries) {
      const migrationPath = path.join('drizzle', `${entry.tag}.sql`);
      let migrationSql = await fs.readFile(migrationPath, 'utf-8');

      migrationSql = migrationSql.replace(/"public"\./g, `"${stagingSchema}".`);
      
      const statements = migrationSql.split('--> statement-breakpoint');

      console.log(`Applying migration ${entry.tag} (${statements.length} statements)...`);

      for (const statement of statements) {
        const trimmed = statement.trim();
        if (trimmed.length > 0) {
          try {
            await tx.unsafe(trimmed);
          } catch (e) {
            console.error(`Failed to execute statement in ${entry.tag}:`);
            console.error(trimmed);
            throw e;
          }
        }
      }
    }
  });
}

(async () => {
  const connectionString = process.env.POSTGRES_URL;
  
  if (!connectionString) {
    console.error('Error: POSTGRES_URL environment variable is missing.');
    process.exit(1);
  }

  const sqlClient = postgres(connectionString, { ssl: 'require', max: 1 });

  try {
    const useCache = !process.argv.includes('--no-cache');
    
    console.log('--- Starting Zero-Downtime Build Process ---');
    
    const stagingSchema = `staging_${Date.now()}`;
    console.log(`Creating staging schema: ${stagingSchema}`);
    await sqlClient`CREATE SCHEMA IF NOT EXISTS ${sqlClient(stagingSchema)}`;
    
    const stagingClient = postgres(connectionString, { 
      ssl: 'require', 
      max: 1
    });
    
    console.log('Applying database migrations to staging...');
    await applyMigrationsToStaging(stagingClient, stagingSchema);

    await fs.mkdir(DATA_DIR, { recursive: true });
    await Promise.all(Object.values(REPOS).map(repo => cloneOrPull(repo.path, repo.url)));

    const { cachedMap, cachedMetadata } = await loadCache(useCache);
    const { contributorMap, latestMergedAt, groupsChanged } = await buildFullContributorMap(cachedMap, cachedMetadata ? new Date(cachedMetadata.lastProcessedDate) : null);
    const dateMap = await buildDateMapOptimized(REPOS.nx_performance.path);

    let forceTitleRefresh = false;
    if (cachedMetadata?.lastProcessedDate) {
      const lastDate = new Date(cachedMetadata.lastProcessedDate);
      const hoursSinceLastUpdate = (new Date() - lastDate) / (1000 * 60 * 60);
      if (hoursSinceLastUpdate > 24) {
        console.log('Last update was over 24 hours ago. Forcing title database refresh.');
        forceTitleRefresh = true;
      }
    }

    const metadata = {
      lastProcessedDate: latestMergedAt ? latestMergedAt.toISOString() : cachedMetadata?.lastProcessedDate,
      titledbFilteredHash: forceTitleRefresh ? null : cachedMetadata?.titledbFilteredHash
    };

    if (process.argv.includes('--skip-data')) {
        console.log('⚠️ Skipping data sync (--skip-data flag detected). Staging DB will be empty!');
    } else {
        console.log(`Syncing data into ${stagingSchema}...`);
        
        const db = drizzle(stagingClient);

        await db.transaction(async (tx) => {
            await tx.execute(sql.raw(`SET search_path TO "${stagingSchema}"`));
            await syncDatabase(tx, REPOS, contributorMap, dateMap, metadata, groupsChanged);
        });
    }

    await saveCache(contributorMap, metadata);
    
    if (!process.argv.includes('--skip-data')) {
        const tableCountResult = await stagingClient`
            SELECT count(*) 
            FROM information_schema.tables 
            WHERE table_schema = ${stagingSchema}
        `;
        const tableCount = parseInt(tableCountResult[0].count);
        console.log(`[Safety Check] Tables in ${stagingSchema}: ${tableCount}`);

        if (tableCount < 5) {
            throw new Error(`[Safety Check Failed] Staging schema ${stagingSchema} has too few tables (${tableCount}). Aborting swap.`);
        }
    }

    await stagingClient.end();

    console.log('Performing atomic schema swap (Blue/Green deployment)...');
    await sqlClient.begin(async (tx) => {
      await tx`CREATE SCHEMA IF NOT EXISTS public`;
      await tx`DROP SCHEMA IF EXISTS public_backup CASCADE`;
      await tx`ALTER SCHEMA public RENAME TO public_backup`;
      await tx`ALTER SCHEMA ${sqlClient(stagingSchema)} RENAME TO public`;
    });
    
    console.log('Swap complete. Live site is now serving new data.');
    
    console.log('Cleaning up backup schema...');
    await sqlClient`DROP SCHEMA IF EXISTS public_backup CASCADE`;

  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  } finally {
    await sqlClient.end();
    console.log('Done.');
  }
})();