import * as gameRepo from '$lib/repositories/gameRepository';

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

    const games = await gameRepo.getGamesForGroups(locals.db, Array.from(groupIds));

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
                submittedAt: item.lastUpdated || item.createdAt // Fallback
            });
        }
        prGroups.get(item.prNumber).contributions[type].push(item);
    };

    pendingData.performance.forEach((/** @type {any} */ p) => addToGroup(p, 'performance'));
    pendingData.graphics.forEach((/** @type {any} */ g) => addToGroup(g, 'graphics'));
    pendingData.youtube.forEach((/** @type {any} */ y) => addToGroup(y, 'youtube'));

    return {
        groups: Array.from(prGroups.values()).sort((a, b) => b.prNumber - a.prNumber)
    };
}
