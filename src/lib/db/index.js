import { POSTGRES_URL } from '$env/static/private'
import * as schema from './schema'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'

const client = postgres(POSTGRES_URL)
export const db = drizzle(client, { schema })
