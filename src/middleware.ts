import { next } from '@vercel/edge';
import { titleIdUrl, nameUrl } from '$lib/index.js';

const BOT_USER_AGENTS = [
    'Twitterbot',
'facebookexternalhit',
'LinkedInBot',
'Discordbot',
'Slackbot',
'Pinterest'
];

export async function middleware(request) {
    const userAgent = request.headers.get('user-agent') || '';
    const url = new URL(request.url);

    const isBot = BOT_USER_AGENTS.some(bot => userAgent.includes(bot));
    const isTitlePage = url.pathname.startsWith('/title/');

    if (isBot && isTitlePage) {
        try {
            const id = url.pathname.split('/')[2];
            if (!id) return next();

            const [nameRes, detailRes] = await Promise.all([
                fetch(nameUrl(id)),
                                                           fetch(titleIdUrl(id))
            ]);

            if (!nameRes.ok || !detailRes.ok) {
                return next();
            }

            const nameData = await nameRes.json();
            const titleData = await detailRes.json();
            const names = nameData.names || [id];
            const name = names[0];

            const appHtmlRes = await fetch(request.url);
            let appHtml = await appHtmlRes.text();

            const metaTags = `
            <title>${name} - Titledb Browser</title>
            <meta name="description" content="${titleData.description?.replace(/"/g, '"') || `Details for ${name} (${id})`}" />
            <meta property="og:title" content="${name} - Titledb Browser" />
            <meta property="og:description" content="${titleData.description?.replace(/"/g, '"') || `Details for ${name} (${id})`}" />
            <meta property="og:image" content="${titleData.bannerUrl || titleData.iconUrl}" />
            <meta property="twitter:card" content="summary_large_image" />
            `;

            appHtml = appHtml.replace(/<title>.*?<\/title>/, metaTags);

            return new Response(appHtml, {
                headers: { 'Content-Type': 'text/html' },
            });

        } catch (error) {
            console.error('Error in middleware:', error);
            return next();
        }
    }

    return next();
}