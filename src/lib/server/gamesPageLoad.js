import { searchGames } from '$lib/games/searchGames'
import * as gameService from '$lib/services/gameService'
import { withPlaceholders } from '$lib/server/lqip'

/**
 * What the listing page needs, for one console's titles. The home page is the
 * Switch listing and /switch-2 is the Switch 2 one: the same page, the same
 * filters and views, over different titles
 *
 * @param {{ url: URL, cookies: import('@sveltejs/kit').Cookies, locals: any, session: any }} event
 * @param {import('$lib/platform').Platform} platform
 */
export async function loadGamesPage ({ url, cookies, locals, session }, platform) {
	const db = locals.db

	// Read the preferred region from the cookie
	const preferredRegion = cookies.get('preferred_region') || 'US'

	// Pass it to the search params
	const searchParams = new URLSearchParams(url.searchParams)
	searchParams.set('region', preferredRegion)
	// Set here, never taken from the address: each page is one console's
	// The Switch listing, when searched by name, covers both consoles and marks the Switch 2 ones,
	// so a title is found wherever it lives. The Switch 2 listing stays its own
	searchParams.set('platform', platform === 'switch' && searchParams.get('q') ? 'all' : platform)

	// We only want random games on the landing page (no search/filters)
	const isLandingPage = !searchParams.get('q') && !searchParams.get('key_card') && !searchParams.get('docked_fps') && !searchParams.get('handheld_fps') && !searchParams.get('res_type')

	const [searchResults, randomGames] = await Promise.all([
		searchGames(searchParams),
		isLandingPage ? gameService.getRandomGames(db, 12, platform) : Promise.resolve([])
	])

	// Blurred hints of the artwork, inlined so the cards have something to show
	// before the images arrive. A cold cache returns nothing and fills itself in
	// the background, so this never delays the page
	const [results, recentUpdates, hero] = await Promise.all([
		withPlaceholders(searchResults.results ?? [], ['iconUrl']),
		// The hero carousel shows these as full-width banners, so it needs the
		// banner placeholder, and it is the first thing on the page
		withPlaceholders(searchResults.recentUpdates ?? [], ['iconUrl', 'bannerUrl']),
		withPlaceholders(randomGames, ['bannerUrl', 'iconUrl'])
	])

	return {
		session,
		...searchResults,
		results,
		recentUpdates,
		randomGames: hero,
		preferredRegion,
		isLandingPage,
		platform,
		stats: searchResults.stats
	}
}
