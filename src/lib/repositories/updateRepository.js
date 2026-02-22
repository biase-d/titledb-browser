import { games } from '$lib/db/schema'
import { desc } from 'drizzle-orm'

/**
 * Get recent game updates
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {number} [limit=15] - Number of results
 * @returns {Promise<Array>}
 */
export async function getRecentUpdates (db, limit = 15) {
    return await db.query.games.findMany({
        orderBy: desc(games.lastUpdated),
        limit
    })
}
