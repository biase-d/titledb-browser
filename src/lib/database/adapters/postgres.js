/**
 * @file PostgreSQL Database Adapter
 * @description Wraps Drizzle ORM with PostgreSQL-specific connection logic
 */

import * as schema from '$lib/db/schema'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'

/**
 * Create PostgreSQL database adapter with schema-aware search path
 * @param {Object} env - Environment variables
 * @param {string} [searchPath] - PostgreSQL search_path (e.g. 'layer_a, public')
 * @returns {import('../types').DatabaseAdapter}
 */
export function createPostgresAdapter (env, searchPath) {
	const connectionString = env.POSTGRES_URL

	if (!connectionString) {
		throw new Error('POSTGRES_URL environment variable is required for PostgreSQL adapter')
	}

	// Append search_path to connection string if provided
	let connStr = connectionString
	if (searchPath) {
		const separator = connStr.includes('?') ? '&' : '?'
		connStr = `${connStr}${separator}options=-csearch_path%3D${encodeURIComponent(searchPath)}`
	}

	const client = neon(connStr)
	return drizzleNeon(client, { schema })
}

/**
 * Detect if database is PostgreSQL
 * @param {any} db - Database instance
 * @returns {boolean}
 */
export function isPostgresAdapter (db) {
	return db?._.session?.client !== undefined
}
