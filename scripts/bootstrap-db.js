import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
// The same DDL the sync pipeline uses for a layer, so there is one definition
// of what a layer holds rather than a copy here that drifts from it
import { ensurePhysicalTables, ensureSchemas } from '../src/lib/pipeline/schema-manager.js';
async function bootstrap() {
    const connectionString = process.env.POSTGRES_URL;
    if (!connectionString) {
        console.error('POSTGRES_URL is not set');
        process.exit(1);
    }
    const sql = postgres(connectionString, { max: 1 });
    const db = drizzle(sql);
    await sql.unsafe('CREATE SCHEMA IF NOT EXISTS layer_a');
    await sql.unsafe('CREATE SCHEMA IF NOT EXISTS layer_b');
    // Migrations run once, into public.
    //
    // They used to run three times, into layer_a, layer_b and public. That did
    // not work and could not: drizzle keeps its journal in a table that does
    // not move with search_path, so the second and third runs were silent
    // no-ops and public never got its tables - which is why /stats, /contribute
    // and /profile answered 500 with "relation data_requests does not exist"
    // while layer_a had them all along. Giving each run its own journal only
    // exposed the deeper reason: the migration creates three enums as
    // "public"."..." explicitly, so running it a second time collides on a type
    // that is shared by design.
    //
    // The layers never needed it. Their content tables are created by
    // ensurePhysicalTables and prepareStandbySchema in the sync pipeline, which
    // is what fills and swaps them. public is where the shared types and the
    // tables that are not swapped - users, submissions, favorites,
    // user_preferences, data_requests - belong.
    await sql.unsafe('SET search_path TO public');
    await migrate(db, { migrationsFolder: 'drizzle' });

    // Repairs a database migrated before this was sorted out: drizzle will not
    // re-run a migration it has already recorded, so the tables that belong only
    // in public are ensured explicitly rather than left to it
    await ensureSchemas(sql);

    // The layers need their content tables before the views below can point at
    // them. A first sync would create these anyway; doing it here means the
    // site answers instead of 500ing in the window before one has run
    await ensurePhysicalTables(sql, 'layer_a');
    await ensurePhysicalTables(sql, 'layer_b');

    await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS public.schema_state (
            id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
            active_schema TEXT NOT NULL DEFAULT 'layer_a',
            updated_at TIMESTAMPTZ DEFAULT now()
        )
    `);
    await sql.unsafe(`
        INSERT INTO public.schema_state (active_schema)
        VALUES ('layer_a')
        ON CONFLICT (id) DO NOTHING
    `);
    const views = [
        ['active_game_groups', 'game_groups'],
        ['active_games', 'games'],
        ['active_performance_data', 'performance_profiles'],
        ['active_graphics_settings', 'graphics_settings'],
        ['active_youtube_links', 'youtube_links']
    ];
    for (const [viewName, tableName] of views) {
        await sql.unsafe(`CREATE OR REPLACE VIEW public."${viewName}" AS SELECT * FROM "layer_a"."${tableName}"`);
    }
    await sql.end();
}
bootstrap().then(() => {
    console.log('Bootstrap complete: schemas, migrations and public views are in place.');
}).catch((error) => {
    // Printed, not swallowed. This script runs before a deploy, and a silent
    // exit(1) is how a half-applied schema reaches production looking fine
    console.error('Bootstrap failed:', error);
    process.exit(1);
});
