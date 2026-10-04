import { syncFavorites } from '$lib/server/favoritesSync'

/** @type {import('./$types').LayoutServerLoad} */
export const load = async ({ locals, cookies }) => {
	const session = await locals.auth()

	// A signed-in person's favourites live on their account. This keeps the cookie
	// the pages read in step with it, and carries over what they had before signing in
	if (session?.user?.id) {
		try {
			await syncFavorites({ db: locals.db, cookies, userId: String(session.user.id) })
		} catch (err) {
			// Favourites are a convenience: the page works from the cookie as it was
			console.warn('[favorites] could not sync with the account:', err instanceof Error ? err.message : err)
		}
	}

	return { session }
}
