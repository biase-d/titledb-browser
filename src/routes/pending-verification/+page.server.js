import * as gameRepo from '$lib/repositories/gameRepository';
import { Game } from '$lib/models/Game';

/**
 * @type {import('./$types').PageServerLoad}
 */
export async function load({ locals }) {
    /** @type {{ performance: any[], graphics: any[], youtube: any[] }} */
    const pendingData = await gameRepo.getPendingContributions(locals.db);

    // Extract unique groupIds to fetch game info
    const groupIds = new Set([
        ...pendingData.performance.map((/** @type {any} */ p) => p.groupId),
        ...pendingData.graphics.map((/** @type {any} */ g) => g.groupId),
        ...pendingData.youtube.map((/** @type {any} */ y) => y.groupId)
    ]);

    const rawGames = await gameRepo.getGamesForGroups(locals.db, Array.from(groupIds));
    const games = rawGames.map(g => new Game({ game: g }));

    // Group everything by prNumber
    const prGroups = new Map();

    const addToGroup = (item, type) => {
        if (!item.prNumber) return;
        if (!prGroups.has(item.prNumber)) {
            prGroups.set(item.prNumber, {
                prNumber: item.prNumber,
                groupId: item.groupId,
                game: games.find(g => g.groupId === item.groupId),
                contributions: { performance: [], graphics: [], youtube: [] },
                contributors: new Set(),
                submittedAt: item.lastUpdated || item.createdAt // Fallback
            });
        }

        const group = prGroups.get(item.prNumber);
        group.contributions[type].push(item);

        // Add contributors
        if (item.contributor) {
            if (Array.isArray(item.contributor)) {
                item.contributor.forEach(c => group.contributors.add(c));
            } else {
                group.contributors.add(item.contributor);
            }
        }
        if (item.submittedBy) {
            group.contributors.add(item.submittedBy);
        }
    };

    pendingData.performance.forEach((/** @type {any} */ p) => addToGroup(p, 'performance'));
    pendingData.graphics.forEach((/** @type {any} */ g) => addToGroup(g, 'graphics'));
    pendingData.youtube.forEach((/** @type {any} */ y) => addToGroup(y, 'youtube'));

    return {
        groups: Array.from(prGroups.values())
            .map(group => ({
                ...group,
                contributors: Array.from(group.contributors).sort()
            }))
            .sort((a, b) => b.prNumber - a.prNumber)
    };
}
