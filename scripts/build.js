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

async function applyMigrations(client, targetSchema) {
  const journalPath = path.join('drizzle', 'meta', '_journal.json');
  const journal = JSON.parse(await fs.readFile(journalPath, 'utf-8'));
  const entries = journal.entries.sort((a, b) => a.idx - b.idx);

  await client.begin(async (tx) => {
    await tx.unsafe(`CREATE SCHEMA IF NOT EXISTS "${targetSchema}"`);
    await tx.unsafe(`SET search_path TO "${targetSchema}"`);
    
    for (const entry of entries) {
      const migrationPath = path.join('drizzle', `${entry.tag}.sql`);
      let migrationSql = await fs.readFile(migrationPath, 'utf-8');
      
      if (targetSchema !== 'public') {
          migrationSql = migrationSql.replace(/"public"\./g, `"${targetSchema}".`);
      }

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
    console.log('--- Starting Zero-Downtime Build Process (Truncate Strategy) ---');
    
    await setupExtensions(sqlClient);

    console.log('Ensuring public schema structure is up to date...');
    await applyMigrations(sqlClient, 'public');

    const stagingSchema = `staging_${Date.now()}`;
    console.log(`Creating staging schema: ${stagingSchema}`);

    const stagingClient = postgres(connectionString, { ssl: 'require', max: 1 });
    await applyMigrations(stagingClient, stagingSchema);
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
    await stagingClient.end();

    console.log('Performing atomic Data Copy (Truncate & Fill)...');
    
    await sqlClient.begin(async (tx) => {
        const tables = [
            'game_groups',          
            'games',                
            'performance_profiles', 
            'graphics_settings',    
            'youtube_links',        
            'data_requests'         
        ];
        

        console.log('  > Truncating public tables...');
        for (const table of tables) {
            await tx.unsafe(`TRUNCATE TABLE public."${table}" RESTART IDENTITY CASCADE`);
        }

        console.log('  > Copying data from staging...');
        for (const table of tables) {
            await tx.unsafe(`INSERT INTO public."${table}" SELECT * FROM "${stagingSchema}"."${table}"`);
            

            try {
                await tx.unsafe(`
                    DO $$
                    DECLARE
                        seq_name text;
                    BEGIN
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${table}' AND column_name = 'id') THEN
                            seq_name := pg_get_serial_sequence('public."${table}"', 'id');
                            IF seq_name IS NOT NULL THEN
                                EXECUTE 'SELECT setval(''' || seq_name || ''', COALESCE(MAX(id), 1)) FROM public."${table}"';
                            END IF;
                        END IF;
                    END $$;
                `);
            } catch (seqError) {
                console.warn(`    Warning: Could not reset sequence for ${table} (might not have one).`);
            }
        }
    });
    
    console.log('Swap complete.');
    
    console.log(`Cleaning up staging schema ${stagingSchema}...`);
    await sqlClient`DROP SCHEMA IF EXISTS ${sqlClient(stagingSchema)} CASCADE`;

  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  } finally {
    await sqlClient.end();
    console.log('Done.');
  }
})();