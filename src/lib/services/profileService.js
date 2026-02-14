/**
 * @file Profile Service
 * @description Business logic for user profile pages - contribution aggregation and badge calculation
 */

import * as gameRepo from '$lib/repositories/gameRepository';
import * as prefRepo from '$lib/repositories/preferencesRepository';

const BADGES = [
    { threshold: 1, name: 'Shroom Stomper', color: '#a16207', icon: 'mdi:mushroom' },
    { threshold: 5, name: 'Grumpy Gator', color: '#16a34a', icon: 'mdi:alligator' },
    { threshold: 15, name: 'Floating Brain Jelly', color: '#f59e0b', icon: 'mdi:jellyfish' },
    { threshold: 30, name: 'Spooky Robe Guy', color: '#e11d48', icon: 'mdi:ghost' },
    { threshold: 50, name: 'Big Buff Croc', color: '#78716c', icon: 'mdi:arm-flex' },
    { threshold: 100, name: 'Evil Gray Twin', color: '#4f46e5', icon: 'mdi:sword-cross' },
    { threshold: 200, name: 'King K. Roolish', color: '#facc15', icon: 'mdi:crown' },
    { threshold: 300, name: 'Big Purple Pterodactyl', color: '#8b5cf6', icon: 'mdi:bird' },
    { threshold: 400, name: 'Ancient Angel Borb', color: '#d1d5db', icon: 'mdi:shield-star' },
    { threshold: 500, name: 'Creative Right Hand', color: '#fde047', icon: 'mdi:hand-back-right' }
].sort((a, b) => b.threshold - a.threshold);

/**
 * Get user contributions with badge calculation
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {string} username
 * @param {number} page
 * @returns {Promise<Object>}
 */
export async function getUserContributions(db, username, page) {
    const PAGE_SIZE = 24;

    /** @type {[any, any]} */
    const [data, preferences] = await Promise.all([
        gameRepo.getUserContributionStats(db, username),
        prefRepo.getUserPreferences(db, username)
    ]);

    // Fetch featured game info if set
    let featuredGame = null;
    if (preferences?.featuredGameId) {
        featuredGame = await gameRepo.findGameById(db, preferences.featuredGameId);
    }

    // Normalize PR identifiers to avoid double counting, with fallback for missing info
    /** @param {any} p @param {string} type @param {number|string} id */
    const getPrId = (p, type, id) => {
        if (p.prNumber) return `pr-${p.prNumber}`;
        const url = p.sourcePrUrl?.toLowerCase();
        if (url) {
            const match = url.match(/\/pull\/(\d+)/);
            if (match) return `pr-${match[1]}`;
            return url;
        }
        // Fallback: If no PR metadata is found, treat each DB entry as a unique legacy contribution
        return `legacy-${type}-${id}`;
    };

    const uniquePrs = new Set([
        ...data.perfContribs.map((p, i) => getPrId(p, 'perf', p.id || i)),
        ...data.graphicsContribs.map((g, i) => getPrId(g, 'graph', g.groupId || i)),
        ...data.videoContribs.map((v, i) => getPrId(v, 'vid', v.id || i))
    ].filter(Boolean));

    const totalContributions = uniquePrs.size;
    const currentTier = BADGES.find(badge => totalContributions >= badge.threshold) || null;

    const allGroupIds = [...new Set([
        ...data.perfContribs.map(p => p.groupId),
        ...data.graphicsContribs.map(g => g.groupId),
        ...data.videoContribs.map(v => v.groupId)
    ])];

    if (allGroupIds.length === 0) {
        return {
            contributions: [],
            totalContributions: 0,
            currentTierName: null,
            pagination: null
        };
    }

    const totalItems = allGroupIds.length;
    const totalPages = Math.ceil(totalItems / PAGE_SIZE);
    const offset = (page - 1) * PAGE_SIZE;
    const paginatedGroupIds = allGroupIds.slice(offset, offset + PAGE_SIZE);

    if (paginatedGroupIds.length === 0) {
        return {
            contributions: [],
            totalContributions,
            currentTierName: currentTier?.name || null,
            featuredGame,
            pagination: { currentPage: page, totalPages, totalItems }
        };
    }

    const gamesInvolved = await gameRepo.getGamesForGroups(db, paginatedGroupIds);

    const contributionsByGroup = new Map();

    for (const game of gamesInvolved) {
        contributionsByGroup.set(game.groupId, {
            game: { name: game.names[0], id: game.id, iconUrl: game.iconUrl },
            versions: [],
            hasGraphics: false,
            hasYoutube: false
        });
    }

    for (const profile of data.perfContribs) {
        if (contributionsByGroup.has(profile.groupId)) {
            contributionsByGroup.get(profile.groupId).versions.push({
                version: profile.gameVersion,
                sourcePrUrl: profile.sourcePrUrl
            });
        }
    }
    for (const graphic of data.graphicsContribs) {
        if (contributionsByGroup.has(graphic.groupId)) {
            contributionsByGroup.get(graphic.groupId).hasGraphics = true;
        }
    }
    for (const video of data.videoContribs) {
        if (contributionsByGroup.has(video.groupId)) {
            contributionsByGroup.get(video.groupId).hasYoutube = true;
        }
    }

    return {
        contributions: Array.from(contributionsByGroup.values()),
        totalContributions,
        currentTierName: currentTier?.name || null,
        featuredGame,
        pagination: {
            currentPage: page,
            totalPages,
            totalItems
        }
    };
}
