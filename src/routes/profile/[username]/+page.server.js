import { db } from '$lib/db';
import { games, performanceProfiles, graphicsSettings, youtubeLinks } from '$lib/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, parent }) => {
	const { session } = await parent();
	const { username } = params;

	const perfContribs = await db.select({
		groupId: performanceProfiles.groupId,
		gameVersion: performanceProfiles.gameVersion,
		sourcePrUrl: performanceProfiles.sourcePrUrl
	}).from(performanceProfiles).where(sql`${performanceProfiles.contributor} @> ARRAY[${username}]`);

	const totalContributions = perfContribs.length;
	if (totalContributions === 0) {
		return { username, session, contributions: [], totalContributions: 0 };
	}
	
	const [graphicsContribs, videoContribs] = await Promise.all([
		db.select({ groupId: graphicsSettings.groupId }).from(graphicsSettings).where(sql`${graphicsSettings.contributor} @> ARRAY[${username}]`),
		db.select({ groupId: youtubeLinks.groupId }).from(youtubeLinks).where(eq(youtubeLinks.submittedBy, username))
	]);

	const graphicsGroupIds = new Set(graphicsContribs.map(g => g.groupId));
	const videoGroupIds = new Set(videoContribs.map(v => v.groupId));

	// Get the unique group IDs from their contributions
	const groupIds = [...new Set(perfContribs.map(p => p.groupId))];

	const gamesInvolved = await db.query.games.findMany({
		where: inArray(games.groupId, groupIds),
		distinctOn: [games.groupId]
	});

	const gamesMap = new Map(gamesInvolved.map(g => [g.groupId, g]));
	const contributionsByGroup = {};

	// Group the profiles by game
	for (const profile of perfContribs) {
		const game = gamesMap.get(profile.groupId);
		if (!game) continue;

		if (!contributionsByGroup[profile.groupId]) {
			contributionsByGroup[profile.groupId] = {
				game: { name: game.names[0], id: game.id, iconUrl: game.iconUrl },
				versions: [],
				hasGraphics: graphicsGroupIds.has(profile.groupId),
				hasYoutube: videoGroupIds.has(profile.groupId)
			};
		}
		contributionsByGroup[profile.groupId].versions.push({
			version: profile.gameVersion,
			sourcePrUrl: profile.sourcePrUrl
		});
	}

	const contributions = Object.values(contributionsByGroup);
	
	return {
		username,
		session,
		contributions,
		totalContributions
	};
};