import { json, error } from '@sveltejs/kit'
import * as gameService from '$lib/services/gameService'

export const POST = async ({ request, locals }) => {
	const session = await locals.auth()

	if (!session?.user?.id) {
		throw error(401, 'You must be signed in to request data.')
	}

	const { gameId } = await request.json()
	if (!gameId) {
		throw error(400, 'Game ID is required.')
	}

	const userId = session.user.id
	const db = locals.db

	try {
		// Toggle request status via service
		const result = await gameService.requestGameData(db, userId, gameId)
		return json(result)
	} catch (err) {
		console.error('Error toggling request:', err)
		throw error(500, 'Failed to update request.')
	}
}
