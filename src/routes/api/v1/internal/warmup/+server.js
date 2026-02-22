import { db } from '$lib/db'
import { games } from '$lib/db/schema'
import { proxyImage } from '$lib/image'

/** @param {import('./$types').RequestEvent} event */
export async function GET ({ url }) {
    const allGames = await db.select({
        iconUrl: games.iconUrl,
        bannerUrl: games.bannerUrl
    }).from(games)

    /** @type {Set<string>} */
    const assetUrls = new Set()
    const origin = url.origin

    /**
     * @param {string | null} src
     * @param {number} w
     */
    const addProxied = (src, w) => {
        if (!src) return
        const proxied = proxyImage(src, w)
        // Only include if it's actually using the proxy route
        if (proxied && typeof proxied === 'string' && proxied.startsWith('/api/v1/proxy/image')) {
            assetUrls.add(`${origin}${proxied}`)
        }
    }

    for (const game of allGames) {
        // Icons: Small (List), Medium (Grid), Large (Default/Detail)
        if (game.iconUrl) {
            addProxied(game.iconUrl, 120)
            addProxied(game.iconUrl, 200)
            addProxied(game.iconUrl, 300)
        }

        // Banners: Hero Carousel
        if (game.bannerUrl) {
            addProxied(game.bannerUrl, 1000)
        }
    }

    return new Response(Array.from(assetUrls).join('\n'), {
        headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'no-store'
        }
    })
}
