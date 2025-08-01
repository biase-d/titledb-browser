import { json, error } from '@sveltejs/kit'
import { getGameDetails } from '$lib/games/getGameDetails'

export const GET = async ({ params }) => {
  try {
    const { id } = params
    if (!id) {
      throw error(400, 'Game ID is required')
    }

    const { game } = await getGameDetails(id)

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