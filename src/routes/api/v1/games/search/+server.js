import { json, error } from '@sveltejs/kit'
import { getGames } from '$lib/games.js'

export const GET = async ({ url }) => {
  try {
    const q = url.searchParams.get('q')
    if (!q || q.length < 3) {
      return json([])
    }

    const { results } = await getGames(url.searchParams)

    const searchResults = results.map(game => ({
      id: game.id,
      name: game.names[0]
    }))

    return json(searchResults)
  } catch (e) {
    console.error('API Error in game search:', e)
    throw error(500, 'Failed to search for games.')
  }
}