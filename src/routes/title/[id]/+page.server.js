import { error } from '@sveltejs/kit'
import { getGameDetails } from '$lib/games/getGameDetails'

export const load = async ({ params, parent }) => {
  const { id } = params
  if (!id) {
    throw error(400, 'Game ID is required')
  }

  const [{ game, allTitlesInGroup, youtubeLinks }, { session }] = await Promise.all([
    getGameDetails(id),
    parent()
  ])

  if (!game) {
    throw error(404, 'Game not found')
  }

  return { game, session, allTitlesInGroup, youtubeLinks }
}