import { users } from '$lib/db/schema'
import { eq, sql } from 'drizzle-orm'

const KARMA_APPROVAL_THRESHOLD = 10

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
 * Check whether a user's karma qualifies them for optimistic approval.
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function hasOptimisticApproval (db, userId) {
	const [row] = await db
		.select({ karma: users.karma })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1)

	return (row?.karma ?? 0) > KARMA_APPROVAL_THRESHOLD
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
