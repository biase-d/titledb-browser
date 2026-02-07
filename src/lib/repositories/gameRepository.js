/**
 * @file Game Repository
 * @description Pure functions for game-related database operations
 * Migrated from $lib/games/searchGames.js and $lib/games/getGameDetails.js
 */

import { games, performanceProfiles, graphicsSettings, gameGroups, youtubeLinks } from '$lib/db/schema';
import { desc, eq, sql, inArray, or, and, count, countDistinct } from 'drizzle-orm';

const PAGE_SIZE = 50;

/**
 * Find a single game by ID
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string} titleId - Game title ID
 * @returns {Promise<Object|null>}
 */
export async function findGameById(db, titleId) {
    const result = await db.query.games.findFirst({
        where: eq(games.id, titleId)
    });

    return result || null;
}

/**
 * Get all games in a group
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string} groupId - Group ID
 * @returns {Promise<Array>}
 */
export async function getGamesByGroup(db, groupId) {
    return await db.query.games.findMany({
        where: eq(games.groupId, groupId),
        columns: { id: true, names: true, regions: true }
    });
}

/**
 * Search games with filters (migrated from searchGames.js)
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {URLSearchParams} searchParams - Search parameters
 * @returns {Promise<Object>} Search results with pagination
 */
export async function searchGames(db, searchParams) {
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
                ...searchWords.map(word => sql`extensions.unaccent(array_to_string(${games.names}, ' ')) ILIKE extensions.unaccent(${'%' + word + '%'})`)
            );
            whereClauses.push(allWordsCondition);
        }
    }

    if (publisher) {
        whereClauses.push(sql`extensions.unaccent(${games.publisher}) ILIKE extensions.unaccent(${publisher})`);
    }

    if (regionFilter) {
        if (regionFilter.length === 2) {
            whereClauses.push(sql`${games.regions} @> ARRAY[${regionFilter}]::text[]`);
        } else if (regionFilter === 'Europe') {
            const euCodes = ['GB', 'FR', 'DE', 'IT', 'ES', 'NL', 'PT', 'RU', 'AT', 'BE', 'BG', 'CH', 'CY', 'CZ', 'DK', 'EE', 'FI', 'GR', 'HR', 'HU', 'IE', 'IL', 'LT', 'LU', 'LV', 'MT', 'NO', 'PL', 'RO', 'SE', 'SI', 'SK'];
            whereClauses.push(sql`${games.regions} && ARRAY[${euCodes}]::text[]`);
        } else if (regionFilter === 'Asia') {
            const asiaCodes = ['HK', 'TW', 'KR', 'CN', 'MO', 'JP', 'SG', 'TH', 'MY'];
            whereClauses.push(sql`${games.regions} && ARRAY[${asiaCodes}]::text[]`);
        } else if (regionFilter === 'Americas') {
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
            bannerUrl: games.bannerUrl,
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
			)`.as('handheldFps'),
            fullProfiles: latestProfileSubquery.profiles,
            graphicsSettings: graphicsSettings.settings
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
        bannerUrl: innerQuery.bannerUrl,
        publisher: innerQuery.publisher,
        lastUpdated: innerQuery.lastUpdated,
        performance: innerQuery.fullProfiles,
        graphics: innerQuery.graphicsSettings,
        performanceSummary: sql`jsonb_build_object(
			'docked', jsonb_build_object('target_fps', ${innerQuery.dockedFps}),
			'handheld', jsonb_build_object('target_fps', ${innerQuery.handheldFps})
		)`
    })
        .from(innerQuery);

    if (isTitleIdSearch) {
        finalQuery.orderBy(desc(innerQuery.id));
    } else if (q) {
        finalQuery.orderBy(sql`extensions.word_similarity(extensions.unaccent(array_to_string(${innerQuery.names}, ' ')), extensions.unaccent(${q})) DESC`);
    } else {
        switch (sort) {
            case 'name-asc': finalQuery.orderBy(sql`${innerQuery.names}[1] ASC`); break;
            case 'size-desc': finalQuery.orderBy(desc(innerQuery.sizeInBytes)); break;
            case 'date-desc':
            default: finalQuery.orderBy(desc(innerQuery.lastUpdated)); break;
        }
    }

    const results = await finalQuery.limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE);

    // Map results (performance fallback logic)
    const mappedResults = results.map(r => {
        let finalPerformance = r.performance;

        if (!isPerformanceValid(finalPerformance) && r.graphics) {
            finalPerformance = mapGraphicsToPerformance(r.graphics);
        }

        if (!finalPerformance) {
            finalPerformance = r.performanceSummary;
        }

        return {
            ...r,
            performance: finalPerformance,
            graphics: undefined,
            performanceSummary: undefined
        };
    });

    const countResult = await db.with(latestProfileSubquery)
        .select({ count: countDistinct(games.groupId) })
        .from(games)
        .leftJoin(latestProfileSubquery, eq(games.groupId, latestProfileSubquery.groupId))
        .leftJoin(graphicsSettings, eq(games.groupId, graphicsSettings.groupId))
        .where(where);

    return {
        results: mappedResults,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil((countResult[0]?.count || 0) / PAGE_SIZE),
            totalItems: countResult[0]?.count || 0
        }
    };
}

/**
 * Find multiple games by their IDs
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string[]} ids - Array of game IDs
 * @returns {Promise<Array>}
 */
export async function findGamesByIds(db, ids) {
    if (!ids || ids.length === 0) {
        return [];
    }

    return await db.select({
        id: games.id,
        names: games.names
    })
        .from(games)
        .where(inArray(games.id, ids));
}

/**
 * Get detailed game information including performance history
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string} titleId - Game title ID
 * @returns {Promise<Object|null>}
 */
export async function getGameDetails(db, titleId) {
    const game = await db.query.games.findFirst({
        where: eq(games.id, titleId)
    });

    if (!game) {
        return null;
    }

    const { groupId } = game;

    const [groupInfo, allTitlesInGroup, allPerformanceProfiles, graphics, links] = await Promise.all([
        db.query.gameGroups.findFirst({ where: eq(gameGroups.id, groupId) }),
        db.query.games.findMany({
            where: eq(games.groupId, groupId),
            columns: { id: true, names: true, regions: true }
        }),
        db.query.performanceProfiles.findMany({ where: eq(performanceProfiles.groupId, groupId) }),
        db.query.graphicsSettings.findFirst({ where: eq(graphicsSettings.groupId, groupId) }),
        db.query.youtubeLinks.findMany({ where: eq(youtubeLinks.groupId, groupId) })
    ]);

    // Sort profiles by semantic version
    allPerformanceProfiles.sort((a, b) => {
        const partsA = a.gameVersion.split('.').map(part => parseInt(part, 10) || 0);
        const partsB = b.gameVersion.split('.').map(part => parseInt(part, 10) || 0);
        const len = Math.max(partsA.length, partsB.length);

        for (let i = 0; i < len; i++) {
            const numA = partsA[i] || 0;
            const numB = partsB[i] || 0;
            if (numB !== numA) {
                return numB - numA;
            }
        }
        return 0;
    });

    const latestProfile = allPerformanceProfiles[0] || null;

    const gameData = {
        ...game,
        graphics: graphics || null,
        performanceHistory: allPerformanceProfiles.map(p => ({
            id: p.id,
            gameVersion: p.gameVersion,
            suffix: p.suffix || '',
            profiles: p.profiles,
            contributor: p.contributor,
            sourcePrUrl: p.sourcePrUrl,
            lastUpdated: p.lastUpdated
        })),
        contributor: latestProfile?.contributor,
        sourcePrUrl: latestProfile?.sourcePrUrl
    };

    return {
        game: gameData,
        allTitlesInGroup: allTitlesInGroup.map((t) => ({
            id: t.id,
            name: t.names[0],
            regions: t.regions
        })),
        youtubeLinks: links,
        youtubeContributors: groupInfo?.youtubeContributors || []
    };
}

/**
 * Get recent game updates
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {number} [limit=15] - Number of results
 * @returns {Promise<Array>}
 */
export async function getRecentUpdates(db, limit = 15) {
    return await db.query.games.findMany({
        orderBy: desc(games.lastUpdated),
        limit
    });
}

// Helper functions (kept from original searchGames.js)

function mapGraphicsToPerformance(graphics) {
    if (!graphics) return null;

    const mapMode = (gMode) => {
        if (!gMode) return {};
        const res = gMode.resolution || {};
        const fps = gMode.framerate || {};

        return {
            resolution_type: res.resolutionType,
            resolution: res.fixedResolution,
            min_res: res.minResolution,
            max_res: res.maxResolution,
            resolutions: res.multipleResolutions?.join(', '),
            target_fps: fps.targetFps || (fps.lockType === 'Unlocked' ? 'Unlocked' : null),
            fps_behavior: fps.lockType === 'API' ? 'Locked' : 'Stable'
        };
    };

    return {
        docked: mapMode(graphics.docked),
        handheld: mapMode(graphics.handheld)
    };
}

function isPerformanceValid(perf) {
    if (!perf) return false;
    const keys = Object.keys(perf);
    if (keys.length === 0) return false;
    if (keys.length === 1 && keys[0] === 'contributor') return false;

    const hasDocked = perf.docked && (perf.docked.resolution_type || perf.docked.target_fps);
    const hasHandheld = perf.handheld && (perf.handheld.resolution_type || perf.handheld.target_fps);

    return hasDocked || hasHandheld;
}
