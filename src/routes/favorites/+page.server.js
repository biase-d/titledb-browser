import { games, performanceProfiles, graphicsSettings } from '$lib/db/schema';
import { inArray, eq, desc, sql } from 'drizzle-orm';

export const load = async ({ cookies, locals }) => {
  const favoriteIdsCookie = cookies.get('favorites');
  if (!favoriteIdsCookie) {
    return { favoritedGames: [] };
  }

  let ids = [];
  try {
    ids = JSON.parse(favoriteIdsCookie);
  } catch (e) {
    return { favoritedGames: [] };
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    return { favoritedGames: [] };
  }

  const db = locals.db;
  const latestProfileSubquery = db.$with('latest_profile').as(
    db.selectDistinctOn([performanceProfiles.groupId], {
      groupId: performanceProfiles.groupId,
      profiles: performanceProfiles.profiles
    }).from(performanceProfiles).orderBy(performanceProfiles.groupId, desc(performanceProfiles.gameVersion))
  );

  const favoritedGames = await db.with(latestProfileSubquery)
    .select({
      id: games.id,
      groupId: games.groupId,
      names: games.names,
      regions: games.regions,
      iconUrl: games.iconUrl,
      publisher: games.publisher,
      performance: sql`
        jsonb_build_object(
          'docked', jsonb_build_object(
            'target_fps', 
            COALESCE(
              (${latestProfileSubquery.profiles}->'docked'->>'target_fps'), 
              (${graphicsSettings.settings}->'docked'->'framerate'->>'targetFps'),
              (${graphicsSettings.settings}->'docked'->'framerate'->>'lockType')
            )
          ),
          'handheld', jsonb_build_object(
            'target_fps', 
            COALESCE(
              (${latestProfileSubquery.profiles}->'handheld'->>'target_fps'), 
              (${graphicsSettings.settings}->'handheld'->'framerate'->>'targetFps'),
              (${graphicsSettings.settings}->'handheld'->'framerate'->>'lockType')
            )
          )
        )
      `
    })
    .from(games)
    .leftJoin(latestProfileSubquery, eq(games.groupId, latestProfileSubquery.groupId))
    .leftJoin(graphicsSettings, eq(games.groupId, graphicsSettings.groupId))
    .where(inArray(games.id, ids));

  return { favoritedGames };
};