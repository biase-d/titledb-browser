import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { sql } from 'drizzle-orm'
import * as schema from '../src/lib/db/schema.js'
import { ensureSchemas, swapSchemas } from '../src/lib/pipeline/schema-manager.js'

const DATABASE_URL = process.env.POSTGRES_URL

describe('Database Connection Pool Isolation', () => {
    let sqlClient
    let db

    beforeAll(async () => {
        if (!DATABASE_URL) {
            throw new Error('POSTGRES_URL is required for integration tests')
        }

        sqlClient = postgres(DATABASE_URL, { max: 2 })
        db = drizzle(sqlClient, { schema })

        await ensureSchemas(sqlClient)
        await sqlClient.unsafe(`
            CREATE TABLE IF NOT EXISTS "layer_a"."game_groups" (id TEXT PRIMARY KEY);
            INSERT INTO "layer_a"."game_groups" (id) VALUES ('TEST_GROUP') ON CONFLICT DO NOTHING;
        `)
        await swapSchemas(sqlClient, 'layer_a')
    })

    afterAll(async () => {
        if (sqlClient) {
            await sqlClient.end()
        }
    })

    it('should be immune to search_path leakage', async () => {
        await sqlClient.unsafe('CREATE SCHEMA IF NOT EXISTS "empty_schema"')
	await sqlClient.unsafe('SET search_path TO "empty_schema"')

	const queries = Array.from({ length: 10 }).map(async () => {
            return db.select().from(schema.gameGroups)
        })

        const results = await Promise.all(queries)

        for (const res of results) {
            expect(res).toBeDefined()
            expect(res.length).toBeGreaterThan(0)
            expect(res[0].id).toBe('TEST_GROUP')
        }
    })
})
