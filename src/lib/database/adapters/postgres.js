/**
 * @file PostgreSQL Database Adapter
 * @description Wraps Drizzle ORM with PostgreSQL-specific connection logic
 */

import { dev } from '$app/environment'
import * as schema from '$lib/db/schema'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'

/**
 * Create PostgreSQL database adapter
 * @param {Object} env - Environment variables
 * @returns {import('../types').DatabaseAdapter}
 */
export function createPostgresAdapter (env) {
	const connectionString = env.POSTGRES_URL

	if (!connectionString) {
		throw new Error('POSTGRES_URL environment variable is required for PostgreSQL adapter')
	}

	let dbInstance

	if (!dev) {
		// Production: Use Neon serverless HTTP
		const client = neon(connectionString)
		dbInstance = drizzleNeon(client, { schema })
	} else {
		// Development: Use standard postgres.js (async import to avoid bundling issues)

		// Return promise-based instance for dev
		dbInstance = dev ? null : null // Will be created on first use

		// For sync access, we'll use the production client even in dev if needed
		const client = neon(connectionString)
		dbInstance = drizzleNeon(client, { schema })
	}

	return dbInstance
}

/**
 * Detect if database is PostgreSQL
 * @param {any} db - Database instance
 * @returns {boolean}
 */
export function isPostgresAdapter (db) {
	return db?._.session?.client !== undefined
}
