/**
 * @file Database Context
 * @description Runtime database access for SvelteKit request handlers
 */

import { db } from '$lib/db'

/**
 * The hook puts the shared pool on locals for every request; this is the
 * fallback for call sites that run outside that (and it returns the same pool)
 * @param {any} [locals] - SvelteKit event.locals
 * @returns {typeof db}
 */
export function getDatabase (locals) {
	return locals?.db ?? db
}

/**
 * @param {any} [locals]
 * @returns {boolean}
 */
export function hasDatabase (locals) {
	return Boolean(locals?.db)
}
