/**
 * @file Data Request Repository
 * @description Pure functions for managing user data requests
 */

import { dataRequests } from '$lib/db/schema';
import { and, eq, sql } from 'drizzle-orm';

/**
 * Check if a user has requested data for a specific game
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string} userId - User ID
 * @param {string} gameId - Game ID
 * @returns {Promise<boolean>}
 */
export async function hasUserRequestedData(db, userId, gameId) {
    if (!userId || !gameId) return false;

    const result = await db.select({ count: sql`count(*)` })
        .from(dataRequests)
        .where(and(
            eq(dataRequests.userId, userId),
            eq(dataRequests.gameId, gameId)
        ));

    return Number(result[0]?.count || 0) > 0;
}

/**
 * Create a new data request
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string} userId - User ID
 * @param {string} gameId - Game ID
 * @returns {Promise<void>}
 */
export async function createDataRequest(db, userId, gameId) {
    if (!userId || !gameId) return;

    // Use onConflictDoNothing to handle duplicates if needed, 
    // though application logic should check first
    await db.insert(dataRequests)
        .values({
            userId,
            gameId,
            createdAt: new Date()
        })
        .onConflictDoNothing();
}

/**
 * Get all requests for a user
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string} userId - User ID
 * @returns {Promise<Array>}
 */
export async function getUserRequests(db, userId) {
    return await db.select()
        .from(dataRequests)
        .where(eq(dataRequests.userId, userId));
}

/**
 * Remove a data request (toggle off)
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string} userId - User ID
 * @param {string} gameId - Game ID
 * @returns {Promise<void>}
 */
export async function removeDataRequest(db, userId, gameId) {
    if (!userId || !gameId) return;

    await db.delete(dataRequests)
        .where(and(
            eq(dataRequests.userId, userId),
            eq(dataRequests.gameId, gameId)
        ));
}

