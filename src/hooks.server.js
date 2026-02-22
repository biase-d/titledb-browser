import { SvelteKitAuth } from '@auth/sveltekit'
import GitHub from '@auth/sveltekit/providers/github'
import { GITHUB_ID, GITHUB_SECRET } from '$env/static/private'
import { sequence } from '@sveltejs/kit/hooks'
import { db } from '$lib/db'
import { sql } from 'drizzle-orm'

/**
 * Cache the active schema and refresh periodically.
 * This avoids querying schema_state on every single request.
 */
/** @type {string|null} */
let cachedSearchPath = null
let lastSchemaCheck = 0
const SCHEMA_CHECK_INTERVAL_MS = 60_000 // Refresh every 60s

/**
 * Resolve the current search_path from the schema_state table.
 * Falls back to 'public' if schema_state doesn't exist yet.
 * @returns {Promise<string>}
 */
async function resolveSearchPath () {
	const now = Date.now()
	if (cachedSearchPath && (now - lastSchemaCheck) < SCHEMA_CHECK_INTERVAL_MS) {
		return cachedSearchPath
	}

	try {
		const result = await db.execute(
			sql`SELECT active_schema FROM public.schema_state WHERE id = 1`
		)
		const row = result.rows?.[0] || result[0]
		if (row?.active_schema) {
			cachedSearchPath = `"${row.active_schema}", "public"`
			lastSchemaCheck = now
			return cachedSearchPath
		}
	} catch {
		// schema_state table doesn't exist yet — fall back to public
	}

	cachedSearchPath = '"public"'
	lastSchemaCheck = now
	return cachedSearchPath
}

/** @type {import('@sveltejs/kit').Handle} */
const dbHandler = async ({ event, resolve }) => {
	// Set search_path before passing db to the request
	const searchPath = await resolveSearchPath()
	try {
		await db.execute(sql.raw(`SET search_path TO ${searchPath}`))
	} catch {
		// Non-fatal: if this fails, queries will fall back to default search_path
	}

	event.locals.db = db
	return resolve(event)
}

/** @type {import('@sveltejs/kit').Handle} */
const authHandler = SvelteKitAuth({
	trustHost: true,
	providers: [
		GitHub({
			clientId: GITHUB_ID,
			clientSecret: GITHUB_SECRET,
			authorization: {
				params: {
					scope: ''
				}
			}
		})
	],
	callbacks: {
		async jwt ({ token, profile }) {
			if (profile) {
				// @ts-ignore
				token.login = profile.login
				// @ts-ignore
				token.id = profile.id
			}
			return token
		},
		async session ({ session, token }) {
			// @ts-ignore
			session.user.login = token.login
			// @ts-ignore
			session.user.id = token.id
			return session
		}
	}
}).handle

export const handle = sequence(dbHandler, authHandler)
