/**
 * @file Preferences Service
 * @description Business logic for user preferences
 */

import * as preferencesRepo from '$lib/repositories/preferencesRepository'

/**
 * Get preferences for a user
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string} userId
 */
export async function getPreferences (db, userId) {
	if (!userId) return null
	return await preferencesRepo.getUserPreferences(db, userId)
}

/**
 * Save preferences for a user
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string} userId
 * @param {Object} preferences
 */
export async function savePreferences (db, userId, preferences) {
	if (!userId) throw new Error('User NOT authenticated')

	return await preferencesRepo.upsertUserPreferences(db, userId, preferences)
}
