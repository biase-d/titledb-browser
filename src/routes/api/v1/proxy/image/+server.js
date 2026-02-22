import { error } from '@sveltejs/kit'
import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import logger from '$lib/services/loggerService'

/** @type {import('./$types').RequestHandler} */
export async function GET ({ url }) {
	const imageUrl = url.searchParams.get('url')
	const width = parseInt(url.searchParams.get('w') || '0')
	const height = parseInt(url.searchParams.get('h') || '0')

	if (!imageUrl) {
		throw error(400, 'Missing url parameter')
	}

	// Only allow specific domains for security
	const allowedDomains = [
		'img-eshop.cdn.nintendo.net',
		'nintendo.net',
		'raw.githubusercontent.com'
	]

	const isAllowed = allowedDomains.some(domain => imageUrl.includes(domain))
	if (!isAllowed) {
		throw error(403, 'Domain not allowed')
	}

	// Cache directory setup
	const CACHE_DIR = path.resolve('data/cache/images')
	const hash = Buffer.from(`${imageUrl}_${width}_${height}`).toString('base64url')
	const cachePath = path.join(CACHE_DIR, `${hash}.webp`)

	try {
		// Try to serve from cache
		try {
			const stats = await fs.stat(cachePath)
			if (stats.isFile()) {
				const buffer = await fs.readFile(cachePath)
				return new Response(buffer, {
					headers: {
						'Content-Type': 'image/webp',
						'Cache-Control': 'public, max-age=31536000, immutable'
					}
				})
			}
		} catch (e) {
			// File doesn't exist, proceed to fetch
		}

		const response = await fetch(imageUrl)
		if (!response.ok) {
			throw error(response.status, 'Failed to fetch image')
		}

		let buffer = Buffer.from(await response.arrayBuffer())

		// Process image with sharp if dimensions are provided
		let pipeline = sharp(buffer)
		if (width > 0 || height > 0) {
			logger.info(`Resizing ${imageUrl} to ${width}x${height}`, { imageUrl, width, height })
			pipeline = pipeline.resize(width || null, height || null, {
				withoutEnlargement: true,
				fit: 'cover'
			})
		}

		// Convert to webp for better compression
		const processedBuffer = await pipeline.webp({ quality: 80 }).toBuffer()

		// Save to cache (don't block the response)
		fs.mkdir(CACHE_DIR, { recursive: true }).then(() => {
			fs.writeFile(cachePath, processedBuffer).catch(err => {
				logger.error('Proxy cache save error', err, { cachePath })
			})
		})

		return new Response(processedBuffer, {
			headers: {
				'Content-Type': 'image/webp',
				'Access-Control-Allow-Origin': '*',
				'Cache-Control': 'public, max-age=31536000, immutable'
			}
		})
	} catch (e) {
		const err = e instanceof Error ? e : new Error(String(e))
		logger.error('Proxy error processing image', err, { imageUrl })
		throw error(500, 'Internal server error')
	}
}
