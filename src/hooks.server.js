import { titleIdUrl, nameUrl } from '$lib/index.js';

const BOT_USER_AGENTS = [
    'Twitterbot', 'facebookexternalhit', 'LinkedInBot',
'Discordbot', 'Slackbot', 'Pinterest', 'WhatsApp'
];

function escapeHtml(str = '') {
    return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    const userAgent = event.request.headers.get('user-agent') || '';
    const accept = event.request.headers.get('accept') || '';

    const isBot = BOT_USER_AGENTS.some(bot =>
    userAgent.toLowerCase().includes(bot.toLowerCase())
    );

    const wantsHtml = accept.includes('text/html');
    const isPreviewBot = isBot && wantsHtml;

    const isTitlePage = event.url.pathname.startsWith('/title/');

    if (isPreviewBot && isTitlePage) {
        try {
            const id = event.url.pathname.split('/')[2];
            if (!id) return resolve(event);

            const [nameRes, detailRes] = await Promise.all([
                fetch(nameUrl(id)),
                                                           fetch(titleIdUrl(id))
            ]);

            if (!nameRes.ok || !detailRes.ok) return resolve(event);

            const nameData = await nameRes.json();
            const titleData = await detailRes.json();
            const name = nameData.names?.[0] || id;
            const description = escapeHtml(titleData.description) || `Details for ${name} (${id})`;
            const imageUrl = titleData.bannerUrl || titleData.iconUrl || '';

            const response = await resolve(event);
            let appHtml = await response.text();

            const metaTags = `
            <title>${name} - Titledb Browser</title>
            <meta name="description" content="${description}" />
            <meta property="og:title" content="${name} - Titledb Browser" />
            <meta property="og:description" content="${description}" />
            <meta property="og:image" content="${imageUrl}" />
            <meta property="twitter:card" content="summary_large_image" />
            `;

            appHtml = appHtml.replace('</head>', `${metaTags}\n</head>`);

            const headers = new Headers(response.headers);
            headers.set('content-type', 'text/html');

            return new Response(appHtml, {
                status: response.status,
                headers
            });

        } catch (error) {
            console.error('Error in bot meta handler:', error);
            return resolve(event);
        }
    }

    return resolve(event);
}
