import { json } from '@sveltejs/kit'
import * as gameRepo from '$lib/repositories/gameRepository'

export const GET = async ({ url, locals }) => {
	try {
		const db = locals.db
		const data = await gameRepo.searchGames(db, url.searchParams)
		return json(data)
	} catch (error) {
		console.error('API Error:', error)
		return json({ error: 'An internal server error occurred.' }, { status: 500 })
	}
}
