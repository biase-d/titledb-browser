import { json, error } from '@sveltejs/kit'
import { platformOf } from '$lib/platform'
import * as searchRepo from '$lib/repositories/searchRepository'

export const GET = async ({ url, locals }) => {
	try {
		const q = url.searchParams.get('q')
		if (!q || q.length < 3) {
			return json([])
		}

		const db = locals.db
		// Quick search covers both consoles
		const params = new URLSearchParams(url.searchParams)
		if (!params.has('platform')) params.set('platform', 'all')
		const { results } = await searchRepo.searchGames(db, params)

		const searchResults = results.map(game => ({
			id: game.id,
			name: game.names[0],
			groupId: game.groupId,
			platform: platformOf(game.id)
		}))

		return json(searchResults)
	} catch (e) {
		console.error('API Error in game search:', e)
		throw error(500, 'Failed to search for games.')
	}
}
