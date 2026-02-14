import { eq, and } from 'drizzle-orm';
import { favorites } from '$lib/db/schema';

/**
 * Get all favorite game IDs for a user
 * @param {import('drizzle-orm').PostgresJsDatabase} db
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
export async function getUserFavorites(db, userId) {
    if (!userId) return [];
    const results = await db
        .select({ gameId: favorites.gameId })
        .from(favorites)
        .where(eq(favorites.userId, userId));

    return results.map(r => r.gameId);
}

/**
 * Add a favorite
 * @param {import('drizzle-orm').PostgresJsDatabase} db
 * @param {string} userId
 * @param {string} gameId
 * @returns {Promise<void>}
 */
export async function addFavorite(db, userId, gameId) {
    if (!userId || !gameId) return;
    await db
        .insert(favorites)
        .values({ userId, gameId })
        .onConflictDoNothing();
}

/**
 * Remove a favorite
 * @param {import('drizzle-orm').PostgresJsDatabase} db
 * @param {string} userId
 * @param {string} gameId
 * @returns {Promise<void>}
 */
export async function removeFavorite(db, userId, gameId) {
    if (!userId || !gameId) return;
    await db
        .delete(favorites)
        .where(
            and(
                eq(favorites.userId, userId),
                eq(favorites.gameId, gameId)
            )
        );
}
