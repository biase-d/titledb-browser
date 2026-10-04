import { json } from '@sveltejs/kit'
import * as repo from '$lib/repositories/favoritesRepository'
import { body, unauthorized, userIdOf } from '$lib/server/favoritesApi'

/** Makes a list @type {import('./$types').RequestHandler} */
export async function POST ({ request, locals }) {
	const userId = await userIdOf(locals)
	if (!userId) return unauthorized()

	const made = await repo.createList(locals.db, userId, (await body(request)).name)
	if (!made.ok) {
		const message = { name: 'Give the list a name.', limit: `You can have up to ${repo.MAX_LISTS} lists.`, taken: 'You already have a list with that name.' }[made.reason]
		return json({ error: message }, { status: made.reason === 'limit' ? 409 : 400 })
	}
	return json({ list: made.list }, { status: 201 })
}
