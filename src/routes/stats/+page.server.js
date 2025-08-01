import { getStats } from '$lib/getStats.js'

export const load = async ({ url }) => {
  const stats = await getStats(url.searchParams)
  return { stats }
}