import { getGames } from '$lib/games.js'

export const load = async ({ url }) => {
  return await getGames(url.searchParams)
}