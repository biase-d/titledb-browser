/**
 * Finds the icon for a title that titledb has none for, on Nintendo's store, the
 * first time somebody asks for that title
 *
 * Done on demand and one title at a time, not as a sweep: the titles that never
 * get opened never cost Nintendo a request, and each one that does is asked
 * about once. Whatever is found is stored in public.icon_lookups, which the
 * active_games view lays over the layer, so it survives a rebuild
 *
 * ec.nintendo.com/apps/<title id>/<region> redirects to the product page, and
 * that page carries the square product image in its page data
 */
import { sql } from 'drizzle-orm'
import { ensureIconStore } from '$lib/pipeline/schema-manager.js'
import logger from '$lib/services/loggerService'

/**
 * Stores asked in turn until one has the title. Only ones whose page carries the square
 * product image in the same page data: the US and Canadian stores. The others redirect
 * to pages without it (GB, DE), to the older eShop host with only a wide banner (AU, HK),
 * or into a waiting room (JP)
 */
const REGIONS = ['US', 'CA']
const SPACING_MS = 1500
const MAX_QUEUED = 50
const TIMEOUT_MS = 10_000
/** A title the store does not have is asked about again after this long, longer each time */
const MISS_RETRY_DAYS = 14
/** A failure that is not about the title (the store was busy, queued us) is retried soon */
const TRANSIENT_RETRY_MINUTES = 60
const SQUARE_KEY = 'productImage({"shape":"square"})'

/**
 * The square image of the page's own product. The page data holds the products it
 * recommends too, so the one wanted is picked by being the first nsuid on the page
 * @param {string} html
 * @returns {string | null}
 */
export function extractSquareIcon (html) {
	const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
	if (!match) return null

	const mainNsuid = match[1].match(/"nsuid":"(\d+)"/)?.[1]
	if (!mainNsuid) return null

	/** @type {any} */
	let data
	try {
		data = JSON.parse(match[1])
	} catch {
		return null
	}

	/** @type {string | null} */
	let found = null
	/** @param {any} node */
	const walk = (node) => {
		if (found || !node || typeof node !== 'object') return
		if (node.nsuid === mainNsuid && typeof node[SQUARE_KEY]?.url === 'string') {
			found = node[SQUARE_KEY].url
			return
		}
		for (const value of Object.values(node)) walk(value)
	}
	walk(data)

	// Only ever one of Nintendo's own image hosts, whatever the page says
	if (found && /^https:\/\/assets\.nintendo\.com\//.test(found)) return found
	return null
}

/**
 * @param {string} titleId
 * @param {string} region
 * @returns {Promise<{ icon: string | null, transient: boolean }>}
 */
async function lookupIn (titleId, region) {
	try {
		const response = await fetch(`https://ec.nintendo.com/apps/${encodeURIComponent(titleId)}/${region}`, {
			headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SwitchPerformance/1.0)', Accept: 'text/html' },
			signal: AbortSignal.timeout(TIMEOUT_MS)
		})
		// Another region's store, or the waiting room, is not an answer about this title
		if (!response.ok || new URL(response.url).hostname !== 'www.nintendo.com') {
			return { icon: null, transient: response.status !== 404 }
		}
		return { icon: extractSquareIcon(await response.text()), transient: false }
	} catch (e) {
		logger.warn('Icon lookup failed', { titleId, error: e instanceof Error ? e.message : String(e) })
		return { icon: null, transient: true }
	}
}

/**
 * The first store with an icon for the title. A store that is merely busy ends the
 * search as transient: the title is asked about again soon rather than written off
 * @param {string} titleId
 * @returns {Promise<{ icon: string | null, transient: boolean }>}
 */
async function lookup (titleId) {
	for (const region of REGIONS) {
		const result = await lookupIn(titleId, region)
		if (result.icon || result.transient) return result
		await sleep(SPACING_MS)
	}
	return { icon: null, transient: false }
}

/** @type {Promise<void> | null} */
let storeReady = null

/** Once per process, and tried again after a failure @param {any} db */
function ensureStore (db) {
	storeReady ??= ensureIconStore(db.$client).catch((e) => {
		storeReady = null
		throw e
	})
	return storeReady
}

/** @type {Set<string>} */
const pending = new Set()
let chain = Promise.resolve()

/** @param {number} ms */
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Asks for the icon of a title that has none, unless it has been asked about
 * lately. Never waits and never throws: the page that triggered it carries on,
 * and the icon is there the next time the title is opened
 *
 * With `replacing`, the title has an icon that turned out to be gone, and the store's
 * current one is looked for in its place
 *
 * @param {any} db
 * @param {{ id: string, iconUrl?: string | null }} game
 * @param {{ replacing?: string }} [options]
 */
export function ensureIcon (db, game, options = {}) {
	const { replacing } = options
	if (!game?.id || (game.iconUrl && !replacing) || pending.has(game.id) || pending.size >= MAX_QUEUED) return
	pending.add(game.id)

	chain = chain.then(async () => {
		try {
			await ensureStore(db)
			const [row] = await db.execute(sql`
				SELECT icon_url, attempts, retry_after FROM public.icon_lookups WHERE game_id = ${game.id}
			`)
			if (row?.icon_url && row.icon_url !== replacing) return
			if (row?.retry_after && new Date(row.retry_after) > new Date()) return

			const { icon, transient } = await lookup(game.id)
			const attempts = (row?.attempts ?? 0) + (transient ? 0 : 1)
			const retryAfter = icon
				? null
				: transient
					? new Date(Date.now() + TRANSIENT_RETRY_MINUTES * 60_000)
					: new Date(Date.now() + MISS_RETRY_DAYS * Math.min(attempts, 4) * 86_400_000)

			await db.execute(sql`
				INSERT INTO public.icon_lookups (game_id, icon_url, attempts, retry_after, checked_at)
				VALUES (${game.id}, ${icon}, ${attempts}, ${retryAfter}, now())
				ON CONFLICT (game_id) DO UPDATE
				SET icon_url = EXCLUDED.icon_url, attempts = EXCLUDED.attempts,
					retry_after = EXCLUDED.retry_after, checked_at = now()
			`)
			if (icon) logger.info('Found a store icon for a title without one', { titleId: game.id })
			await sleep(SPACING_MS)
		} catch (e) {
			logger.warn('Icon backfill failed', { titleId: game.id, error: e instanceof Error ? (e.cause instanceof Error ? e.cause.message : e.message) : String(e) })
		} finally {
			pending.delete(game.id)
		}
	})
}

/** @type {Map<string, number>} */
const repaired = new Map()
const REPAIR_INTERVAL_MS = 6 * 60 * 60 * 1000

/**
 * An icon the proxy found Nintendo no longer has: the titles that point at it get
 * the store's current one. Never waits and never throws
 *
 * @param {any} db
 * @param {string} deadUrl
 */
export async function repairDeadIcon (db, deadUrl) {
	// Every request for the dead image arrives here: once in a while is enough
	const last = repaired.get(deadUrl)
	if (last && Date.now() - last < REPAIR_INTERVAL_MS) return
	if (repaired.size >= 2000) repaired.clear()
	repaired.set(deadUrl, Date.now())

	try {
		const rows = await db.execute(sql`
			SELECT id FROM public.active_games WHERE icon_url = ${deadUrl} LIMIT 5
		`)
		for (const row of rows) ensureIcon(db, { id: row.id, iconUrl: deadUrl }, { replacing: deadUrl })
	} catch (e) {
		logger.warn('Dead icon repair failed', { deadUrl, error: e instanceof Error ? e.message : String(e) })
	}
}
