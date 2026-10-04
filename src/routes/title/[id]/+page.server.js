import { error, fail } from '@sveltejs/kit'
import * as gameService from '$lib/services/gameService'
import { Game } from '$lib/models/Game.js'
import { ensureIcon } from '$lib/server/iconBackfill'
import * as prefRepo from '$lib/repositories/preferencesRepository'

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, parent, url, cookies, locals }) => {
	const { session } = await parent()
	const titleId = params.id

	const userId = session?.user?.id
	const db = locals.db

	const details = await gameService.getGameContext(db, titleId, userId)

	if (!details) {
		error(404, 'Game not found')
	}

	const game = new Game(details)

	// A title without an icon is looked up on Nintendo's store now that somebody wants it,
	// in the background: it shows the next time it is opened
	ensureIcon(db, game)

	const preferredRegion = cookies.get('preferred_region') || 'US'

	return {
		session,
		game,
		preferredRegion,
		hasRequested: details.userContext?.hasRequested || false,
		url: {
			href: url.href,
			origin: url.origin
		}
	}
}

/** @type {import('./$types').Actions} */
export const actions = {
	setFeatured: async ({ locals, params }) => {
		const session = await locals.auth()
		const username = session?.user?.login
		const gameId = params.id

		if (!username) return fail(401)

		await prefRepo.upsertUserPreferences(locals.db, username, { featuredGameId: gameId })

		return { success: true }
	}
}
