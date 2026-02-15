import { dev } from '$app/environment'
import { POSTGRES_URL } from '$env/static/private'
import * as schema from './schema'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'

let dbInstance

if (!dev) {
	const client = neon(POSTGRES_URL)
	dbInstance = drizzleNeon(client, { schema })
} else {
	const { default: postgres } = await import('postgres')
	const { drizzle: drizzlePg } = await import('drizzle-orm/postgres-js')

	const client = postgres(POSTGRES_URL)
	dbInstance = drizzlePg(client, { schema })
}

export const db = dbInstance
