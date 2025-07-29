import { json } from '@sveltejs/kit'
import { getGames } from '$lib/games'

export const GET = async ({ url }) => {
  try {
    const data = await getGames(url.searchParams)
    return json(data)
  } catch (error) {
    console.error('API Error:', error)
    return json({ error: 'An internal server error occurred.' }, { status: 500 })
  }
}