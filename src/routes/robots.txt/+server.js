/** @type {import('./$types').RequestHandler} */
export const GET = ({ url }) => {
    const body = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /favorites
Disallow: /contribute/
Disallow: /pending-verification

Sitemap: ${url.origin}/sitemap.xml`

    return new Response(body, {
        headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'max-age=86400'
        }
    })
}
