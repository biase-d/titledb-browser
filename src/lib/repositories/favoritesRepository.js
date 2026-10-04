import { randomUUID } from 'node:crypto'
import { eq, and, inArray, asc, sql } from 'drizzle-orm'
import { favorites, favoriteLists, favoriteListItems } from '$lib/db/schema'

/**
 * A person's favourite games, and the lists they sort them into
 *
 * A list only holds games the person has favourited: putting a game in a list
 * favourites it, and un-favouriting it takes it out of every list. So "All" is
 * always the whole set and a list is a part of it
 */

export const MAX_LISTS = 20
export const MAX_LIST_NAME = 40

/** @type {Promise<void> | null} */
let ensured = null

/**
 * The tables for lists are made the first time they are wanted if the database
 * does not have them yet (an existing one is not re-migrated; see schema-manager)
 * @param {any} db
 */
function ensureTables (db) {
	ensured ??= (async () => {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS public.favorite_lists (
				"id" TEXT PRIMARY KEY,
				"user_id" TEXT NOT NULL,
				"name" TEXT NOT NULL,
				"position" INTEGER NOT NULL DEFAULT 0,
				"created_at" TIMESTAMPTZ DEFAULT now()
			)`)
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS public.favorite_list_items (
				"list_id" TEXT NOT NULL,
				"game_id" TEXT NOT NULL,
				"added_at" TIMESTAMPTZ DEFAULT now(),
				CONSTRAINT "favorite_list_items_pk" PRIMARY KEY("list_id","game_id")
			)`)
		await db.execute(sql`CREATE INDEX IF NOT EXISTS favorite_lists_user_idx ON public.favorite_lists ("user_id")`)
	})().catch((/** @type {any} */ err) => { ensured = null; throw err })
	return ensured
}

/** A list name as it is kept: trimmed, one line, not too long @param {unknown} value */
export function cleanListName (value) {
	return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_LIST_NAME)
}

/**
 * Get all favorite game IDs for a user
 * @param {any} db
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
export async function getUserFavorites (db, userId) {
	if (!userId) return []
	const results = await db
		.select({ gameId: favorites.gameId })
		.from(favorites)
		.where(eq(favorites.userId, userId))

	return results.map((/** @type {any} */ r) => r.gameId)
}

/**
 * Add a favorite
 * @param {any} db
 * @param {string} userId
 * @param {string} gameId
 * @returns {Promise<void>}
 */
export async function addFavorite (db, userId, gameId) {
	if (!userId || !gameId) return
	await db
		.insert(favorites)
		.values({ userId, gameId })
		.onConflictDoNothing()
}

/**
 * Adds many at once, ignoring any already there. Used to carry the favourites a
 * person made before signing in over to their account
 * @param {any} db
 * @param {string} userId
 * @param {string[]} gameIds
 */
export async function addFavorites (db, userId, gameIds) {
	const ids = [...new Set(gameIds)].filter(id => /^[0-9A-Fa-f]{16}$/.test(id)).map(id => id.toUpperCase()).slice(0, 2000)
	if (!userId || ids.length === 0) return
	await db.insert(favorites).values(ids.map(gameId => ({ userId, gameId }))).onConflictDoNothing()
}

/**
 * Remove a favorite, and the game from every list of theirs
 * @param {any} db
 * @param {string} userId
 * @param {string} gameId
 * @returns {Promise<void>}
 */
export async function removeFavorite (db, userId, gameId) {
	if (!userId || !gameId) return
	await ensureTables(db)
	const lists = await db.select({ id: favoriteLists.id }).from(favoriteLists).where(eq(favoriteLists.userId, userId))
	if (lists.length) {
		await db.delete(favoriteListItems).where(and(
			eq(favoriteListItems.gameId, gameId),
			inArray(favoriteListItems.listId, lists.map((/** @type {any} */ l) => l.id))
		))
	}
	await db
		.delete(favorites)
		.where(
			and(
				eq(favorites.userId, userId),
				eq(favorites.gameId, gameId)
			)
		)
}

/**
 * The lists, each with the games in it
 * @param {any} db
 * @param {string} userId
 * @returns {Promise<Array<{ id: string, name: string, gameIds: string[] }>>}
 */
export async function getLists (db, userId) {
	if (!userId) return []
	await ensureTables(db)
	const lists = await db.select().from(favoriteLists).where(eq(favoriteLists.userId, userId)).orderBy(asc(favoriteLists.position), asc(favoriteLists.createdAt))
	if (lists.length === 0) return []
	const items = await db.select().from(favoriteListItems).where(inArray(favoriteListItems.listId, lists.map((/** @type {any} */ l) => l.id))).orderBy(asc(favoriteListItems.addedAt))
	return lists.map((/** @type {any} */ l) => ({
		id: l.id,
		name: l.name,
		gameIds: items.filter((/** @type {any} */ i) => i.listId === l.id).map((/** @type {any} */ i) => i.gameId)
	}))
}

/**
 * @param {any} db
 * @param {string} userId
 * @param {string} rawName
 * @returns {Promise<{ ok: true, list: { id: string, name: string, gameIds: string[] } } | { ok: false, reason: 'name' | 'limit' | 'taken' }>}
 */
export async function createList (db, userId, rawName) {
	await ensureTables(db)
	const name = cleanListName(rawName)
	if (!name) return { ok: false, reason: 'name' }
	const lists = await db.select().from(favoriteLists).where(eq(favoriteLists.userId, userId))
	if (lists.length >= MAX_LISTS) return { ok: false, reason: 'limit' }
	if (lists.some((/** @type {any} */ l) => l.name.toLowerCase() === name.toLowerCase())) return { ok: false, reason: 'taken' }
	const id = randomUUID()
	await db.insert(favoriteLists).values({ id, userId, name, position: lists.length })
	return { ok: true, list: { id, name, gameIds: [] } }
}

/**
 * @param {any} db
 * @param {string} userId
 * @param {string} listId
 * @param {string} rawName
 * @returns {Promise<'ok' | 'name' | 'taken' | 'missing'>}
 */
export async function renameList (db, userId, listId, rawName) {
	await ensureTables(db)
	const name = cleanListName(rawName)
	if (!name) return 'name'
	const lists = await db.select().from(favoriteLists).where(eq(favoriteLists.userId, userId))
	if (!lists.some((/** @type {any} */ l) => l.id === listId)) return 'missing'
	if (lists.some((/** @type {any} */ l) => l.id !== listId && l.name.toLowerCase() === name.toLowerCase())) return 'taken'
	await db.update(favoriteLists).set({ name }).where(and(eq(favoriteLists.id, listId), eq(favoriteLists.userId, userId)))
	return 'ok'
}

/** Deleting a list does not un-favourite its games @param {any} db @param {string} userId @param {string} listId */
export async function deleteList (db, userId, listId) {
	await ensureTables(db)
	const owned = await db.select({ id: favoriteLists.id }).from(favoriteLists).where(and(eq(favoriteLists.id, listId), eq(favoriteLists.userId, userId)))
	if (owned.length === 0) return
	await db.delete(favoriteListItems).where(eq(favoriteListItems.listId, listId))
	await db.delete(favoriteLists).where(eq(favoriteLists.id, listId))
}

/**
 * Puts a game in one of the person's lists, favouriting it if it is not already
 * @param {any} db
 * @param {string} userId
 * @param {string} listId
 * @param {string} gameId
 * @returns {Promise<boolean>} false when the list is not theirs
 */
export async function addToList (db, userId, listId, gameId) {
	await ensureTables(db)
	const owned = await db.select({ id: favoriteLists.id }).from(favoriteLists).where(and(eq(favoriteLists.id, listId), eq(favoriteLists.userId, userId)))
	if (owned.length === 0 || !gameId) return false
	await addFavorite(db, userId, gameId)
	await db.insert(favoriteListItems).values({ listId, gameId }).onConflictDoNothing()
	return true
}

/** @param {any} db @param {string} userId @param {string} listId @param {string} gameId */
export async function removeFromList (db, userId, listId, gameId) {
	await ensureTables(db)
	const owned = await db.select({ id: favoriteLists.id }).from(favoriteLists).where(and(eq(favoriteLists.id, listId), eq(favoriteLists.userId, userId)))
	if (owned.length === 0) return false
	await db.delete(favoriteListItems).where(and(eq(favoriteListItems.listId, listId), eq(favoriteListItems.gameId, gameId)))
	return true
}
