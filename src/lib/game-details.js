import { db } from '$lib/db'
import { games, performanceProfiles } from '$lib/db/schema'
import { eq, sql } from 'drizzle-orm'

export async function getGameDetails (id) {
  const gamePromise = db
    .select({
      id: games.id,
      groupId: games.groupId,
      names: games.names,
      publisher: games.publisher,
      releaseDate: games.releaseDate,
      sizeInBytes: games.sizeInBytes,
      iconUrl: games.iconUrl,
      bannerUrl: games.bannerUrl,
      screenshots: games.screenshots,
      contributor: performanceProfiles.contributor,
      lastUpdated: games.lastUpdated,
      performance: performanceProfiles.profiles,
      sourcePrUrl: performanceProfiles.sourcePrUrl
    })
    .from(games)
    .leftJoin(performanceProfiles, eq(games.groupId, performanceProfiles.groupId))
    .where(eq(games.id, id))
    .limit(1)

  const [gameResult] = await Promise.all([gamePromise])

  const game = gameResult[0]

  if (!game) {
    return { game: null, allTitlesInGroup: [] }
  }

  const allTitlesInGroup = await db.select({
    id: games.id,
    name: sql`"names"[1]`
  }).from(games).where(eq(games.groupId, game.groupId))

  return { game, allTitlesInGroup }
}