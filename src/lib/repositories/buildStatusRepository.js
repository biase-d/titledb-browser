import { sql } from 'drizzle-orm'

/**
 * Get the build status from the build_status table
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @returns {Promise<{ isBuilding: boolean, phase: string|null, startedAt: Date|null, completedAt: Date|null } | null>}
 */
export async function getBuildStatus (db) {
    try {
        const result = await db.execute(
            sql`SELECT is_building, phase, started_at, completed_at FROM public.build_status WHERE id = 1`
        )
        const row = result.rows?.[0] || result[0]
        if (!row) return null

        return {
            isBuilding: row.is_building,
            phase: row.phase,
            startedAt: row.started_at ? new Date(row.started_at) : null,
            completedAt: row.completed_at ? new Date(row.completed_at) : null
        }
    } catch {
        // Table might not exist yet (first deploy before first build)
        return null
    }
}
