import { getGames } from '$lib/games/searchGames.js'

export const load = async ({ url }) => {
  return await getGames(url.searchParams)
}