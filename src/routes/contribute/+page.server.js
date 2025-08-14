import { db } from '$lib/db';
import { games, performanceProfiles, graphicsSettings, gameGroups } from '$lib/db/schema';
import { sql, and, notExists, eq, inArray, count } from 'drizzle-orm';

const PAGE_SIZE = 50;

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ parent, url }) => {
	const { session } = await parent();

	if (!session?.user) {
		return { session, games: [], pagination: null };
	}

	const page = parseInt(url.searchParams.get('page') || '1', 10);

	const subqueryPerformance = db
		.select({ groupId: performanceProfiles.groupId })
		.from(performanceProfiles)
		.where(eq(performanceProfiles.groupId, gameGroups.id));

	const subqueryGraphics = db
		.select({ groupId: graphicsSettings.groupId })
		.from(graphicsSettings)
		.where(eq(graphicsSettings.groupId, gameGroups.id));

	const groupsQuery = db
		.select({ id: gameGroups.id })
		.from(gameGroups)
		.where(and(notExists(subqueryPerformance), notExists(subqueryGraphics)));

	// Get total count for pagination
	const totalCountResult = await db.select({ count: count() }).from(groupsQuery.as('missing_groups'));
	const totalItems = totalCountResult[0].count;
	const totalPages = Math.ceil(totalItems / PAGE_SIZE);

	// Get paginated group IDs
	const groupsWithMissingData = await groupsQuery.limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE);
	const groupIds = groupsWithMissingData.map(g => g.id);

	let gamesList = [];
	if (groupIds.length > 0) {
		gamesList = await db
			.selectDistinctOn([games.groupId], {
				id: games.id,
				names: games.names,
				iconUrl: games.iconUrl
			})
			.from(games)
			.where(inArray(games.groupId, groupIds));
	}

	return {
		session,
		games: gamesList,
		pagination: {
			currentPage: page,
			totalPages,
			totalItems
		}
	};
};