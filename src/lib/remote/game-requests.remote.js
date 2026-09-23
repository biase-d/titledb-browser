/**
 * "Request performance data for this game" toggle
 *
 * Replaces a hand-written fetch to POST /api/v1/requests: the command runs on
 * the server, so auth and the service call stay server-side while the caller
 * just awaits a function
 */
import { command, getRequestEvent } from '$app/server'
import { error } from '@sveltejs/kit'
import * as gameService from '$lib/services/gameService'

/**
 * Toggles whether the signed-in user has requested data for a game
 *
 * Declared 'unchecked' because the app has no schema library; the argument is
 * validated here instead, exactly as the endpoint it replaces did
 *
 * @type {import('@sveltejs/kit').RemoteCommand<string, { requested: boolean }>}
 */
export const toggleDataRequest = command('unchecked', async (gameId) => {
	if (typeof gameId !== 'string' || !gameId) {
		error(400, 'Game ID is required.')
	}

	const { locals } = getRequestEvent()
	const session = await locals.auth()

	if (!session?.user?.id) {
		error(401, 'You must be signed in to request data.')
	}

	return await gameService.requestGameData(locals.db, session.user.id, gameId)
})
