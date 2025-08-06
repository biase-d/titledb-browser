import { db } from '$lib/db';
import { games, performanceProfiles, graphicsSettings } from '$lib/db/schema';
import { desc, eq, sql, inArray, or, and } from 'drizzle-orm';

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
	if (q) {
		const searchConditions = [sql`similarity(array_to_string(${games.names}, ' '), CAST(${q} AS text)) > 0.1`];
		if (/^[0-9A-F]{16}$/i.test(q)) {
			searchConditions.push(eq(games.id, q.toUpperCase()));
		}
		whereClauses.push(or(...searchConditions));
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
		if (q) {
			const isTitleIdSearch = /^[0-9A-F]{16}$/i.test(q);
			return sql`
				CASE
					WHEN ${games.id} = ${isTitleIdSearch ? q.toUpperCase() : null} THEN 3
					WHEN array_to_string(${games.names}, ' ') ILIKE ${'%' + q + '%'} THEN 2
					ELSE 1
				END DESC,
				similarity(array_to_string(${games.names}, ' '), CAST(${q} AS text)) DESC
			`;
		}
		switch (sort) {
			case 'name-asc': return sql`${games.names}[1] ASC`;
			case 'size-desc': return desc(games.sizeInBytes);
			case 'date-desc': default: return desc(games.lastUpdated);
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
	
	const statsQuery = db.select({
		totalGames: sql`count(distinct ${performanceProfiles.groupId})`.mapWith(Number),
		totalProfiles: sql`count(*)`.mapWith(Number),
		totalContributors: sql`count(distinct ${performanceProfiles.contributor})`.mapWith(Number)
	}).from(performanceProfiles);
	
	const [queryResult, countResult, statsResult] = await Promise.all([query, countQuery, statsQuery]);

	const uniqueResults = Array.from(new Map(queryResult.map(item => [item.groupId, item])).values()).slice(0, PAGE_SIZE);

	const totalItems = parseInt(countResult[0]?.count || '0', 10);
	const totalPages = Math.ceil(totalItems / PAGE_SIZE);

	let recentUpdates = [];
	if (page === 1 && !isSearchingOrFiltering) {
		const recentGroupsQuery = sql`
			WITH all_updates AS (
				SELECT group_id, last_updated FROM ${performanceProfiles}
				UNION ALL
				SELECT group_id, last_updated FROM ${graphicsSettings}
			),
			latest_updates AS (
				SELECT group_id, MAX(last_updated) as max_last_updated
				FROM all_updates
				GROUP BY group_id
			)
			SELECT group_id
			FROM latest_updates
			ORDER BY max_last_updated DESC
			LIMIT 10;
		`;
		
		const recentGroupsResult = await db.execute(recentGroupsQuery);
		const groupIds = Array.isArray(recentGroupsResult)
			? recentGroupsResult.map(row => row.group_id).filter(Boolean)
			: [];

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