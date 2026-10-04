import { json } from '@sveltejs/kit'
import * as repo from '$lib/repositories/favoritesRepository'
import { body, unauthorized, userIdOf } from '$lib/server/favoritesApi'

/** Renames a list @type {import('./$types').RequestHandler} */
export async function PATCH ({ request, locals, params }) {
	const userId = await userIdOf(locals)
	if (!userId) return unauthorized()

	const result = await repo.renameList(locals.db, userId, params.id, (await body(request)).name)
	if (result === 'ok') return json({ success: true })
	if (result === 'missing') return json({ error: 'No such list.' }, { status: 404 })
	return json({ error: result === 'taken' ? 'You already have a list with that name.' : 'Give the list a name.' }, { status: 400 })
}

/** Deletes a list. The games in it stay favourited @type {import('./$types').RequestHandler} */
export async function DELETE ({ locals, params }) {
	const userId = await userIdOf(locals)
	if (!userId) return unauthorized()

	await repo.deleteList(locals.db, userId, params.id)
	return json({ success: true })
}
