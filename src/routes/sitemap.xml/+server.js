import { db } from '$lib/db';
import { games } from '$lib/db/schema';
import { desc } from 'drizzle-orm';

export const GET = async ({ url }) => {
	const allGames = await db
		.select({
			id: games.id,
			lastUpdated: games.lastUpdated
		})
		.from(games)
		.orderBy(desc(games.lastUpdated));

	const origin = url.origin;

	const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<urlset
    xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
    xmlns:xhtml="http://www.w3.org/1999/xhtml"
    xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
    xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
    xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"
>
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
    ${allGames
		.map((game) => {
			const lastMod = game.lastUpdated 
                ? new Date(game.lastUpdated).toISOString() 
                : new Date().toISOString();
			return `
    <url>
        <loc>${origin}/title/${game.id}</loc>
        <lastmod>${lastMod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.6</priority>
    </url>`;
		})
		.join('')}
</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600' // Cache for 1 hour
		}
	});
};