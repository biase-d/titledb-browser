import { db } from '$lib/db';
import { games, performanceProfiles, graphicsSettings, youtubeLinks } from '$lib/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

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
].sort((a, b) => b.threshold - a.threshold); // Sort descending to find the highest tier easily


/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, parent, url }) => {
	const { session } = await parent();
	const { username } = params;

	const perfContribs = await db.select({
		groupId: performanceProfiles.groupId,
		gameVersion: performanceProfiles.gameVersion,
		sourcePrUrl: performanceProfiles.sourcePrUrl
	}).from(performanceProfiles).where(sql`${performanceProfiles.contributor} @> ARRAY[${username}]`);

	const totalContributions = perfContribs.length;
	const currentTier = BADGES.find(badge => totalContributions >= badge.threshold) || null;

	if (totalContributions === 0) {
		return { username, session, contributions: [], totalContributions: 0, currentTier, pagination: null };
	}
	
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const PAGE_SIZE = 24;

	// Get all unique group IDs first to calculate total pages
	const allGroupIds = [...new Set(perfContribs.map(p => p.groupId))];
	const totalItems = allGroupIds.length;
	const totalPages = Math.ceil(totalItems / PAGE_SIZE);
	const offset = (page - 1) * PAGE_SIZE;

	// Get the slice of group IDs for the current page
	const paginatedGroupIds = allGroupIds.slice(offset, offset + PAGE_SIZE);

	// Now fetch all necessary data ONLY for the paginated groups
	const [gamesInvolved, graphicsContribs, videoContribs] = await Promise.all([
		db.query.games.findMany({
			where: inArray(games.groupId, paginatedGroupIds),
			distinctOn: [games.groupId]
		}),
		db.select({ groupId: graphicsSettings.groupId }).from(graphicsSettings).where(sql`${graphicsSettings.contributor} @> ARRAY[${username}] AND ${inArray(graphicsSettings.groupId, paginatedGroupIds)}`),
		db.select({ groupId: youtubeLinks.groupId }).from(youtubeLinks).where(sql`${eq(youtubeLinks.submittedBy, username)} AND ${inArray(youtubeLinks.groupId, paginatedGroupIds)}`)
	]);

	const graphicsGroupIds = new Set(graphicsContribs.map(g => g.groupId));
	const videoGroupIds = new Set(videoContribs.map(v => v.groupId));

	const gamesMap = new Map(gamesInvolved.map(g => [g.groupId, g]));
	const contributionsByGroup = {};

	// Filter performance contributions to only those on the current page
	const paginatedPerfContribs = perfContribs.filter(p => paginatedGroupIds.includes(p.groupId));

	for (const profile of paginatedPerfContribs) {
		const game = gamesMap.get(profile.groupId);
		if (!game) continue;

		if (!contributionsByGroup[profile.groupId]) {
			contributionsByGroup[profile.groupId] = {
				game: { name: game.names[0], id: game.id, iconUrl: game.iconUrl },
				versions: [],
				hasGraphics: graphicsGroupIds.has(profile.groupId),
				hasYoutube: videoGroupIds.has(profile.groupId)
			};
		}
		contributionsByGroup[profile.groupId].versions.push({
			version: profile.gameVersion,
			sourcePrUrl: profile.sourcePrUrl
		});
	}

	const contributions = Object.values(contributionsByGroup);
	
	return {
		username,
		session,
		contributions,
		totalContributions,
		currentTierName: currentTier?.name || null,
		pagination: {
			currentPage: page,
			totalPages,
			totalItems
		}
	};
};