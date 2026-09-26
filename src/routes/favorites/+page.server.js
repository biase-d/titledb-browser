import * as gameRepo from '$lib/repositories/gameRepository'
import { withPlaceholders } from '$lib/server/lqip'

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ cookies, locals }) => {
	const favoriteIdsCookie = cookies.get('favorites')
	if (!favoriteIdsCookie) {
		return { favoritedGames: [] }
	}

	let ids = []
	try {
		ids = JSON.parse(favoriteIdsCookie)
	} catch (e) {
		return { favoritedGames: [] }
	}

	if (!Array.isArray(ids) || ids.length === 0) {
		return { favoritedGames: [] }
	}

	const favoritedGames = await withPlaceholders(
		await gameRepo.getFavoriteGamesWithPerformance(locals.db, ids),
		['iconUrl', 'bannerUrl']
	)

	return { favoritedGames }
}
