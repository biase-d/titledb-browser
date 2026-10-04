import { randomUUID } from 'node:crypto'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { apiTokens } from '$lib/db/schema'
import { generateToken, hashToken, looksLikeToken } from '$lib/server/apiAuth'

/**
 * Making, listing, revoking and checking API tokens. The API is for signed-in
 * people: each makes tokens for their own use, and a request carrying one is
 * counted against the person who made it
 */

/** How many live tokens one person may hold */
export const MAX_TOKENS = 5

/** A token's last use is written at most this often, so reading is not writing every time */
const TOUCH_EVERY_MS = 60_000
/** @type {Map<string, number>} */
const touched = new Map()

/** @type {Promise<void> | null} */
let ensured = null

/**
 * The table is created the first time it is wanted, if the database does not have
 * it yet (an existing one is not re-migrated; see schema-manager)
 * @param {any} db
 */
function ensureTable (db) {
	ensured ??= (async () => {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS public.api_tokens (
				"id" TEXT PRIMARY KEY,
				"user_id" TEXT NOT NULL,
				"login" TEXT NOT NULL,
				"name" TEXT NOT NULL DEFAULT '',
				"token_hash" TEXT NOT NULL UNIQUE,
				"display" TEXT NOT NULL,
				"created_at" TIMESTAMPTZ DEFAULT now(),
				"last_used_at" TIMESTAMPTZ,
				"revoked_at" TIMESTAMPTZ
			)`)
		await db.execute(sql`CREATE INDEX IF NOT EXISTS api_tokens_user_idx ON public.api_tokens ("user_id")`)
	})().catch((/** @type {any} */ err) => { ensured = null; throw err })
	return ensured
}

/**
 * @param {any} db
 * @param {string} userId
 */
export async function listTokens (db, userId) {
	await ensureTable(db)
	return db.select({
		id: apiTokens.id,
		name: apiTokens.name,
		display: apiTokens.display,
		createdAt: apiTokens.createdAt,
		lastUsedAt: apiTokens.lastUsedAt
	}).from(apiTokens)
		.where(and(eq(apiTokens.userId, userId), isNull(apiTokens.revokedAt)))
		.orderBy(desc(apiTokens.createdAt))
}

/**
 * Makes a token. The whole token is in the answer, and nowhere else: it cannot be
 * shown again
 * @param {any} db
 * @param {{ id: string, login: string }} user
 * @param {string} name what it is for, as the person wrote it
 * @returns {Promise<{ ok: true, token: string, display: string, name: string } | { ok: false, reason: 'limit' }>}
 */
export async function createToken (db, user, name) {
	await ensureTable(db)
	const live = await listTokens(db, user.id)
	if (live.length >= MAX_TOKENS) return { ok: false, reason: 'limit' }

	const { token, hash, display } = generateToken()
	const clean = String(name ?? '').trim().slice(0, 40)
	await db.insert(apiTokens).values({ id: randomUUID(), userId: user.id, login: user.login, name: clean, tokenHash: hash, display })
	return { ok: true, token, display, name: clean }
}

/**
 * Revoking is for the person's own tokens only
 * @param {any} db
 * @param {string} userId
 * @param {string} tokenId
 */
export async function revokeToken (db, userId, tokenId) {
	await ensureTable(db)
	await db.update(apiTokens)
		.set({ revokedAt: new Date() })
		.where(and(eq(apiTokens.id, tokenId), eq(apiTokens.userId, userId), isNull(apiTokens.revokedAt)))
}

/**
 * Whose token this is, or null if it is unknown or revoked
 * @param {any} db
 * @param {string} token
 * @returns {Promise<{ id: string, userId: string, login: string } | null>}
 */
export async function verifyToken (db, token) {
	if (!looksLikeToken(token)) return null
	await ensureTable(db)
	const rows = await db.select({ id: apiTokens.id, userId: apiTokens.userId, login: apiTokens.login, name: apiTokens.name })
		.from(apiTokens)
		.where(and(eq(apiTokens.tokenHash, hashToken(token)), isNull(apiTokens.revokedAt)))
		.limit(1)
	const row = rows[0]
	if (!row) return null

	const now = Date.now()
	if (now - (touched.get(row.id) ?? 0) > TOUCH_EVERY_MS) {
		touched.set(row.id, now)
		// Not waited for, and a failure to record a use is not the caller's problem
		db.update(apiTokens).set({ lastUsedAt: new Date() }).where(eq(apiTokens.id, row.id)).catch(() => {})
	}
	return row
}
