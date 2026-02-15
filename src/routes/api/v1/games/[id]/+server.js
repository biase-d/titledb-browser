import { json, error } from '@sveltejs/kit'
import * as gameRepo from '$lib/repositories/gameRepository'

export const GET = async ({ params, locals }) => {
	try {
		const { id } = params
		if (!id) {
			throw error(400, 'Game ID is required')
		}

		const db = locals.db
		const { game } = await gameRepo.getGameDetails(db, id)

		if (!game) {
			throw error(404, 'Game not found')
		}

		return json(game)
	} catch (err) {
		if (err.status) {
			throw err
		}
		console.error(`API Error in /api/v1/games/${params.id}:`, err)
		throw error(500, 'An internal server error occurred.')
	}
}
