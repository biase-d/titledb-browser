/**
 * @file Preferences Repository
 * @description Database operations for user preferences
 */

import { userPreferences } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Get user preferences by User ID
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
export async function getUserPreferences(db, userId) {
    if (!userId) return null;

    const result = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
    return result[0] || null;
}

/**
 * Upsert user preferences
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string} userId
 * @param {Object} data
 * @param {boolean} [data.hasOnboarded]
 * @param {string} [data.preferredRegion]
 * @param {string} [data.featuredGameId]
 * @returns {Promise<Object>}
 */
export async function upsertUserPreferences(db, userId, data) {
    if (!userId) throw new Error('UserId is required');

    /** @type {any} */
    const values = {
        userId,
        lastUpdated: new Date()
    };

    if (data.hasOnboarded !== undefined) values.hasOnboarded = data.hasOnboarded;
    if (data.preferredRegion !== undefined) values.preferredRegion = data.preferredRegion;
    if (data.featuredGameId !== undefined) values.featuredGameId = data.featuredGameId;

    const result = await db.insert(userPreferences)
        .values(values)
        .onConflictDoUpdate({
            target: userPreferences.userId,
            set: values
        })
        .returning();

    return result[0];
}
