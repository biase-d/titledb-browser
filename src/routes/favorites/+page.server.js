import { db } from '$lib/db'
import { games } from '$lib/db/schema'
import { inArray } from 'drizzle-orm'

export const load = async ({ cookies }) => {
  const favoriteIdsCookie = cookies.get('favorites')
  if (!favoriteIdsCookie) {
    return { favoritedGames: [] }
  }

  const ids = JSON.parse(favoriteIdsCookie)
  if (!Array.isArray(ids) || ids.length === 0) {
    return { favoritedGames: [] }
  }

  const favoritedGames = await db
    .select({
      id: games.id,
      names: games.names
    })
    .from(games)
    .where(inArray(games.id, ids))

  return { favoritedGames }
}