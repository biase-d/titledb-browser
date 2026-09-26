import * as contributeService from '$lib/services/contributeService'
import { getBackdropArtwork } from '$lib/repositories/searchRepository'
import { withPlaceholders } from '$lib/server/lqip'

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ parent, url, cookies, locals }) => {
	const { session } = await parent()

	const impactStats = await contributeService.getImpactStats(locals.db)

	if (!session?.user) {
		// Artwork for the backdrop behind the sign-in call to action. Only for
		// signed-out visitors: everyone else gets the working view instead, and
		// fetching it for them would be a query answering nothing
		const artwork = await withPlaceholders(
			await getBackdropArtwork(locals.db, 20),
			['iconUrl']
		)

		return { session, games: [], pagination: null, impactStats, artwork }
	}

	const page = parseInt(url.searchParams.get('page') || '1', 10)
	const sortBy = url.searchParams.get('sort') || 'default'
	const preferredRegion = cookies.get('preferred_region') || 'US'

	const result = await contributeService.getMissingDataGames(locals.db, {
		page,
		sortBy,
		preferredRegion
	})

	return {
		session,
		artwork: [],
		games: result.games,
		sortBy: result.sortBy,
		pagination: result.pagination,
		impactStats
	}
}
