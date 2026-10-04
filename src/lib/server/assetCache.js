/**
 * @file Derived Asset Cache
 * @description Read-through cache for things the server computes from other
 * sources: resized artwork and rendered OG cards
 *
 * These used to be written to `data/cache/images` on local disk, which was
 * useless on a serverless host (the disk went away between invocations) and is
 * awkward on a container (the cache dies with every redeploy unless a volume is
 * mounted, and is not shared between replicas). The object store fixes both
 *
 * Storage is optional. With none configured every call just recomputes, which
 * is slower but always correct — a cache must never be the reason a request fails
 */

import { getStorage } from '$lib/storage/context'
import logger from '$lib/services/loggerService'
import crypto from 'node:crypto'

/**
 * In-flight fetches by source URL to coalesce concurrent requests
 * @type {Map<string, Promise<{ body: Buffer, contentType: string }>>}
 */
const inFlightSources = new Map()

/**
 * In-memory LRU cache of recently fetched source images to avoid re-reading
 * disk/S3 or hitting Nintendo repeatedly during rapid multi-variant requests
 * @type {Map<string, { body: Buffer, contentType: string }>}
 */
const sourceMemoryCache = new Map()
const SOURCE_MEMORY_LIMIT = 100

/**
 * @param {string} url
 * @param {{ body: Buffer, contentType: string }} entry
 */
function rememberSource (url, entry) {
	if (sourceMemoryCache.size >= SOURCE_MEMORY_LIMIT) {
		const oldest = sourceMemoryCache.keys().next().value
		if (oldest !== undefined) sourceMemoryCache.delete(oldest)
	}
	sourceMemoryCache.set(url, entry)
}

/**
 * Sources Nintendo answered 404 or 410 for, and when to ask again. A dead image
 * is requested by every visitor to every page that shows it, and each of those
 * would otherwise be a request to Nintendo for something known to be gone
 * @type {Map<string, { status: number, until: number }>}
 */
const deadSources = new Map()
const DEAD_SOURCE_MS = 6 * 60 * 60 * 1000
const DEAD_SOURCE_LIMIT = 2000

/**
 * Clears in-memory source cache and in-flight map (primarily for unit tests)
 */
export function _clearSourceCacheForTesting () {
	sourceMemoryCache.clear()
	inFlightSources.clear()
	deadSources.clear()
	upstreamActive = 0
	upstreamWaiting.length = 0
}

/** Upstream fetches in flight at once, so a page of cold images does not hammer Nintendo and get throttled */
const UPSTREAM_CONCURRENCY = 6
let upstreamActive = 0
/** @type {Array<() => void>} */
const upstreamWaiting = []

async function acquireUpstream () {
	if (upstreamActive >= UPSTREAM_CONCURRENCY) {
		await new Promise(resolve => upstreamWaiting.push(() => resolve(undefined)))
	}
	upstreamActive++
}

function releaseUpstream () {
	upstreamActive--
	upstreamWaiting.shift()?.()
}

/** @param {number} ms */
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

/**
 * One upstream fetch, retried on network errors, timeouts, 429 and 5xx: those
 * are what a burst of cold requests produces, and a failure here is not cached,
 * so without a retry the reader sees a blank image until they come back
 * @param {string} url
 */
async function fetchUpstream (url) {
	const attempts = 3
	for (let attempt = 1; ; attempt++) {
		await acquireUpstream()
		try {
			logger.info('Fetching upstream source image', { imageUrl: url, attempt })
			const response = await fetch(url, { signal: AbortSignal.timeout(15_000) })
			const transient = response.status === 429 || response.status >= 500
			if (!transient || attempt === attempts) return response
		} catch (e) {
			if (attempt === attempts) throw e
		} finally {
			releaseUpstream()
		}
		await sleep(300 * attempt ** 2)
	}
}

/** @param {number} status @param {string} message */
function upstreamError (status, message) {
	const err = new Error(message)
	// @ts-ignore
	err.status = status
	return err
}

/**
 * Fetches the upstream image exactly once, caching the original bytes in
 * storage (and memory) so all resized variants and full-res requests reuse it.
 *
 * @param {string} imageUrl
 * @returns {Promise<{ body: Buffer, contentType: string }>}
 */
export async function getSourceImage (imageUrl) {
	const cleanUrl = imageUrl.trim()

	// 0. Known to be gone, so not asked about again for a while
	const dead = deadSources.get(cleanUrl)
	if (dead) {
		if (dead.until > Date.now()) throw upstreamError(dead.status, 'Not found upstream')
		deadSources.delete(cleanUrl)
	}

	// 1. In-memory cache hit
	if (sourceMemoryCache.has(cleanUrl)) {
		return /** @type {{ body: Buffer, contentType: string }} */ (sourceMemoryCache.get(cleanUrl))
	}

	// 2. Coalesce concurrent requests for the exact same source image
	if (inFlightSources.has(cleanUrl)) {
		return await inFlightSources.get(cleanUrl)
	}

	const task = (async () => {
		const digest = crypto.createHash('sha256').update(cleanUrl).digest('hex')
		const key = `sources/${digest.slice(0, 2)}/${digest}.raw`
		const storage = getStorage()

		// 3. Persistent storage hit (S3 / local filesystem)
		if (storage) {
			try {
				const found = await storage.get(key)
				if (found?.body?.length) {
					const entry = {
						body: found.body,
						contentType: found.contentType || 'image/jpeg'
					}
					rememberSource(cleanUrl, entry)
					return entry
				}
			} catch (e) {
				logger.warn('Source asset cache read failed', { key, error: e instanceof Error ? e.message : String(e) })
			}
		}

		// 4. Fetch upstream from Nintendo / origin server
		const response = await fetchUpstream(cleanUrl)
		if (!response.ok) {
			if (response.status === 404 || response.status === 410) {
				if (deadSources.size >= DEAD_SOURCE_LIMIT) deadSources.clear()
				deadSources.set(cleanUrl, { status: response.status, until: Date.now() + DEAD_SOURCE_MS })
			}
			const status = response.status >= 400 && response.status < 500 ? response.status : 502
			throw upstreamError(status, `Failed to fetch image from upstream: ${response.status} ${response.statusText}`)
		}

		const contentType = response.headers.get('content-type') || 'application/octet-stream'
		const body = Buffer.from(await response.arrayBuffer())
		const entry = { body, contentType }

		rememberSource(cleanUrl, entry)

		// 5. Store in persistent storage so we never hit Nintendo again for this URL
		if (storage) {
			try {
				await storage.upload({
					key,
					data: body,
					contentType,
					public: true,
					cacheControl: 31536000
				})
			} catch (e) {
				logger.warn('Source asset cache write failed', { key, error: e instanceof Error ? e.message : String(e) })
			}
		}

		return entry
	})()

	inFlightSources.set(cleanUrl, task)
	try {
		return await task
	} finally {
		inFlightSources.delete(cleanUrl)
	}
}

/**
 * @param {string} key - Object key, e.g. `images/<hash>.webp`
 * @param {string} contentType
 * @param {() => Promise<Buffer>} produce - Called only on a miss
 * @returns {Promise<{ body: Buffer, hit: boolean }>}
 */
export async function cached (key, contentType, produce) {
	const storage = getStorage()

	if (storage) {
		try {
			const found = await storage.get(key)
			if (found?.body?.length) return { body: found.body, hit: true }
		} catch (e) {
			// A read failure is a miss, not an error: fall through and recompute
			logger.warn('Asset cache read failed', { key, error: e instanceof Error ? e.message : String(e) })
		}
	}

	const body = await produce()

	if (storage) {
		try {
			await storage.upload({
				key,
				data: body,
				contentType,
				public: true,
				cacheControl: 31536000
			})
		} catch (e) {
			// Serving the bytes we just computed matters more than storing them
			logger.warn('Asset cache write failed', { key, error: e instanceof Error ? e.message : String(e) })
		}
	}

	return { body, hit: false }
}
