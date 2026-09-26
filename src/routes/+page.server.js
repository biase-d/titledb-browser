import { searchGames } from '$lib/games/searchGames'
import * as gameService from '$lib/services/gameService'
import { withPlaceholders } from '$lib/server/lqip'

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ url, parent, cookies, locals }) => {
	const { session } = await parent()
	const db = locals.db

	// Read the preferred region from the cookie
	const preferredRegion = cookies.get('preferred_region') || 'US'

	// Pass it to the search params
	const searchParams = new URLSearchParams(url.searchParams)
	searchParams.set('region', preferredRegion)

	// We only want random games on the landing page (no search/filters)
	const isLandingPage = !searchParams.get('q') && !searchParams.get('docked_fps') && !searchParams.get('handheld_fps') && !searchParams.get('res_type')

	const [searchResults, randomGames] = await Promise.all([
		searchGames(searchParams),
		isLandingPage ? gameService.getRandomGames(db, 12) : Promise.resolve([])
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
		stats: searchResults.stats
	}
}
