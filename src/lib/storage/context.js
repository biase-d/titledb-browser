/**
 * @file Storage Context
 * @description Runtime storage access for SvelteKit request handlers
 */

import { createStorage } from './factory.js'

/**
 * Get storage instance from SvelteKit request context
 * Lazily creates storage connection if not already present
 *
 * @param {Object} locals - SvelteKit event.locals object
 * @returns {import('./types').StorageAdapter | null}
 */
export function getStorage (locals) {
	if (!locals.storage) {
		// Create storage from platform environment or process.env
		const env = locals.platform?.env || process.env
		const platform = locals.platform

		locals.storage = createStorage(env, platform)
	}

	return locals.storage
}

/**
 * Check if storage is configured and available
 * @param {Object} locals - SvelteKit event.locals
 * @returns {boolean}
 */
export function hasStorage (locals) {
	return getStorage(locals) !== null
}
