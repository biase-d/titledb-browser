/**
 * @file Database Context
 * @description Runtime database access for SvelteKit request handlers
 */

import { createDatabase } from './factory.js'

/**
 * Get database instance from SvelteKit request context
 * Lazily creates database connection if not already present
 *
 * @param {Object} locals - SvelteKit event.locals object
 * @returns {import('./types').DatabaseAdapter}
 */
export function getDatabase (locals) {
	if (!locals.db) {
		// Create database from platform environment or process.env
		const env = locals.platform?.env || process.env
		const platform = locals.platform

		locals.db = createDatabase(env, platform)
	}

	return locals.db
}

/**
 * Check if database connection exists in context
 * @param {Object} locals - SvelteKit event.locals
 * @returns {boolean}
 */
export function hasDatabase (locals) {
	return locals.db !== undefined && locals.db !== null
}
