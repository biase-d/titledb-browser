/**
 * @file Game Repository
 * @description Pure functions for game-related database operations
 * Migrated from $lib/games/searchGames.js and $lib/games/getGameDetails.js
 */

import { games, performanceProfiles, graphicsSettings, gameGroups, youtubeLinks, dataRequests } from '$lib/db/schema';
import { desc, eq, sql, inArray, or, and, count, countDistinct, notExists, ne } from 'drizzle-orm';

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
        .where(and(where, eq(latestProfileSubquery.status, 'approved'), or(eq(graphicsSettings.status, 'approved'), sql`${graphicsSettings.status} IS NULL`)))
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

    // Map results (no fallback to graphics settings as requested)
    const mappedResults = results.map(r => {
        let finalPerformance = r.performance;

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
        db.query.performanceProfiles.findMany({
            where: and(eq(performanceProfiles.groupId, groupId), eq(performanceProfiles.status, 'approved'))
        }),
        db.query.graphicsSettings.findFirst({
            where: and(eq(graphicsSettings.groupId, groupId), eq(graphicsSettings.status, 'approved'))
        }),
        db.query.youtubeLinks.findMany({
            where: and(eq(youtubeLinks.groupId, groupId), eq(youtubeLinks.status, 'approved'))
        })
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

/**
 * Get game IDs and last updated for sitemap generation
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {number} [limit=45000] - Maximum number of games
 * @returns {Promise<Array<{id: string, lastUpdated: Date|null}>>}
 */
export async function getGameIdsForSitemap(db, limit = 45000) {
    return await db.select({
        id: games.id,
        lastUpdated: games.lastUpdated
    })
        .from(games)
        .orderBy(desc(games.lastUpdated))
        .limit(limit);
}

/**
 * Get game with performance data for OG image generation
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string} gameId - Game ID
 * @returns {Promise<{game: Object, performance: Object|null, graphics: Object|null}|null>}
 */
export async function getGameWithPerformanceForOg(db, gameId) {
    const game = await db.query.games.findFirst({ where: eq(games.id, gameId) });
    if (!game) return null;

    const groupId = game.groupId;
    const [perf, graphics] = await Promise.all([
        db.query.performanceProfiles.findFirst({
            where: eq(performanceProfiles.groupId, groupId),
            orderBy: (profiles) => [desc(profiles.lastUpdated)]
        }),
        db.query.graphicsSettings.findFirst({
            where: eq(graphicsSettings.groupId, groupId)
        })
    ]);

    return { game, performance: perf || null, graphics: graphics || null };
}

/**
 * Get favorited games with performance data
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string[]} gameIds - Array of game IDs
 * @returns {Promise<Array>}
 */
export async function getFavoriteGamesWithPerformance(db, gameIds) {
    if (!gameIds || gameIds.length === 0) return [];

    const latestProfileSubquery = db.$with('latest_profile').as(
        db.selectDistinctOn([performanceProfiles.groupId], {
            groupId: performanceProfiles.groupId,
            profiles: performanceProfiles.profiles
        }).from(performanceProfiles).orderBy(performanceProfiles.groupId, desc(performanceProfiles.gameVersion))
    );

    return await db.with(latestProfileSubquery)
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
        .where(inArray(games.id, gameIds));
}

const CONTRIBUTE_PAGE_SIZE = 50;

/**
 * Get groups missing performance/graphics data for contribute page
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {Object} options
 * @param {number} options.page
 * @param {string} options.sortBy
 * @param {string} options.preferredRegion
 * @returns {Promise<{games: Array, sortBy: string, pagination: Object}>}
 */
export async function getMissingDataGroups(db, { page, sortBy, preferredRegion }) {
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
    const totalPages = Math.ceil(totalItems / CONTRIBUTE_PAGE_SIZE);

    // Get paginated group IDs
    let groupIds = [];

    if (sortBy === 'requests') {
        const rankedGroups = await db.select({
            groupId: games.groupId,
            requestCount: count(dataRequests.userId)
        })
            .from(games)
            .leftJoin(dataRequests, eq(games.id, dataRequests.gameId))
            .where(inArray(games.groupId, groupsQuery))
            .groupBy(games.groupId)
            .orderBy(desc(count(dataRequests.userId)))
            .limit(CONTRIBUTE_PAGE_SIZE)
            .offset((page - 1) * CONTRIBUTE_PAGE_SIZE);

        groupIds = rankedGroups.map(g => g.groupId);
    } else {
        const groupsWithMissingData = await groupsQuery.limit(CONTRIBUTE_PAGE_SIZE).offset((page - 1) * CONTRIBUTE_PAGE_SIZE);
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
        games: gamesList,
        sortBy,
        pagination: {
            currentPage: page,
            totalPages,
            totalItems
        }
    };
}

/**
 * Get user contribution statistics for profile page
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string} username
 * @returns {Promise<{perfContribs: Array, graphicsContribs: Array, videoContribs: Array}>}
 */
export async function getUserContributionStats(db, username) {
    const [perfContribs, graphicsContribs, videoContribs] = await Promise.all([
        db.select({
            groupId: performanceProfiles.groupId,
            gameVersion: performanceProfiles.gameVersion,
            sourcePrUrl: performanceProfiles.sourcePrUrl
        }).from(performanceProfiles).where(sql`${performanceProfiles.contributor} @> ARRAY[${username}]`),

        db.select({
            groupId: graphicsSettings.groupId
        }).from(graphicsSettings).where(sql`${graphicsSettings.contributor} @> ARRAY[${username}]`),

        db.select({
            groupId: youtubeLinks.groupId
        }).from(youtubeLinks).where(eq(youtubeLinks.submittedBy, username))
    ]);

    return { perfContribs, graphicsContribs, videoContribs };
}

/**
 * Get games for a list of group IDs (for profile contributions display)
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string[]} groupIds
 * @returns {Promise<Array>}
 */
export async function getGamesForGroups(db, groupIds) {
    if (!groupIds || groupIds.length === 0) return [];

    return await db.selectDistinctOn([games.groupId], {
        id: games.id,
        groupId: games.groupId,
        names: games.names,
        iconUrl: games.iconUrl
    }).from(games).where(inArray(games.groupId, groupIds));
}

/**
 * Save a pending contribution to the database
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {Object} contribution
 * @returns {Promise<void>}
 */
export async function savePendingContribution(db, contribution) {
    const { groupId, performance, graphics, youtube, prNumber } = contribution;

    const inserts = [];

    if (performance && performance.length > 0) {
        performance.forEach(profile => {
            inserts.push(db.insert(performanceProfiles).values({
                groupId,
                gameVersion: profile.gameVersion,
                suffix: profile.suffix,
                profiles: profile.profiles,
                contributor: profile.contributor,
                status: 'pending',
                prNumber
            }));
        });
    }

    if (graphics) {
        inserts.push(db.insert(graphicsSettings).values({
            groupId,
            settings: graphics.settings,
            contributor: graphics.contributor,
            status: 'pending',
            prNumber
        }).onConflictDoUpdate({
            target: graphicsSettings.groupId,
            set: {
                settings: graphics.settings,
                contributor: graphics.contributor,
                status: 'pending',
                prNumber,
                lastUpdated: sql`NOW()`
            }
        }));
    }

    if (youtube && youtube.length > 0) {
        youtube.forEach(link => {
            inserts.push(db.insert(youtubeLinks).values({
                groupId,
                url: link.url,
                notes: link.notes,
                submittedBy: link.submittedBy,
                status: 'pending',
                prNumber
            }));
        });
    }

    await Promise.all(inserts);
}

/**
 * Get all pending contributions
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @returns {Promise<Object>}
 */
export async function getPendingContributions(db) {
    const [perf, graphs, vids] = await Promise.all([
        db.query.performanceProfiles.findMany({ where: eq(performanceProfiles.status, 'pending') }),
        db.query.graphicsSettings.findMany({ where: eq(graphicsSettings.status, 'pending') }),
        db.query.youtubeLinks.findMany({ where: eq(youtubeLinks.status, 'pending') })
    ]);

    return {
        performance: perf,
        graphics: graphs,
        youtube: vids
    };
}

/**
 * Approve a pending contribution
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {number} prNumber
 * @returns {Promise<void>}
 */
export async function approveContribution(db, prNumber) {
    await Promise.all([
        db.update(performanceProfiles).set({ status: 'approved' }).where(eq(performanceProfiles.prNumber, prNumber)),
        db.update(graphicsSettings).set({ status: 'approved' }).where(eq(graphicsSettings.prNumber, prNumber)),
        db.update(youtubeLinks).set({ status: 'approved' }).where(eq(youtubeLinks.prNumber, prNumber))
    ]);
}
