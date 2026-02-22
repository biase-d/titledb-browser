import { sql } from 'drizzle-orm'

const SCHEMA_A = 'layer_a'
const SCHEMA_B = 'layer_b'

/**
 * Content tables that get swapped between schemas.
 * Listed in dependency order (parents first).
 */
const CONTENT_TABLES = ['game_groups', 'games', 'performance_profiles', 'graphics_settings', 'youtube_links']

/**
 * Cross-schema FK definitions from public tables to content tables.
 * These are dropped and recreated after each swap.
 */
const CROSS_SCHEMA_FKS = [
    {
        table: 'public.data_requests',
        constraint: 'data_requests_game_id_fkey',
        column: 'game_id',
        refTable: 'games',
        refColumn: 'id',
        onDelete: 'CASCADE'
    },
    {
        table: 'public.favorites',
        constraint: 'favorites_game_id_fkey',
        column: 'game_id',
        refTable: 'games',
        refColumn: 'id',
        onDelete: 'CASCADE'
    },
    {
        table: 'public.user_preferences',
        constraint: 'user_preferences_featured_game_id_fkey',
        column: 'featured_game_id',
        refTable: 'games',
        refColumn: 'id',
        onDelete: 'SET NULL'
    }
]

/**
 * Ensure both schemas and the control table exist.
 * Safe to call multiple times (idempotent).
 * @param {import('postgres').Sql} sqlClient - Raw postgres.js client
 */
export async function ensureSchemas(sqlClient) {
    console.log('[SchemaManager] Ensuring schemas and control table exist...')

    await sqlClient`CREATE SCHEMA IF NOT EXISTS ${sql(SCHEMA_A)}`
    await sqlClient`CREATE SCHEMA IF NOT EXISTS ${sql(SCHEMA_B)}`

    await sqlClient.unsafe(`
		CREATE TABLE IF NOT EXISTS public.schema_state (
			id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
			active_schema TEXT NOT NULL DEFAULT '${SCHEMA_A}',
			updated_at TIMESTAMPTZ DEFAULT now()
		)
	`)

    await sqlClient.unsafe(`
		INSERT INTO public.schema_state (active_schema)
		VALUES ('${SCHEMA_A}')
		ON CONFLICT (id) DO NOTHING
	`)

    // Ensure build_status table exists
    await sqlClient.unsafe(`
		CREATE TABLE IF NOT EXISTS public.build_status (
			id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
			is_building BOOLEAN DEFAULT FALSE,
			phase TEXT,
			started_at TIMESTAMPTZ,
			completed_at TIMESTAMPTZ
		)
	`)

    await sqlClient.unsafe(`
		INSERT INTO public.build_status (is_building)
		VALUES (FALSE)
		ON CONFLICT (id) DO NOTHING
	`)

    console.log('[SchemaManager] Schemas and control tables ready.')
}

/**
 * Get the currently active schema name
 * @param {import('postgres').Sql} sqlClient
 * @returns {Promise<string>}
 */
export async function getActiveSchema(sqlClient) {
    const [row] = await sqlClient`SELECT active_schema FROM public.schema_state WHERE id = 1`
    return row?.active_schema || SCHEMA_A
}

/**
 * Get the standby (inactive) schema name
 * @param {import('postgres').Sql} sqlClient
 * @returns {Promise<string>}
 */
export async function getStandbySchema(sqlClient) {
    const active = await getActiveSchema(sqlClient)
    return active === SCHEMA_A ? SCHEMA_B : SCHEMA_A
}

/**
 * Drop and recreate all content tables in the standby schema.
 * This gives us a clean slate for a full rebuild.
 * @param {import('postgres').Sql} sqlClient
 * @param {string} schema - The standby schema to prepare
 */
export async function prepareStandbySchema(sqlClient, schema) {
    console.log(`[SchemaManager] Preparing standby schema: ${schema}`)

    // Drop content tables in reverse dependency order
    const reverseTables = [...CONTENT_TABLES].reverse()
    for (const table of reverseTables) {
        await sqlClient.unsafe(`DROP TABLE IF EXISTS "${schema}"."${table}" CASCADE`)
    }

    // Recreate tables using the same DDL as public, but in the target schema
    await sqlClient.unsafe(`
		CREATE TABLE IF NOT EXISTS "${schema}"."game_groups" (
			"id" TEXT PRIMARY KEY,
			"youtube_contributors" TEXT[],
			"last_updated" TIMESTAMPTZ DEFAULT now()
		)
	`)

    await sqlClient.unsafe(`
		CREATE TABLE IF NOT EXISTS "${schema}"."games" (
			"id" TEXT PRIMARY KEY,
			"group_id" TEXT NOT NULL REFERENCES "${schema}"."game_groups"("id"),
			"names" TEXT[] NOT NULL,
			"regions" TEXT[],
			"publisher" TEXT,
			"release_date" INTEGER,
			"size_in_bytes" BIGINT,
			"icon_url" TEXT,
			"banner_url" TEXT,
			"screenshots" TEXT[],
			"last_updated" TIMESTAMPTZ DEFAULT now()
		)
	`)

    // Create enum types only if they don't exist (they're shared across schemas)
    await sqlClient.unsafe(`
		DO $$ BEGIN
			CREATE TYPE resolution_type AS ENUM ('Fixed', 'Dynamic', 'Multiple Fixed');
		EXCEPTION WHEN duplicate_object THEN null;
		END $$
	`)

    await sqlClient.unsafe(`
		DO $$ BEGIN
			CREATE TYPE fps_behavior AS ENUM ('Locked', 'Stable', 'Unstable', 'Very Unstable');
		EXCEPTION WHEN duplicate_object THEN null;
		END $$
	`)

    await sqlClient.unsafe(`
		DO $$ BEGIN
			CREATE TYPE contribution_status AS ENUM ('pending', 'approved', 'rejected');
		EXCEPTION WHEN duplicate_object THEN null;
		END $$
	`)

    await sqlClient.unsafe(`
		CREATE TABLE IF NOT EXISTS "${schema}"."performance_profiles" (
			"id" SERIAL PRIMARY KEY,
			"group_id" TEXT NOT NULL REFERENCES "${schema}"."game_groups"("id"),
			"game_version" TEXT NOT NULL,
			"suffix" TEXT,
			"profiles" JSONB NOT NULL,
			"contributor" TEXT[],
			"source_pr_url" TEXT,
			"status" contribution_status NOT NULL DEFAULT 'approved',
			"pr_number" INTEGER,
			"last_updated" TIMESTAMPTZ DEFAULT now()
		)
	`)

    await sqlClient.unsafe(`
		CREATE UNIQUE INDEX IF NOT EXISTS "${schema}_groupId_version_unq"
		ON "${schema}"."performance_profiles" ("group_id", "game_version", "suffix")
	`)

    await sqlClient.unsafe(`
		CREATE TABLE IF NOT EXISTS "${schema}"."graphics_settings" (
			"group_id" TEXT PRIMARY KEY REFERENCES "${schema}"."game_groups"("id"),
			"settings" JSONB NOT NULL,
			"contributor" TEXT[],
			"status" contribution_status NOT NULL DEFAULT 'approved',
			"pr_number" INTEGER,
			"last_updated" TIMESTAMPTZ DEFAULT now()
		)
	`)

    await sqlClient.unsafe(`
		CREATE TABLE IF NOT EXISTS "${schema}"."youtube_links" (
			"id" SERIAL PRIMARY KEY,
			"group_id" TEXT NOT NULL REFERENCES "${schema}"."game_groups"("id"),
			"url" TEXT NOT NULL,
			"notes" TEXT,
			"submitted_by" TEXT,
			"status" contribution_status NOT NULL DEFAULT 'approved',
			"pr_number" INTEGER,
			"submitted_at" TIMESTAMPTZ DEFAULT now()
		)
	`)

    console.log(`[SchemaManager] Standby schema "${schema}" is ready.`)
}

/**
 * Atomically swap the active schema and recreate cross-schema FKs.
 * @param {import('postgres').Sql} sqlClient
 * @param {string} newActiveSchema - The schema to make active
 */
export async function swapSchemas(sqlClient, newActiveSchema) {
    console.log(`[SchemaManager] Swapping active schema to: ${newActiveSchema}`)

    await sqlClient.begin(async (tx) => {
        // Update the control table
        await tx.unsafe(`
			UPDATE public.schema_state
			SET active_schema = '${newActiveSchema}', updated_at = now()
			WHERE id = 1
		`)

        // Drop and recreate cross-schema FKs
        for (const fk of CROSS_SCHEMA_FKS) {
            await tx.unsafe(`
				ALTER TABLE ${fk.table}
				DROP CONSTRAINT IF EXISTS "${fk.constraint}"
			`)

            await tx.unsafe(`
				ALTER TABLE ${fk.table}
				ADD CONSTRAINT "${fk.constraint}"
				FOREIGN KEY ("${fk.column}")
				REFERENCES "${newActiveSchema}"."${fk.refTable}"("${fk.refColumn}")
				ON DELETE ${fk.onDelete}
			`)
        }
    })

    console.log(`[SchemaManager] Schema swap complete. Active: ${newActiveSchema}`)
}

export { SCHEMA_A, SCHEMA_B, CONTENT_TABLES }
