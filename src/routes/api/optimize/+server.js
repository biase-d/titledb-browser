import { error } from '@sveltejs/kit';
import { put, head } from '@vercel/blob';
import { processImage } from '$lib/server/image';
import { BLOB_READ_WRITE_TOKEN } from '$env/static/private';

/**
 * Generates a deterministic filename for the cache
 */
function generateCacheKey(url, width) {
	let hash = 0;
	for (let i = 0; i < url.length; i++) {
		const char = url.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	const safeHash = Math.abs(hash).toString(16);
	return `cache/${safeHash}-${width}.avif`;
}

export const GET = async ({ url }) => {
	const imageUrl = url.searchParams.get('url');
	const widthStr = url.searchParams.get('w');
	const width = parseInt(widthStr || '640', 10);

	if (!imageUrl) {
		throw error(400, 'Missing "url" parameter');
	}

	const cacheKey = generateCacheKey(imageUrl, width);
	
	const cachedRedirect = (location) => {
		return new Response(null, {
			status: 307,
			headers: {
				'Location': location,
				'Cache-Control': 'public, max-age=31536000, immutable' 
			}
		});
	};

	try {
		const blobDetails = await head(cacheKey, { token: BLOB_READ_WRITE_TOKEN });
		return cachedRedirect(blobDetails.url);
	} catch (e) {
		// Blob not found, proceed to process
	}

	try {
		console.log(`Optimizing: ${imageUrl} -> ${width}px`);
		const processedBuffer = await processImage(imageUrl, width);

		const blob = await put(cacheKey, processedBuffer, {
			access: 'public',
			token: BLOB_READ_WRITE_TOKEN,
			contentType: 'image/avif',
			cacheControlMaxAge: 31536000 
		});

		return cachedRedirect(blob.url);

	} catch (err) {
		console.error('Image optimization failed:', err);
		// Fallback: Temporary redirect to original (don't cache this long-term)
		return new Response(null, {
			status: 302,
			headers: { 'Location': imageUrl }
		});
	}
};