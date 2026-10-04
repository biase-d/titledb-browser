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
