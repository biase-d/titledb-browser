import { searchGames } from '$lib/games/searchGames'
import * as gameService from '$lib/services/gameService'

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

	return {
		session,
		...searchResults,
		randomGames,
		preferredRegion,
		isLandingPage,
		stats: searchResults.stats
	}
}
