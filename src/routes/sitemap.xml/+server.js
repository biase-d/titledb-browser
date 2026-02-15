import * as gameRepo from '$lib/repositories/gameRepository'

/** @type {import('./$types').RequestHandler} */
export const GET = async ({ url, locals }) => {
    const allGames = await gameRepo.getGameIdsForSitemap(locals.db)

    const origin = url.origin

    /**
     * @param {string} str
     */
    const escapeXml = (str) =>
        str.replace(/[<>&"']/g, (c) => {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '"': return '&quot;';
                case "'": return '&apos;';
                default: return c;
            }
        });

    /**
     * @param {Date | string | null} date
     */
    const formatDate = (date) => {
        const d = date ? new Date(date) : new Date();
        return d.toISOString().split('T')[0];
    };

    const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${origin}/</loc>
        <priority>1.0</priority>
        <changefreq>daily</changefreq>
    </url>
    <url>
        <loc>${origin}/contribute</loc>
        <priority>0.8</priority>
        <changefreq>daily</changefreq>
    </url>
    <url>
        <loc>${origin}/stats</loc>
        <priority>0.7</priority>
        <changefreq>weekly</changefreq>
    </url>
    <url>
        <loc>${origin}/announcements</loc>
        <priority>0.5</priority>
        <changefreq>weekly</changefreq>
    </url>
    <url>
        <loc>${origin}/pending-verification</loc>
        <priority>0.4</priority>
        <changefreq>daily</changefreq>
    </url>
    ${allGames
            .map((game) => {
                const lastMod = formatDate(game.lastUpdated);
                return `<url>
        <loc>${origin}/title/${escapeXml(game.id)}</loc>
        <lastmod>${lastMod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.6</priority>
    </url>`
            })
            .join('')}
</urlset>`

    return new Response(xml.trim(), {
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'max-age=3600'
        }
    })
}
