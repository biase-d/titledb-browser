import { sql } from 'drizzle-orm'

const SCHEMA_A = 'layer_a'
const SCHEMA_B = 'layer_b'

/**
 * Content tables that get swapped between schemas.
 * Listed in dependency order (parents first).
 */
const CONTENT_TABLES = ['game_groups', 'games', 'performance_profiles', 'graphics_settings', 'youtube_links']

/**
 * Ensure both schemas and the control table exist.
 * Safe to call multiple times (idempotent).
 * @param {import('postgres').Sql} sqlClient - Raw postgres.js client
 */
export async function ensureSchemas(sqlClient) {
    console.log('[SchemaManager] Ensuring schemas and control table exist...')

    await sqlClient.unsafe(`CREATE SCHEMA IF NOT EXISTS "${SCHEMA_A}"`)
    await sqlClient.unsafe(`CREATE SCHEMA IF NOT EXISTS "${SCHEMA_B}"`)

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

    await sqlClient.unsafe(`
		CREATE TABLE IF NOT EXISTS public.users (
			"id" TEXT PRIMARY KEY,
			"login" TEXT NOT NULL,
			"karma" INTEGER NOT NULL DEFAULT 0,
			"created_at" TIMESTAMPTZ DEFAULT now(),
			"last_seen_at" TIMESTAMPTZ DEFAULT now()
		)
	`)

    await sqlClient.unsafe(`
		CREATE TABLE IF NOT EXISTS public.submissions (
			"id" SERIAL PRIMARY KEY,
			"user_id" TEXT NOT NULL,
			"github_pr_number" INTEGER,
			"group_id" TEXT NOT NULL,
			"data" JSONB NOT NULL,
			"status" TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'failed')),
			"type" TEXT NOT NULL CHECK (type IN ('graphics', 'youtube', 'game', 'performance')),
			"created_at" TIMESTAMPTZ DEFAULT now(),
			"updated_at" TIMESTAMPTZ DEFAULT now()
		)
	`)

    await sqlClient.unsafe(`
		CREATE INDEX IF NOT EXISTS submissions_pr_number_idx
		ON public.submissions ("github_pr_number")
		WHERE "github_pr_number" IS NOT NULL
	`)

    await sqlClient.unsafe(`
		CREATE INDEX IF NOT EXISTS submissions_status_idx
		ON public.submissions ("status")
	`)

    // Seed public views pointing at the current active schema
    const activeSchema = await getActiveSchema(sqlClient)
    try {
        await ensurePublicViews(sqlClient, activeSchema)
    } catch {
        // Views may fail if content tables don't exist yet (first-ever run before any build)
    }

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
 * Ensure all physical content tables exist in the target schema.
 * Safe to call multiple times (idempotent).
 * @param {import('postgres').Sql} sqlClient
 * @param {string} schema - The target schema (e.g., layer_a)
 */
export async function ensurePhysicalTables(sqlClient, schema) {
    console.log(`[SchemaManager] Ensuring physical tables exist in schema: ${schema}`)

    // Recreate tables using the same DDL as public, but in the target schema
    await sqlClient.unsafe(`
		CREATE TABLE IF NOT EXISTS "${schema}"."game_groups" (
			"id" TEXT PRIMARY KEY,
			"platform_id" INTEGER NOT NULL DEFAULT 1,
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
			"platform_id" INTEGER NOT NULL DEFAULT 1,
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
			"platform_id" INTEGER NOT NULL DEFAULT 1,
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
}

/**
 * Drop and recreate all content tables in the standby schema.
 * This gives us a clean slate for a full rebuild.
 * @param {import('postgres').Sql} sqlClient
 * @param {string} schema - The standby schema to prepare
 */
export async function prepareStandbySchema(sqlClient, schema) {
    console.log(`[SchemaManager] Preparing standby schema for full rebuild: ${schema}`)

    // Drop content tables in reverse dependency order
    const reverseTables = [...CONTENT_TABLES].reverse()
    for (const table of reverseTables) {
        await sqlClient.unsafe(`DROP TABLE IF EXISTS "${schema}"."${table}" CASCADE`)
    }

    await ensurePhysicalTables(sqlClient, schema)

    console.log(`[SchemaManager] Standby schema "${schema}" is ready.`)
}

/**
 * Views in public schema that proxy to the currently active schema tables.
 * These let public-schema tables (favorites, data_requests, etc.) reference
 * game data without cross-schema FK churn on every swap.
 */
const PUBLIC_VIEWS = [
    { view: 'active_game_groups', table: 'game_groups' },
    { view: 'active_games', table: 'games' },
    { view: 'active_performance_data', table: 'performance_profiles' },
    { view: 'active_graphics_settings', table: 'graphics_settings' },
    { view: 'active_youtube_links', table: 'youtube_links' }
]

/**
 * Ensure public views pointing to the active schema exist.
 * Safe to call at startup — idempotent.
 * @param {import('postgres').Sql} sqlClient
 * @param {string} activeSchema
 */
export async function ensurePublicViews(sqlClient, activeSchema) {
    for (const { view, table } of PUBLIC_VIEWS) {
        await sqlClient.unsafe(`
			CREATE OR REPLACE VIEW public."${view}" AS
			SELECT * FROM "${activeSchema}"."${table}"
		`)
    }
}

/**
 * Atomically swap the active schema and refresh public views.
 * Aborts if the standby schema has no game_groups rows to prevent data loss.
 * @param {import('postgres').Sql} sqlClient
 * @param {string} newActiveSchema - The schema to make active
 */
export async function swapSchemas(sqlClient, newActiveSchema) {
    console.log(`[SchemaManager] Swapping active schema to: ${newActiveSchema}`)

    // Safety: refuse to swap if the new active schema has no game data
    const [countRow] = await sqlClient.unsafe(
        `SELECT COUNT(*) AS cnt FROM "${newActiveSchema}"."game_groups"`
    )
    if (Number(countRow.cnt) === 0) {
        throw new Error(
            `[SchemaManager] Swap aborted — standby schema "${newActiveSchema}" has 0 game_groups rows. ` +
            'Run a full rebuild first.'
        )
    }

    await sqlClient.begin(async (tx) => {
        await tx.unsafe(`
			UPDATE public.schema_state
			SET active_schema = '${newActiveSchema}', updated_at = now()
			WHERE id = 1
		`)

        // Refresh public views to point at the new active schema
        for (const { view, table } of PUBLIC_VIEWS) {
            await tx.unsafe(`
				CREATE OR REPLACE VIEW public."${view}" AS
				SELECT * FROM "${newActiveSchema}"."${table}"
			`)
        }
    })

    console.log(`[SchemaManager] Schema swap complete. Active: ${newActiveSchema}`)
}

export { SCHEMA_A, SCHEMA_B, CONTENT_TABLES, PUBLIC_VIEWS }
