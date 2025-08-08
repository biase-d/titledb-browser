import { db } from '$lib/db';
import { games, performanceProfiles, graphicsSettings, gameGroups } from '$lib/db/schema';
import { desc, eq, sql, inArray, or, and, count, countDistinct } from 'drizzle-orm';

const PAGE_SIZE = 50;

export async function searchGames(searchParams) {
	await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);

	const page = parseInt(searchParams.get('page') || '1', 10);
	const q = searchParams.get('q') || '';
	const dockedFps = searchParams.get('docked_fps');
	const handheldFps = searchParams.get('handheld_fps');
	const resolutionType = searchParams.get('res_type');
	const sort = searchParams.get('sort') || (q ? 'relevance-desc' : 'date-desc');

	const latestProfileSubquery = db.$with('latest_profile').as(
		db.selectDistinctOn([performanceProfiles.groupId], {
			groupId: performanceProfiles.groupId,
			profiles: performanceProfiles.profiles
		}).from(performanceProfiles).orderBy(performanceProfiles.groupId, desc(performanceProfiles.gameVersion))
	);

	const whereClauses = [];
	const isTitleIdSearch = /^[0-9A-F]{16}$/i.test(q);

if (q) {
		if (isTitleIdSearch) {
			whereClauses.push(eq(games.id, q.toUpperCase()));
		} else {
			// For text search, filter by titles that contain ALL of the search words
			const searchWords = q.split(' ').filter(word => word.length > 0);
			if (searchWords.length > 0) {
				const allWordsCondition = and(
					...searchWords.map(word => sql`array_to_string(${games.names}, ' ') ILIKE ${'%' + word + '%'}`)
				);
				whereClauses.push(allWordsCondition);
			}
		}
	}
	
	if (dockedFps) whereClauses.push(sql`COALESCE(${latestProfileSubquery.profiles}->'docked'->>'target_fps', ${graphicsSettings.settings}->'docked'->'framerate'->>'targetFps') = ${dockedFps}`);
	if (handheldFps) whereClauses.push(sql`COALESCE(${latestProfileSubquery.profiles}->'handheld'->>'target_fps', ${graphicsSettings.settings}->'handheld'->'framerate'->>'targetFps') = ${handheldFps}`);
	
	if (resolutionType) whereClauses.push(sql`${latestProfileSubquery.profiles}->'docked'->>'resolution_type' = ${resolutionType} OR ${latestProfileSubquery.profiles}->'handheld'->>'resolution_type' = ${resolutionType}`);
	
	const isSearchingOrFiltering = q || dockedFps || handheldFps || resolutionType;

	if (!isSearchingOrFiltering) {
		whereClauses.push(sql`${latestProfileSubquery.groupId} IS NOT NULL OR ${graphicsSettings.groupId} IS NOT NULL`);
	}

	const where = whereClauses.length > 0 ? and(...whereClauses) : undefined;

	const getOrderBy = () => {
		if (isTitleIdSearch) {
			return desc(games.id);
		}
		if (q) {
			return sql`word_similarity(array_to_string(${games.names}, ' '), ${q}) DESC`;
		}

		switch (sort) {
			case 'name-asc':
				return sql`${games.names}[1] ASC`;
			case 'size-desc':
				return desc(games.sizeInBytes);
			case 'date-desc':
			default:
				return desc(games.lastUpdated);
		}
	};

	const query = db.with(latestProfileSubquery)
		.select({
			id: games.id,
			groupId: games.groupId,
			names: games.names,
			iconUrl: games.iconUrl,
			publisher: games.publisher,
			lastUpdated: games.lastUpdated,
			performance: sql`
					jsonb_build_object(
						'docked', jsonb_build_object(
							'target_fps',
							CASE
								WHEN ${latestProfileSubquery.profiles}->'docked'->>'target_fps' IS NOT NULL
								THEN ${latestProfileSubquery.profiles}->'docked'->>'target_fps'
								ELSE ${graphicsSettings.settings}->'docked'->'framerate'->>'targetFps'
							END
						),
						'handheld', jsonb_build_object(
							'target_fps',
							CASE
								WHEN ${latestProfileSubquery.profiles}->'handheld'->>'target_fps' IS NOT NULL
								THEN ${latestProfileSubquery.profiles}->'handheld'->>'target_fps'
								ELSE ${graphicsSettings.settings}->'handheld'->'framerate'->>'targetFps'
							END
						)
					)
				`
			})
		.from(games)
		.leftJoin(latestProfileSubquery, eq(games.groupId, latestProfileSubquery.groupId))
		.leftJoin(graphicsSettings, eq(games.groupId, graphicsSettings.groupId))
		.where(where)
		.orderBy(getOrderBy())
		.limit(PAGE_SIZE * 2) 
		.offset((page - 1) * PAGE_SIZE);

	const countQuery = db.with(latestProfileSubquery)
		.select({ count: sql`count(distinct ${games.groupId})` })
		.from(games)
		.leftJoin(latestProfileSubquery, eq(games.groupId, latestProfileSubquery.groupId))
		.leftJoin(graphicsSettings, eq(games.groupId, graphicsSettings.groupId))
		.where(where);

	const uniqueContributorsQuery = db
		.select({ contributor: sql`unnest(${performanceProfiles.contributor})`.as('contributor') })
		.from(performanceProfiles)
		.groupBy(sql`contributor`);

	const statsQuery = db.select({
		totalGames: countDistinct(performanceProfiles.groupId),
		totalProfiles: count(performanceProfiles.id),
		totalContributors: sql`(select count(*) from (${uniqueContributorsQuery}))`.mapWith(Number)
	}).from(performanceProfiles);

	const [queryResult, countResult, statsResult] = await Promise.all([query, countQuery, statsQuery]);

	const uniqueResults = Array.from(new Map(queryResult.map(item => [item.groupId, item])).values()).slice(0, PAGE_SIZE);

	const totalItems = parseInt(countResult[0]?.count || '0', 10);
		const totalPages = Math.ceil(totalItems / PAGE_SIZE);

	let recentUpdates = [];
	if (page === 1 && !isSearchingOrFiltering) {
		const recentGroups = await db
			.selectDistinct({ groupId: gameGroups.id, lastUpdated: gameGroups.lastUpdated })
			.from(gameGroups)
			.leftJoin(performanceProfiles, eq(gameGroups.id, performanceProfiles.groupId))
			.leftJoin(graphicsSettings, eq(gameGroups.id, graphicsSettings.groupId))
			.where(or(
				sql`${performanceProfiles.groupId} IS NOT NULL`,
				sql`${graphicsSettings.groupId} IS NOT NULL`
			))
			.orderBy(desc(gameGroups.lastUpdated))
			.limit(10);

		const groupIds = recentGroups.map(row => row.groupId).filter(Boolean);

		if (groupIds.length > 0) {
			const recentGames = await db.selectDistinctOn([games.groupId], {
				id: games.id,
				groupId: games.groupId,
				names: games.names,
				publisher: games.publisher,
				iconUrl: games.iconUrl
			}).from(games).where(inArray(games.groupId, groupIds));
			
			recentUpdates = groupIds.map(id => recentGames.find(g => g.groupId === id)).filter(Boolean);
		}
	}
	
	return {
		results: uniqueResults,
		recentUpdates,
		pagination: { currentPage: page, totalPages, totalItems },
		stats: {
			totalGames: statsResult[0]?.totalGames || 0,
			totalProfiles: statsResult[0]?.totalProfiles || 0,
			totalContributors: statsResult[0]?.totalContributors || 0
		}
	};
}