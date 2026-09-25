/**
 * @file Storage Context
 * @description Runtime storage access for SvelteKit request handlers
 */

import { createStorage } from './factory.js'

/** @type {import('./types').StorageAdapter | null | undefined} */
let instance

/**
 * The adapter is process-wide, not per-request: it holds a connection pool and
 * nothing about it varies by request
 * @param {Object} [_locals] - Unused, kept so call sites read the same everywhere
 * @returns {import('./types').StorageAdapter | null}
 */
export function getStorage (_locals) {
	if (instance === undefined) {
		instance = createStorage(process.env)
	}
	return instance
}

/**
 * @param {Object} [locals]
 * @returns {boolean}
 */
export function hasStorage (locals) {
	return getStorage(locals) !== null
}
