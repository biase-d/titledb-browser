import { sql } from 'drizzle-orm'
import logger from '$lib/services/loggerService'

/**
 * Who is using the data API, and how much, so that someone using it heavily can
 * be found, asked, limited or cut off
 *
 * What is kept, per day and per user of the API: how many requests, how many of
 * them were turned away for going over the limit, when they were last seen, and
 * the User-Agent they sent. A "user" is a token (and so a GitHub login) or, for a
 * request with none, an IP address. Nothing else about a request is kept: not
 * what was asked for, not the answers. Rows older than RETAIN_DAYS are deleted
 *
 * Counts are gathered in memory and written in batches, so a request does not
 * cost a database write
 */

export const RETAIN_DAYS = 30
const FLUSH_EVERY_MS = 20_000

/** @typedef {{ day: string, subject: string, label: string, userAgent: string, requests: number, limited: number, lastSeen: number }} UsageEntry */

/** UTC date as YYYY-MM-DD @param {number} [now] */
export const dayOf = (now = Date.now()) => new Date(now).toISOString().slice(0, 10)

/**
 * The counts waiting to be written. A class with no database in it, so it can be tested
 */
export class UsageBuffer {
	constructor () {
		/** @type {Map<string, UsageEntry>} */
		this.entries = new Map()
	}

	/**
	 * @param {{ subject: string, label?: string, userAgent?: string, limited?: boolean, now?: number }} hit
	 */
	add ({ subject, label = '', userAgent = '', limited = false, now = Date.now() }) {
		const day = dayOf(now)
		const key = `${day}|${subject}`
		let entry = this.entries.get(key)
		if (!entry) {
			entry = { day, subject, label, userAgent: '', requests: 0, limited: 0, lastSeen: now }
			this.entries.set(key, entry)
		}
		entry.requests += 1
		if (limited) entry.limited += 1
		entry.lastSeen = now
		if (label) entry.label = label
		// A User-Agent is free text from the caller: only the start of it is kept
		if (userAgent) entry.userAgent = userAgent.slice(0, 160)
	}

	/** Hands over everything waiting and starts empty */
	drain () {
		const out = [...this.entries.values()]
		this.entries = new Map()
		return out
	}

	get size () { return this.entries.size }
}

const buffer = new UsageBuffer()

/** @type {Promise<void> | null} */
let ensured = null
/** @type {ReturnType<typeof setInterval> | null} */
let timer = null

/** @param {any} db */
function ensureTable (db) {
	ensured ??= (async () => {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS public.api_usage (
				"day" DATE NOT NULL,
				"subject" TEXT NOT NULL,
				"label" TEXT NOT NULL DEFAULT '',
				"user_agent" TEXT NOT NULL DEFAULT '',
				"requests" INTEGER NOT NULL DEFAULT 0,
				"limited" INTEGER NOT NULL DEFAULT 0,
				"last_seen" TIMESTAMPTZ NOT NULL DEFAULT now(),
				PRIMARY KEY ("day", "subject")
			)`)
	})().catch((/** @type {any} */ err) => { ensured = null; throw err })
	return ensured
}

/** Writes what has been counted. A failure puts the counts back for the next try @param {any} db */
export async function flushUsage (db) {
	if (buffer.size === 0) return
	const batch = buffer.drain()
	try {
		await ensureTable(db)
		for (const e of batch) {
			await db.execute(sql`
				INSERT INTO public.api_usage ("day", "subject", "label", "user_agent", "requests", "limited", "last_seen")
				VALUES (${e.day}, ${e.subject}, ${e.label}, ${e.userAgent}, ${e.requests}, ${e.limited}, ${new Date(e.lastSeen).toISOString()}::timestamptz)
				ON CONFLICT ("day", "subject") DO UPDATE SET
					"requests" = api_usage."requests" + EXCLUDED."requests",
					"limited" = api_usage."limited" + EXCLUDED."limited",
					"last_seen" = GREATEST(api_usage."last_seen", EXCLUDED."last_seen"),
					"label" = CASE WHEN EXCLUDED."label" <> '' THEN EXCLUDED."label" ELSE api_usage."label" END,
					"user_agent" = CASE WHEN EXCLUDED."user_agent" <> '' THEN EXCLUDED."user_agent" ELSE api_usage."user_agent" END`)
		}
		await db.execute(sql`DELETE FROM public.api_usage WHERE "day" < (now() AT TIME ZONE 'utc')::date - ${RETAIN_DAYS}::int`)
	} catch (err) {
		for (const e of batch) {
			// Put back what could not be written; a card that was counted in the meantime merges
			buffer.add({ subject: e.subject, label: e.label, userAgent: e.userAgent, now: e.lastSeen })
			const back = buffer.entries.get(`${e.day}|${e.subject}`)
			if (back) { back.requests += e.requests - 1; back.limited += e.limited }
		}
		throw err
	}
}

/**
 * Counts a request by an API user. Not for the site's own pages
 * @param {any} db
 * @param {{ subject: string, label?: string, userAgent?: string, limited?: boolean }} hit
 */
export function recordUsage (db, hit) {
	buffer.add(hit)
	if (!timer) {
		timer = setInterval(() => {
			flushUsage(db).catch((/** @type {any} */ err) => logger.warn('Could not write API usage counts; will retry', { error: err?.message }))
		}, FLUSH_EVERY_MS)
		// Not a reason to keep the process alive
		timer.unref?.()
	}
}

/**
 * The heaviest users over the last few days
 * @param {any} db
 * @param {number} days
 * @returns {Promise<Array<{ subject: string, label: string, userAgent: string, requests: number, limited: number, days: number, lastSeen: Date }>>}
 */
export async function topUsers (db, days = 7) {
	await flushUsage(db).catch(() => {})
	await ensureTable(db)
	const rows = await db.execute(sql`
		SELECT "subject",
			MAX("label") AS "label",
			MAX("user_agent") AS "userAgent",
			SUM("requests")::int AS "requests",
			SUM("limited")::int AS "limited",
			COUNT(*)::int AS "days",
			MAX("last_seen") AS "lastSeen"
		FROM public.api_usage
		WHERE "day" >= (now() AT TIME ZONE 'utc')::date - ${Math.max(1, Math.min(RETAIN_DAYS, days))}::int
		GROUP BY "subject"
		ORDER BY SUM("requests") DESC
		LIMIT 50`)
	return [...rows]
}
