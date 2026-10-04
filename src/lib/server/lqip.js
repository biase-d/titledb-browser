/**
 * @file Low Quality Image Placeholder
 * @description The blurred hint of an image, small enough to inline
 *
 * A 16px wide WebP is a few hundred bytes, which is cheaper to put in the HTML
 * than to fetch: inlined it paints with the first byte of the page, where a
 * request for it would arrive after a round trip and leave the card empty until
 * then. That is the whole point - the reader sees the shape and colour of the
 * artwork immediately, and the real image replaces it when it arrives
 *
 * Rendering a page must never wait on making one. A cold cache returns nothing
 * and schedules the work, so the first visitor gets no placeholder and everyone
 * after gets one. Fetching and resizing fifty images inline would turn a fast
 * page into a slow one, which is the opposite of the point
 */

import crypto from 'node:crypto'
import sharp from 'sharp'
import { getStorage } from '$lib/storage/context'
import logger from '$lib/services/loggerService'

/** Wide enough to read as the image, small enough to inline */
const WIDTH = 16
const QUALITY = 45

/** Placeholders already in hand, as complete data URIs */
const memo = new Map()
const MEMO_LIMIT = 4000

/** Source URLs currently being generated, so a busy page asks once */
const inFlight = new Set()

/** @param {string} sourceUrl */
function keyFor (sourceUrl) {
	const digest = crypto.createHash('sha256').update(sourceUrl).digest('hex')
	return `lqip/${digest.slice(0, 2)}/${digest}.webp`
}

/** @param {Buffer} body */
function toDataUri (body) {
	return `data:image/webp;base64,${body.toString('base64')}`
}

/** @param {string} sourceUrl @param {string|null} value */
function remember (sourceUrl, value) {
	// Oldest out first. A Map iterates in insertion order, so the first key is
	// the least recently added
	if (memo.size >= MEMO_LIMIT) {
		const oldest = memo.keys().next().value
		if (oldest !== undefined) memo.delete(oldest)
	}
	memo.set(sourceUrl, value)
}

/**
 * Make the placeholder and put it in the object store. Never throws
 * @param {string} sourceUrl
 */
async function generate (sourceUrl) {
	if (inFlight.has(sourceUrl)) return
	inFlight.add(sourceUrl)

	try {
		const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(10_000) })
		if (!response.ok) return

		const body = await sharp(Buffer.from(await response.arrayBuffer()))
			.resize(WIDTH, null, { withoutEnlargement: true })
			.webp({ quality: QUALITY })
			.toBuffer()

		remember(sourceUrl, toDataUri(body))

		const storage = getStorage()
		if (storage) {
			await storage.upload({ key: keyFor(sourceUrl), data: body, contentType: 'image/webp', cacheControl: 31536000 })
		}
	} catch (e) {
		// A placeholder is decoration. Remember the failure so a broken URL is
		// not retried on every render, and say nothing louder than a warning
		remember(sourceUrl, null)
		logger.warn('Could not build an image placeholder', {
			sourceUrl,
			error: e instanceof Error ? e.message : String(e)
		})
	} finally {
		inFlight.delete(sourceUrl)
	}
}

/**
 * The placeholder for an image, if one can be had without waiting
 *
 * Returns null rather than generating on the spot, and schedules the work so
 * the next render has it
 *
 * @param {string|null|undefined} sourceUrl
 * @returns {Promise<string|null>} A data URI, or null
 */
export async function lqipFor (sourceUrl) {
	if (!sourceUrl) return null

	if (memo.has(sourceUrl)) return memo.get(sourceUrl) ?? null

	const storage = getStorage()
	if (!storage) {
		// Nowhere to keep it, so generating on every render would mean
		// refetching the source image on every render
		return null
	}

	try {
		const found = await storage.get(keyFor(sourceUrl))
		if (found?.body?.length) {
			const uri = toDataUri(found.body)
			remember(sourceUrl, uri)
			return uri
		}
	} catch {
		// Treat as a miss
	}

	// Not there yet: schedule it and render this page without one
	generate(sourceUrl).catch(() => {})
	return null
}

/** Which URL field produces which placeholder field */
const FIELDS = {
	iconUrl: 'iconLqip',
	bannerUrl: 'bannerLqip'
}

/**
 * Attach placeholders to a list of games
 *
 * Runs the lookups together rather than one after another: they are all local
 * object-store reads or memory hits, so the whole list costs about as much as
 * the slowest one
 *
 * @template {Record<string, any>} T
 * @param {T[]} games
 * @param {Array<keyof FIELDS>} [fields] - Which images to make placeholders for
 * @returns {Promise<T[]>}
 */
export async function withPlaceholders (games, fields = ['iconUrl']) {
	if (!Array.isArray(games) || games.length === 0) return games

	return await Promise.all(games.map(async (game) => {
		const found = await Promise.all(
			fields.map(field => lqipFor(game?.[field]))
		)

		/** @type {Record<string, string|null>} */
		const added = {}
		fields.forEach((field, i) => {
			added[FIELDS[field]] = found[i]
		})

		return { ...game, ...added }
	}))
}
