import * as gameService from '$lib/services/gameService'

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, url, parent, cookies, locals }) => {
	const { session } = await parent()
	const publisherName = params.name

	// Create search params for the query
	const searchParams = new URLSearchParams(url.searchParams)
	searchParams.set('publisher', publisherName)

	// Respect the user's region preference for sorting/grouping
	const preferredRegion = cookies.get('preferred_region') || 'US'
	searchParams.set('region', preferredRegion)

	// Use service layer with injected db
	const db = locals.db
	const [searchResults, stats] = await Promise.all([
		gameService.searchGames(db, searchParams),
		gameService.getPublisherStats(db, publisherName)
	])

	return {
		session,
		publisherName,
		stats,
		...searchResults
	}
}
