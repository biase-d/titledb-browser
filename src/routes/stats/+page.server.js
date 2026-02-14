import { getStats } from '$lib/repositories/statsRepository';

export const load = async ({ url, locals }) => {
  const stats = await getStats(locals.db, url.searchParams);
  return { stats };
};