import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { sql } from 'drizzle-orm'
import * as schema from '../src/lib/db/schema.js'
import { searchGames } from '../src/lib/repositories/searchRepository.js'

const DATABASE_URL = process.env.POSTGRES_URL

describe('Search Repository Sorting', () => {
    let sqlClient
    let db

    beforeAll(async () => {
        if (!DATABASE_URL) return
        sqlClient = postgres(DATABASE_URL, { max: 1 })
        db = drizzle(sqlClient, { schema })
        
        await sqlClient.unsafe('CREATE SCHEMA IF NOT EXISTS "test_search"')
        await sqlClient.unsafe('SET search_path TO "test_search", "extensions", "public"')
        
        await sqlClient.unsafe(`
            CREATE TABLE IF NOT EXISTS "test_search"."active_games" (
                id TEXT PRIMARY KEY,
                group_id TEXT NOT NULL,
                names TEXT[] NOT NULL,
                regions TEXT[],
                publisher TEXT,
                release_date INTEGER,
                size_in_bytes BIGINT,
                icon_url TEXT,
                banner_url TEXT,
                screenshots TEXT[],
                last_updated TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS "test_search"."active_performance_data" (
                id SERIAL PRIMARY KEY,
                group_id TEXT NOT NULL,
                platform_id INTEGER NOT NULL DEFAULT 1,
                game_version TEXT NOT NULL,
                suffix TEXT,
                profiles JSONB NOT NULL,
                contributor TEXT[],
                source_pr_url TEXT,
                status TEXT NOT NULL DEFAULT 'approved',
                pr_number INTEGER,
                last_updated TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS "test_search"."active_graphics_settings" (
                group_id TEXT PRIMARY KEY,
                platform_id INTEGER NOT NULL DEFAULT 1,
                settings JSONB NOT NULL,
                contributor TEXT[],
                status TEXT NOT NULL DEFAULT 'approved',
                pr_number INTEGER,
                last_updated TIMESTAMPTZ DEFAULT NOW()
            );
        `)
    })

    afterAll(async () => {
        if (sqlClient) {
            await sqlClient.unsafe('DROP SCHEMA "test_search" CASCADE')
            await sqlClient.end()
        }
    })

    it('should sort Game B before Game A when Game B has a newer performance profile', async () => {
        if (!DATABASE_URL) return
        
        await db.insert(schema.games).values([
            {
                id: 'GAME_A',
                groupId: 'GROUP_A',
                names: ['Game A'],
                lastUpdated: new Date('2024-01-01T00:00:00Z')
            },
            {
                id: 'GAME_B',
                groupId: 'GROUP_B',
                names: ['Game B'],
                lastUpdated: new Date('2023-01-01T00:00:00Z')
            }
        ])

        await db.insert(schema.performanceProfiles).values([
            {
                groupId: 'GROUP_A',
                gameVersion: '1.0.0',
                profiles: { docked: { target_fps: 30 } },
                lastUpdated: new Date('2024-01-01T00:00:00Z'),
                status: 'approved'
            },
            {
                groupId: 'GROUP_B',
                gameVersion: '1.0.0',
                profiles: { docked: { target_fps: 60 } },
                lastUpdated: new Date('2024-02-01T00:00:00Z'),
                status: 'approved'
            }
        ])

        const searchParams = new URLSearchParams({ sort: 'date-desc' })
        const { results } = await searchGames(db, searchParams)

        expect(results).toHaveLength(2)
        expect(results[0].id).toBe('GAME_B')
        expect(results[1].id).toBe('GAME_A')
    })
})
