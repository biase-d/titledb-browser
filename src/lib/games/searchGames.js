import { db } from '$lib/db';
import { games, performanceProfiles, graphicsSettings, gameGroups, dataRequests } from '$lib/db/schema';
import { desc, eq, sql, inArray, or, and, count, countDistinct } from 'drizzle-orm';

const PAGE_SIZE = 50;

export async function searchGames(searchParams) {
    // Safety net: Ensure extensions exist
    try {
        await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public;`);
        await db.execute(sql`CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public;`);
    } catch (e) {
        // ignore runtime fallback
    }

	const page = parseInt(searchParams.get('page') || '1', 10);
	const q = searchParams.get('q') || '';
	const publisher = searchParams.get('publisher');
	const dockedFps = searchParams.get('docked_fps');
	const handheldFps = searchParams.get('handheld_fps');
	const resolutionType = searchParams.get('res_type');
	const sort = searchParams.get('sort') || (q ? 'relevance-desc' : 'date-desc');
	
	const preferredRegion = searchParams.get('region') || 'US';
    const regionFilter = searchParams.get('region_filter');

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
			const searchWords = q.split(' ').filter(word => word.length > 0);
			const allWordsCondition = and(
                    // Explicitly use public.unaccent to avoid search_path issues
					...searchWords.map(word => sql`public.unaccent(array_to_string(${games.names}, ' ')) ILIKE public.unaccent(${'%' + word + '%'})`)
			);
			whereClauses.push(allWordsCondition);
		}
	}

	if (publisher) {
        // Explicitly use public.unaccent
		whereClauses.push(sql`public.unaccent(${games.publisher}) ILIKE public.unaccent(${publisher})`);
	}
    
    if (regionFilter) {
        if (regionFilter.length === 2) {
            whereClauses.push(sql`${games.regions} @> ARRAY[${regionFilter}]::text[]`);
        } 
        else if (regionFilter === 'Europe') {
            const euCodes = ['GB', 'FR', 'DE', 'IT', 'ES', 'NL', 'PT', 'RU', 'AT', 'BE', 'BG', 'CH', 'CY', 'CZ', 'DK', 'EE', 'FI', 'GR', 'HR', 'HU', 'IE', 'IL', 'LT', 'LU', 'LV', 'MT', 'NO', 'PL', 'RO', 'SE', 'SI', 'SK'];
            whereClauses.push(sql`${games.regions} && ARRAY[${euCodes}]::text[]`);
        }
        else if (regionFilter === 'Asia') {
            const asiaCodes = ['HK', 'TW', 'KR', 'CN', 'MO', 'JP', 'SG', 'TH', 'MY'];
            whereClauses.push(sql`${games.regions} && ARRAY[${asiaCodes}]::text[]`);
        }
        else if (regionFilter === 'Americas') {
            const amCodes = ['US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE'];
            whereClauses.push(sql`${games.regions} && ARRAY[${amCodes}]::text[]`);
        }
    }
	
	if (dockedFps) whereClauses.push(sql`COALESCE(${latestProfileSubquery.profiles}->'docked'->>'target_fps', ${graphicsSettings.settings}->'docked'->'framerate'->>'targetFps') = ${dockedFps}`);
	if (handheldFps) whereClauses.push(sql`COALESCE(${latestProfileSubquery.profiles}->'handheld'->>'target_fps', ${graphicsSettings.settings}->'handheld'->'framerate'->>'targetFps') = ${handheldFps}`);
	
	if (resolutionType) whereClauses.push(sql`${latestProfileSubquery.profiles}->'docked'->>'resolution_type' = ${resolutionType} OR ${latestProfileSubquery.profiles}->'handheld'->>'resolution_type' = ${resolutionType}`);
	
	const isSearchingOrFiltering = q || publisher || regionFilter || dockedFps || handheldFps || resolutionType;

	if (!isSearchingOrFiltering) {
		const hasGraphics = sql`${graphicsSettings.groupId} IS NOT NULL`;
		const hasMeaningfulPerformance = sql`(${latestProfileSubquery.groupId} IS NOT NULL AND ${latestProfileSubquery.profiles}::text != '{}')`;
		whereClauses.push(or(hasGraphics, hasMeaningfulPerformance));
	}

	const where = whereClauses.length > 0 ? and(...whereClauses) : undefined;

	const regionPriority = sql`
		CASE 
			WHEN ${games.regions} @> ARRAY[${preferredRegion}]::text[] THEN 0 
			WHEN ${games.regions} @> ARRAY['US']::text[] THEN 1
			ELSE 2 
		END
	`;

	const innerQuery = db.with(latestProfileSubquery)
		.selectDistinctOn([games.groupId], {
			id: games.id,
			groupId: games.groupId,
			names: games.names,
			regions: games.regions,
			iconUrl: games.iconUrl,
			publisher: games.publisher,
			lastUpdated: games.lastUpdated,
			sizeInBytes: games.sizeInBytes,
			dockedFps: sql`COALESCE(
				(${latestProfileSubquery.profiles}->'docked'->>'target_fps'), 
				(${graphicsSettings.settings}->'docked'->'framerate'->>'targetFps'),
				(${graphicsSettings.settings}->'docked'->'framerate'->>'lockType')
			)`.as('dockedFps'),
			handheldFps: sql`COALESCE(
				(${latestProfileSubquery.profiles}->'handheld'->>'target_fps'), 
				(${graphicsSettings.settings}->'handheld'->'framerate'->>'targetFps'),
				(${graphicsSettings.settings}->'handheld'->'framerate'->>'lockType')
			)`.as('handheldFps')
		})
		.from(games)
		.leftJoin(latestProfileSubquery, eq(games.groupId, latestProfileSubquery.groupId))
		.leftJoin(graphicsSettings, eq(games.groupId, graphicsSettings.groupId))
		.where(where)
		.orderBy(games.groupId, regionPriority, desc(games.lastUpdated))
		.as('grouped_games');

	const finalQuery = db.select({
		id: innerQuery.id,
		groupId: innerQuery.groupId,
		names: innerQuery.names,
		regions: innerQuery.regions,
		iconUrl: innerQuery.iconUrl,
		publisher: innerQuery.publisher,
		lastUpdated: innerQuery.lastUpdated,
		performance: sql`jsonb_build_object(
			'docked', jsonb_build_object('target_fps', ${innerQuery.dockedFps}),
			'handheld', jsonb_build_object('target_fps', ${innerQuery.handheldFps})
		)`
	})
	.from(innerQuery);

	if (isTitleIdSearch) {
		finalQuery.orderBy(desc(innerQuery.id));
	} else if (q) {
        // Explicitly use public.word_similarity and public.unaccent
		finalQuery.orderBy(sql`public.word_similarity(public.unaccent(array_to_string(${innerQuery.names}, ' ')), public.unaccent(${q})) DESC`);
	} else {
		switch (sort) {
			case 'name-asc': finalQuery.orderBy(sql`${innerQuery.names}[1] ASC`); break;
			case 'size-desc': finalQuery.orderBy(desc(innerQuery.sizeInBytes)); break;
			case 'date-desc': 
			default: finalQuery.orderBy(desc(innerQuery.lastUpdated)); break;
		}
	}

	const results = await finalQuery.limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE);

	const countResult = await db.with(latestProfileSubquery)
		.select({ count: countDistinct(games.groupId) })
		.from(games)
		.leftJoin(latestProfileSubquery, eq(games.groupId, latestProfileSubquery.groupId))
		.leftJoin(graphicsSettings, eq(games.groupId, graphicsSettings.groupId))
		.where(where);

	const mainStatsQuery = db.select({
		totalGames: countDistinct(performanceProfiles.groupId),
		totalProfiles: count()
	}).from(performanceProfiles);

	const uniqueContributorsQuery = db.select({ count: count() }).from(
		db.selectDistinct({ c: sql`unnest(${performanceProfiles.contributor})` }).from(performanceProfiles).as('unique_contribs')
	);
	
	const [mainStatsResult, contributorStatsResult] = await Promise.all([
		mainStatsQuery,
		uniqueContributorsQuery
	]);

	let recentUpdates = [];
	if (page === 1 && !isSearchingOrFiltering) {
		const recentGroups = await db.with(latestProfileSubquery)
			.selectDistinct({ groupId: gameGroups.id, lastUpdated: gameGroups.lastUpdated })
			.from(gameGroups)
			.leftJoin(latestProfileSubquery, eq(gameGroups.id, latestProfileSubquery.groupId))
			.leftJoin(graphicsSettings, eq(gameGroups.id, graphicsSettings.groupId))
			.where(or(
				sql`${graphicsSettings.groupId} IS NOT NULL`,
				sql`(${latestProfileSubquery.groupId} IS NOT NULL AND ${latestProfileSubquery.profiles}::text != '{}')`
			))
			.orderBy(desc(gameGroups.lastUpdated))
			.limit(12);

		const groupIds = recentGroups.map(row => row.groupId).filter(Boolean);

		if (groupIds.length > 0) {
			const candidates = await db.select({
				id: games.id,
				groupId: games.groupId,
				names: games.names,
				regions: games.regions,
				publisher: games.publisher,
				iconUrl: games.iconUrl
			}).from(games).where(inArray(games.groupId, groupIds));

			recentUpdates = groupIds.map(gid => {
				const groupGames = candidates.filter(g => g.groupId === gid);
				if (groupGames.length === 0) return null;
				
				groupGames.sort((a, b) => {
					const aPref = a.regions?.includes(preferredRegion) ? 0 : (a.regions?.includes('US') ? 1 : 2);
					const bPref = b.regions?.includes(preferredRegion) ? 0 : (b.regions?.includes('US') ? 1 : 2);
					return aPref - bPref;
				});
				return groupGames[0];
			}).filter(Boolean);
		}
	}
	
	return {
		results,
		recentUpdates,
		pagination: { currentPage: page, totalPages: Math.ceil((countResult[0]?.count || 0) / PAGE_SIZE), totalItems: countResult[0]?.count || 0 },
		stats: {
			totalGames: mainStatsResult[0]?.totalGames || 0,
			totalProfiles: mainStatsResult[0]?.totalProfiles || 0,
			totalContributors: contributorStatsResult[0]?.count || 0
		}
	};
}