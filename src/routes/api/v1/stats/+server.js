import { json, error } from '@sveltejs/kit'
import { getStats } from '$lib/server/data/stats.js'

export const GET = async ({ url }) => {
  try {
    const stats = await getStats(url.searchParams)
    return json(stats)
  } catch (err) {
    console.error('API Error in /api/v1/stats:', err)
    throw error(500, 'An internal server error occurred.')
  }
}