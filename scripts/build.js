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
    for (const entry of entries) {
      const migrationPath = path.join('drizzle', `${entry.tag}.sql`);
      let migrationSql = await fs.readFile(migrationPath, 'utf-8');
      migrationSql = migrationSql.replace(/"public"\./g, `"${stagingSchema}".`);
      const statements = migrationSql.split('--> statement-breakpoint');
      for (const statement of statements) {
        const trimmed = statement.trim();
        if (trimmed.length > 0) await tx.unsafe(trimmed);
      }
    }
  });
}

async function setupExtensions(sqlClient) {
    console.log('Setting up persistent extensions schema...');
    await sqlClient`CREATE SCHEMA IF NOT EXISTS extensions`;
    const extensions = ['pg_trgm', 'unaccent'];
    for (const ext of extensions) {
        try {
            await sqlClient.unsafe(`CREATE EXTENSION IF NOT EXISTS "${ext}" SCHEMA extensions`);
        } catch (e) {
            try {
                await sqlClient.unsafe(`ALTER EXTENSION "${ext}" SET SCHEMA extensions`);
            } catch (moveError) {}
        }
    }
}

(async () => {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) process.exit(1);

  const sqlClient = postgres(connectionString, { ssl: 'require', max: 1 });

  try {
    const useCache = !process.argv.includes('--no-cache');
    console.log('--- Starting Zero-Downtime Build Process (Blue/Green) ---');
    
    await setupExtensions(sqlClient);

    const runId = Date.now();
    const stagingSchema = `staging_${runId}`;
    // using a unique backup name to prevent issues with cancelled builds
    const backupSchema = `backup_${runId}`;

    console.log(`Creating staging schema: ${stagingSchema}`);
    await sqlClient`CREATE SCHEMA IF NOT EXISTS ${sqlClient(stagingSchema)}`;
    
    const stagingClient = postgres(connectionString, { ssl: 'require', max: 1 });
    
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
      if ((new Date() - lastDate) / (1000 * 60 * 60) > 24) forceTitleRefresh = true;
    }

    const metadata = {
      lastProcessedDate: latestMergedAt ? latestMergedAt.toISOString() : cachedMetadata?.lastProcessedDate,
      titledbFilteredHash: forceTitleRefresh ? null : cachedMetadata?.titledbFilteredHash
    };

    if (process.argv.includes('--skip-data')) {
        console.log('⚠️ Skipping data sync.');
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
        const tableCountResult = await stagingClient`SELECT count(*) FROM information_schema.tables WHERE table_schema = ${stagingSchema}`;
        if (parseInt(tableCountResult[0].count) < 5) throw new Error(`Staging schema ${stagingSchema} incomplete. Aborting.`);
    }

    console.log('Granting permissions on staging tables...');
    await stagingClient.unsafe(`GRANT USAGE ON SCHEMA "${stagingSchema}" TO public`);
    await stagingClient.unsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "${stagingSchema}" TO public`);
    await stagingClient.unsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "${stagingSchema}" TO public`);

    await stagingClient.end();

    console.log('Performing atomic Schema Swap...');
    
    await sqlClient.begin(async (tx) => {
        await tx.unsafe(`CREATE SCHEMA IF NOT EXISTS public`);
        await tx.unsafe(`ALTER SCHEMA public RENAME TO "${backupSchema}"`);
        await tx.unsafe(`ALTER SCHEMA "${stagingSchema}" RENAME TO public`);
        await tx.unsafe(`GRANT USAGE ON SCHEMA public TO public`);
        await tx.unsafe(`GRANT CREATE ON SCHEMA public TO public`);
    });
    
    console.log('Swap complete.');
    
    try {
        const check = await sqlClient`SELECT count(*) FROM public.performance_profiles`;
        console.log(`Verification passed: public.performance_profiles has ${check[0].count} rows.`);
    } catch (e) {
        console.error('CRITICAL: Verification failed. The table is missing or inaccessible.');
        throw e;
    }
    
    console.log('Cleaning up old schemas...');
    
    const schemas = await sqlClient`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'staging_%' OR schema_name LIKE 'backup_%'
    `;

    for (const s of schemas) {
        const name = s.schema_name;
        if (name !== 'public' && name !== 'extensions' && name !== 'information_schema') {
            console.log(`Dropping old schema: ${name}`);
            await sqlClient.unsafe(`DROP SCHEMA IF EXISTS "${name}" CASCADE`);
        }
    }

  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  } finally {
    await sqlClient.end();
    console.log('Done.');
  }
})();