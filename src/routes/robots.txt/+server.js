/** @type {import('./$types').RequestHandler} */
export const GET = ({ url }) => {
    const body = `User-agent: *
Allow: /
Allow: /contribute$
Disallow: /api/
Disallow: /api
# Googlebot renders a page before judging it, and every piece of artwork on the
# site is served through the image proxy. Blocking those meant it rendered the
# pages with the images missing. They still carry X-Robots-Tag: noindex, so they
# are fetched for rendering without being indexed themselves
Allow: /api/v1/proxy/image
Allow: /api/og/
Disallow: /auth/
Disallow: /auth
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
