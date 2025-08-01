import { db } from '$lib/db'
import { games, graphics_settings, performance_profiles, youtube_links } from '$lib/db/schema'
import { eq, sql } from 'drizzle-orm'

/**
 * @param {string | import("drizzle-orm").SQLWrapper} id
 */
export async function getGameDetails (id) {
  const gamePromise = db
    .select({
      id: games.id,
      groupId: games.group_id,
      names: games.names,
      publisher: games.publisher,
      releaseDate: games.release_date,
      sizeInBytes: games.size_in_bytes,
      iconUrl: games.icon_url,
      bannerUrl: games.banner_url,
      screenshots: games.screenshots,
      contributor: performance_profiles.contributor,
      lastUpdated: games.last_updated,
      performance: performance_profiles.profiles,
      sourcePrUrl: performance_profiles.source_pr_url,
      graphics: graphics_settings.settings
    })
    .from(games)
    .leftJoin(performance_profiles, eq(games.group_id, performance_profiles.group_id))
    .leftJoin(graphics_settings, eq(games.group_id, graphics_settings.group_id))
    .where(eq(games.id, id))
    .limit(1)

  const [gameResult] = await Promise.all([gamePromise])

  const game = gameResult[0]

  if (!game) {
    return { game: null, allTitlesInGroup: [], youtubeLinks: [] }
  }

  const [allTitlesInGroup, links] = await Promise.all([
    db.select({
      id: games.id,
      name: sql`"names"[1]`
    }).from(games).where(eq(games.group_id, game.groupId)),
    db.select({ url: youtube_links.url }).from(youtube_links).where(eq(youtube_links.group_id, game.groupId))
  ])

  return { game, allTitlesInGroup, youtubeLinks: links }
}