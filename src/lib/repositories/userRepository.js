import { users } from '$lib/db/schema'
import { eq, sql } from 'drizzle-orm'

/**
 * Upsert a user record and return their current karma.
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {{ id: string, login: string }} user
 * @returns {Promise<number>}
 */
export async function upsertUserAndGetKarma (db, { id, login }) {
	const result = await db
		.insert(users)
		.values({ id, login, lastSeenAt: sql`now()` })
		.onConflictDoUpdate({
			target: users.id,
			set: { lastSeenAt: sql`now()` }
		})
		.returning({ karma: users.karma })

	return result[0]?.karma ?? 0
}

/**
 * Increment a user's karma by the given amount.
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string} userId
 * @param {number} [amount=1]
 * @returns {Promise<void>}
 */
export async function incrementKarma (db, userId, amount = 1) {
	await db
		.update(users)
		.set({ karma: sql`${users.karma} + ${amount}` })
		.where(eq(users.id, userId))
}
