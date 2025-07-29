import { json, error } from '@sveltejs/kit'
import { db } from '$lib/db'
import { games } from '$lib/db/schema'
import { inArray } from 'drizzle-orm'

export const POST = async ({ request }) => {
  try {
    const { ids } = await request.json()

    if (!Array.isArray(ids) || ids.length === 0) {
      return json([])
    }

    const results = await db
      .select({
        id: games.id,
        names: games.names
      })
      .from(games)
      .where(inArray(games.id, ids))

    return json(results)
  } catch (err) {
    console.error('API Error in /api/v1/favorites:', err)
    throw error(500, 'An internal server error occurred.')
  }
}