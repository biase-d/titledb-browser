import { error } from '@sveltejs/kit'
import { db } from '$lib/db'
import { games, performanceProfiles } from '$lib/db/schema'
import { eq, ilike, sql } from 'drizzle-orm'

export const load = async ({ params, parent }) => {
  const { username } = params
  const { session } = await parent()

  try {
    const contributions = await db
      .select({
        id: games.id,
        title: sql`"names"[1]`
      })
      .from(games)
      .innerJoin(performanceProfiles, eq(games.groupId, performanceProfiles.groupId))
      .where(ilike(performanceProfiles.contributor, username))

    const mergedPullRequests = contributions.map(game => ({
      title: game.title,
      url: `/title/${game.id}`
    }))

    return {
      username,
      mergedPullRequests,
      session
    }
  } catch (e) {
    console.error(`Error fetching profile contributions for ${username} from DB:`, e)
    throw error(500, 'Could not fetch contribution data.')
  }
}