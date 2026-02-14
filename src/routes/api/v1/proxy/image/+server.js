import { error } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
    const imageUrl = url.searchParams.get('url');
    if (!imageUrl) {
        throw error(400, 'Missing url parameter');
    }

    // Only allow specific domains for security
    const allowedDomains = [
        'img-eshop.cdn.nintendo.net',
        'nintendo.net',
        'raw.githubusercontent.com'
    ];

    const isAllowed = allowedDomains.some(domain => imageUrl.includes(domain));
    if (!isAllowed) {
        throw error(403, 'Domain not allowed');
    }

    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw error(response.status, 'Failed to fetch image');
        }

        const contentType = response.headers.get('content-type');
        const buffer = await response.arrayBuffer();

        return new Response(buffer, {
            headers: {
                'Content-Type': contentType || 'image/jpeg',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=86400' // Cache for 1 day
            }
        });
    } catch (e) {
        console.error('[Proxy] Error fetching image:', e);
        throw error(500, 'Internal server error');
    }
}
