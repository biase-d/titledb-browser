import { games, performanceProfiles, graphicsSettings, gameGroups, dataRequests } from '$lib/db/schema';
import { sql, and, notExists, eq, inArray, count, desc } from 'drizzle-orm';

const PAGE_SIZE = 50;

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ parent, url, cookies, locals }) => {
	const { session } = await parent();

	if (!session?.user) {
		return { session, games: [], pagination: null };
	}

	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const sortBy = url.searchParams.get('sort') || 'default';
	const preferredRegion = cookies.get('preferred_region') || 'US';

	const db = locals.db;

	const subqueryPerformance = db
		.select({ groupId: performanceProfiles.groupId })
		.from(performanceProfiles)
		.where(eq(performanceProfiles.groupId, gameGroups.id));

	const subqueryGraphics = db
		.select({ groupId: graphicsSettings.groupId })
		.from(graphicsSettings)
		.where(eq(graphicsSettings.groupId, gameGroups.id));

	// Find groups that have NO data
	const groupsQuery = db
		.select({ id: gameGroups.id })
		.from(gameGroups)
		.where(and(notExists(subqueryPerformance), notExists(subqueryGraphics)));

	// Get total count for pagination
	const totalCountResult = await db.select({ count: count() }).from(groupsQuery.as('missing_groups'));
	const totalItems = totalCountResult[0].count;
	const totalPages = Math.ceil(totalItems / PAGE_SIZE);

	// Get paginated group IDs
	let groupIds = [];

	if (sortBy === 'requests') {
		const rankedGroups = await db.select({
			groupId: games.groupId,
			requestCount: count(dataRequests.userId)
		})
			.from(games)
			.leftJoin(dataRequests, eq(games.id, dataRequests.gameId))
			.where(inArray(games.groupId, groupsQuery)) // Only missing groups
			.groupBy(games.groupId)
			.orderBy(desc(count(dataRequests.userId)))
			.limit(PAGE_SIZE)
			.offset((page - 1) * PAGE_SIZE);

		groupIds = rankedGroups.map(g => g.groupId);
	} else {
		const groupsWithMissingData = await groupsQuery.limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE);
		groupIds = groupsWithMissingData.map(g => g.id);
	}

	let gamesList = [];
	if (groupIds.length > 0) {
		const regionPriority = sql`
			CASE 
				WHEN ${games.regions} @> ARRAY[${preferredRegion}]::text[] THEN 0 
				WHEN ${games.regions} @> ARRAY['US']::text[] THEN 1
				ELSE 2 
			END
		`;

		const requestCountSubquery = db.select({
			gameId: dataRequests.gameId,
			count: count(dataRequests.userId).as('req_count')
		}).from(dataRequests).groupBy(dataRequests.gameId).as('req_counts');

		gamesList = await db
			.selectDistinctOn([games.groupId], {
				id: games.id,
				names: games.names,
				iconUrl: games.iconUrl,
				regions: games.regions,
				requestCount: sql`COALESCE(${requestCountSubquery.count}, 0)`
			})
			.from(games)
			.leftJoin(requestCountSubquery, eq(games.id, requestCountSubquery.gameId))
			.where(inArray(games.groupId, groupIds))
			.orderBy(games.groupId, regionPriority);

		if (sortBy === 'requests') {
			gamesList.sort((a, b) => Number(b.requestCount) - Number(a.requestCount));
		}
	}

	return {
		session,
		games: gamesList,
		sortBy,
		pagination: {
			currentPage: page,
			totalPages,
			totalItems
		}
	};
};