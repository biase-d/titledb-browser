import { error } from '@sveltejs/kit'
import crypto from 'node:crypto'
import sharp from 'sharp'
import { cached } from '$lib/server/assetCache'
import logger from '$lib/services/loggerService'

// Matched against the parsed hostname. The previous check was a substring test
// on the whole URL, so `https://evil.com/?x=nintendo.net` passed it and the
// endpoint would fetch anything an attacker named
const ALLOWED_HOSTS = new Set(['raw.githubusercontent.com'])
const ALLOWED_SUFFIXES = ['.nintendo.net', '.nintendo.com']

/** @param {string} value */
function isAllowedHost (value) {
	let parsed
	try {
		parsed = new URL(value)
	} catch {
		return false
	}
	if (parsed.protocol !== 'https:') return false
	if (ALLOWED_HOSTS.has(parsed.hostname)) return true
	return ALLOWED_SUFFIXES.some(suffix => parsed.hostname.endsWith(suffix))
}

/** @type {import('./$types').RequestHandler} */
export async function GET ({ url }) {
	const imageUrl = url.searchParams.get('url')
	const width = parseInt(url.searchParams.get('w') || '0')
	const height = parseInt(url.searchParams.get('h') || '0')

	if (!imageUrl) throw error(400, 'Missing url parameter')
	if (!isAllowedHost(imageUrl)) throw error(403, 'Domain not allowed')

	// Hashed, so the key length does not grow with the source URL. sha256 rather
	// than base64 of the URL, which produced keys long enough to be awkward
	const digest = crypto.createHash('sha256').update(`${imageUrl}_${width}_${height}`).digest('hex')
	const key = `images/${digest.slice(0, 2)}/${digest}.webp`

	try {
		const { body } = await cached(key, 'image/webp', async () => {
			const response = await fetch(imageUrl)
			if (!response.ok) throw error(response.status, 'Failed to fetch image')

			let pipeline = sharp(Buffer.from(await response.arrayBuffer()))
			if (width > 0 || height > 0) {
				pipeline = pipeline.resize(width || null, height || null, {
					withoutEnlargement: true,
					fit: 'cover'
				})
			}
			return await pipeline.webp({ quality: 80 }).toBuffer()
		})

		return new Response(body, {
			headers: {
				'Content-Type': 'image/webp',
				'Access-Control-Allow-Origin': '*',
				'Cache-Control': 'public, max-age=31536000, immutable'
			}
		})
	} catch (e) {
		// A thrown SvelteKit error already carries the right status
		if (e && typeof e === 'object' && 'status' in e) throw e
		const err = e instanceof Error ? e : new Error(String(e))
		logger.error('Proxy error processing image', err, { imageUrl })
		throw error(500, 'Internal server error')
	}
}
