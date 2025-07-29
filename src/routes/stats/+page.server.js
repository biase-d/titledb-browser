import { getStats } from '$lib/stats.js'

export const load = async ({ url }) => {
  const stats = await getStats(url.searchParams)
  return { stats }
}