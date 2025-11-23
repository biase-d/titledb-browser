import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { dev } from '$app/environment'
import { POSTGRES_URL } from '$env/static/private'
import * as schema from './schema'

const useSsl = !dev

const client = postgres(POSTGRES_URL, {
  ssl: useSsl,
  prepare: false 
})

export const db = drizzle(client, { schema, logger: dev })
