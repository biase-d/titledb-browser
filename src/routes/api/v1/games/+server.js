import { json } from '@sveltejs/kit'
import { searchGames } from '$lib/games/searchGames'

export const GET = async ({ url }) => {
  try {
    const data = await searchGames(url.searchParams)
    return json(data)
  } catch (error) {
    console.error('API Error:', error)
    return json({ error: 'An internal server error occurred.' }, { status: 500 })
  }
}