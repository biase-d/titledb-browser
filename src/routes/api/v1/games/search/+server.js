import { json, error } from '@sveltejs/kit'
import * as searchRepo from '$lib/repositories/searchRepository'

export const GET = async ({ url, locals }) => {
	try {
		const q = url.searchParams.get('q')
		if (!q || q.length < 3) {
			return json([])
		}

		const db = locals.db
		const { results } = await searchRepo.searchGames(db, url.searchParams)

		const searchResults = results.map(game => ({
			id: game.id,
			name: game.names[0],
			groupId: game.groupId
		}))

		return json(searchResults)
	} catch (e) {
		console.error('API Error in game search:', e)
		throw error(500, 'Failed to search for games.')
	}
}
