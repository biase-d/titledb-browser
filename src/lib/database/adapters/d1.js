/**
 * @file Cloudflare D1 Database Adapter
 * @description Drizzle ORM adapter for Cloudflare D1 (SQLite-compatible)
 */

import * as schema from '$lib/db/schema';

/**
 * Create D1 database adapter for Cloudflare Workers
 * @param {D1Database} d1Binding - D1 database binding from Cloudflare Workers env
 * @returns {import('../types').DatabaseAdapter}
 */
export function createD1Adapter(d1Binding) {
    if (!d1Binding) {
        throw new Error('D1 database binding is required. Ensure wrangler.jsonc has d1_databases configured.');
    }

    // Dynamically import D1 drizzle adapter (prevents bundling issues)
    let dbInstance;

    const createInstance = async () => {
        const { drizzle } = await import('drizzle-orm/d1');
        return drizzle(d1Binding, { schema });
    };

    // For synchronous access, create a proxy that handles async initialization
    dbInstance = new Proxy({}, {
        get(target, prop) {
            if (!target._instance) {
                target._instance = createInstance();
            }

            return async function (...args) {
                const instance = await target._instance;
                return instance[prop](...args);
            };
        }
    });

    return dbInstance;
}

/**
 * Detect if database is D1
 * @param {any} db - Database instance
 * @returns {boolean}
 */
export function isD1Adapter(db) {
    return db?._.session?.dialect === 'd1' || db?._?.dialect?.name === 'sqlite';
}

/**
 * Note: D1 Schema Compatibility
 * 
 * PostgreSQL enums need to be converted to CHECK constraints or TEXT for D1:
 * 
 * PostgreSQL:
 *   resolution_type ENUM('Fixed', 'Dynamic', 'Multiple Fixed')
 * 
 * D1/SQLite:
 *   resolution_type TEXT CHECK(resolution_type IN ('Fixed', 'Dynamic', 'Multiple Fixed'))
 * 
 * This conversion should be handled in schema migrations when switching to D1.
 */
