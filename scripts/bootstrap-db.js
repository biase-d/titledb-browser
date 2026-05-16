import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
async function bootstrap() {
    const connectionString = process.env.POSTGRES_URL;
    if (!connectionString) {
        process.exit(1);
    }
    const sql = postgres(connectionString, { max: 1 });
    const db = drizzle(sql);
    await sql.unsafe('CREATE SCHEMA IF NOT EXISTS layer_a');
    await sql.unsafe('CREATE SCHEMA IF NOT EXISTS layer_b');
    await sql.unsafe('SET search_path TO layer_a, public');
    await migrate(db, { migrationsFolder: 'drizzle' });
    await sql.unsafe('SET search_path TO layer_b, public');
    await migrate(db, { migrationsFolder: 'drizzle' });
    await sql.unsafe('SET search_path TO public');
    await migrate(db, { migrationsFolder: 'drizzle' });
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
bootstrap().catch(() => process.exit(1));
