/**
 * @file Database Factory
 * @description Creates appropriate database adapter based on environment and platform
 */

import { createPostgresAdapter } from './adapters/postgres.js'
import { createD1Adapter } from './adapters/d1.js'

/**
 * Create database adapter based on environment
 * @param {Object} env - Environment variables (process.env or Cloudflare env)
 * @param {Object} [platform] - Platform context (SvelteKit platform object)
 * @returns {import('./types').DatabaseAdapter}
 */
export function createDatabase (env, platform) {
	// Priority 1: Cloudflare Workers with D1 binding
	if (platform?.env?.DB || platform?.env?.D1_DATABASE) {
		const binding = platform.env.DB || platform.env.D1_DATABASE
		console.log('[Database] Using Cloudflare D1')
		return createD1Adapter(binding)
	}

	// Priority 2: Explicit database type configuration
	const dbType = env.DATABASE_TYPE || 'postgres'

	switch (dbType.toLowerCase()) {
		case 'postgres':
		case 'postgresql':
			console.log('[Database] Using PostgreSQL')
			return createPostgresAdapter(env)

		case 'd1':
		case 'sqlite':
			throw new Error('D1 requires Cloudflare Workers platform binding. Set d1_databases in wrangler.jsonc')

		default:
			throw new Error(`Unsupported database type: ${dbType}. Supported types: postgres, d1`)
	}
}

/**
 * Detect database provider type
 * @param {Object} env - Environment variables
 * @param {Object} [platform] - Platform context
 * @returns {import('./types').DatabaseType}
 */
export function detectDatabaseType (env, platform) {
	if (platform?.env?.DB || platform?.env?.D1_DATABASE) {
		return 'd1'
	}

	const dbType = env.DATABASE_TYPE || 'postgres'

	if (dbType.toLowerCase().includes('postgres')) {
		return 'postgres'
	}

	return 'unknown'
}
