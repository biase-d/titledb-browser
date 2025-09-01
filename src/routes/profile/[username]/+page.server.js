import { db } from '$lib/db';
import { games, performanceProfiles, graphicsSettings, youtubeLinks } from '$lib/db/schema';
import { eq, inArray, sql, count, desc } from 'drizzle-orm';
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

	const totalContributions = perfContribs.length + graphicsContribs.length + videoContribs.length;
	const currentTier = BADGES.find(badge => totalContributions >= badge.threshold) || null;

	const allGroupIds = [...new Set([
		...perfContribs.map(p => p.groupId),
		...graphicsContribs.map(g => g.groupId),
		...videoContribs.map(v => v.groupId)
	])];
	
	if (allGroupIds.length === 0) {
		return { username, session, contributions: [], totalContributions: 0, currentTier: null, pagination: null };
	}

	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const PAGE_SIZE = 24;
	const totalItems = allGroupIds.length;
	const totalPages = Math.ceil(totalItems / PAGE_SIZE);
	const offset = (page - 1) * PAGE_SIZE;
	const paginatedGroupIds = allGroupIds.slice(offset, offset + PAGE_SIZE);

	if (paginatedGroupIds.length === 0) {
		return { username, session, contributions: [], totalContributions, currentTierName: currentTier?.name || null, pagination: { currentPage: page, totalPages, totalItems } };
	}

	const gamesInvolved = await db.selectDistinctOn([games.groupId], {
		id: games.id,
		groupId: games.groupId,
		names: games.names,
		iconUrl: games.iconUrl
	}).from(games).where(inArray(games.groupId, paginatedGroupIds));

	const contributionsByGroup = new Map();
	
	for (const game of gamesInvolved) {
		contributionsByGroup.set(game.groupId, {
			game: { name: game.names[0], id: game.id, iconUrl: game.iconUrl },
			versions: [],
			hasGraphics: false,
			hasYoutube: false
		});
	}

	for (const profile of perfContribs) {
		if (contributionsByGroup.has(profile.groupId)) {
			contributionsByGroup.get(profile.groupId).versions.push({
				version: profile.gameVersion,
				sourcePrUrl: profile.sourcePrUrl
			});
		}
	}
	for (const graphic of graphicsContribs) {
		if (contributionsByGroup.has(graphic.groupId)) {
			contributionsByGroup.get(graphic.groupId).hasGraphics = true;
		}
	}
	for (const video of videoContribs) {
		if (contributionsByGroup.has(video.groupId)) {
			contributionsByGroup.get(video.groupId).hasYoutube = true;
		}
	}

	return {
		username,
		session,
		contributions: Array.from(contributionsByGroup.values()),
		totalContributions,
		currentTierName: currentTier?.name || null,
		pagination: {
			currentPage: page,
			totalPages,
			totalItems
		}
	};
};