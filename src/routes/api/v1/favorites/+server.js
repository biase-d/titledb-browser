import { json } from '@sveltejs/kit'
import * as repo from '$lib/repositories/favoritesRepository'
import { body, titleId, unauthorized, userIdOf } from '$lib/server/favoritesApi'

/** The signed-in person's favourites and lists. Empty when signed out @type {import('./$types').RequestHandler} */
export async function GET ({ locals }) {
	const userId = await userIdOf(locals)
	if (!userId) return json({ favorites: [], lists: [], signedIn: false })

	const [favorites, lists] = await Promise.all([repo.getUserFavorites(locals.db, userId), repo.getLists(locals.db, userId)])
	return json({ favorites, lists, signedIn: true })
}

/** @type {import('./$types').RequestHandler} */
export async function POST ({ request, locals }) {
	const userId = await userIdOf(locals)
	if (!userId) return unauthorized()

	const id = titleId((await body(request)).gameId)
	if (!id) return json({ error: 'Missing or invalid gameId' }, { status: 400 })

	await repo.addFavorite(locals.db, userId, id)
	return json({ success: true })
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE ({ request, locals }) {
	const userId = await userIdOf(locals)
	if (!userId) return unauthorized()

	const id = titleId((await body(request)).gameId)
	if (!id) return json({ error: 'Missing or invalid gameId' }, { status: 400 })

	await repo.removeFavorite(locals.db, userId, id)
	return json({ success: true })
}
