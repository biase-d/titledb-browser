import * as gameRepo from '$lib/repositories/gameRepository'
import * as favoritesRepo from '$lib/repositories/favoritesRepository'
import { withPlaceholders } from '$lib/server/lqip'

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ cookies, locals, parent }) => {
	const { session } = await parent()
	const userId = session?.user?.id ? String(session.user.id) : null

	/** @type {string[]} */
	let ids = []
	/** @type {Array<{ id: string, name: string, gameIds: string[] }>} */
	let lists = []

	if (userId) {
		// The account is the truth for anyone signed in (see syncFavorites)
		;[ids, lists] = await Promise.all([favoritesRepo.getUserFavorites(locals.db, userId), favoritesRepo.getLists(locals.db, userId)])
	} else {
		try {
			const parsed = JSON.parse(cookies.get('favorites') ?? '[]')
			if (Array.isArray(parsed)) ids = parsed
		} catch { /* an unreadable cookie is no favourites */ }
	}

	if (ids.length === 0) return { favoritedGames: [], lists, signedIn: !!userId }

	const favoritedGames = await withPlaceholders(
		await gameRepo.getFavoriteGamesWithPerformance(locals.db, ids),
		['iconUrl', 'bannerUrl']
	)

	return { favoritedGames, lists, signedIn: !!userId }
}
