import { json } from '@sveltejs/kit'
import * as repo from '$lib/repositories/favoritesRepository'
import { body, titleId, unauthorized, userIdOf } from '$lib/server/favoritesApi'

/** Puts a game in the list, favouriting it if it is not @type {import('./$types').RequestHandler} */
export async function POST ({ request, locals, params }) {
	const userId = await userIdOf(locals)
	if (!userId) return unauthorized()

	const id = titleId((await body(request)).gameId)
	if (!id) return json({ error: 'Missing or invalid gameId' }, { status: 400 })

	const ok = await repo.addToList(locals.db, userId, params.id, id)
	return ok ? json({ success: true }) : json({ error: 'No such list.' }, { status: 404 })
}

/** Takes a game out of the list. It stays favourited @type {import('./$types').RequestHandler} */
export async function DELETE ({ request, locals, params }) {
	const userId = await userIdOf(locals)
	if (!userId) return unauthorized()

	const id = titleId((await body(request)).gameId)
	if (!id) return json({ error: 'Missing or invalid gameId' }, { status: 400 })

	const ok = await repo.removeFromList(locals.db, userId, params.id, id)
	return ok ? json({ success: true }) : json({ error: 'No such list.' }, { status: 404 })
}
