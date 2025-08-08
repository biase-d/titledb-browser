import { db } from '$lib/db';
import { games, performanceProfiles } from '$lib/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, parent }) => {
	const { session } = await parent();
	const { username } = params;

	// Find all performance profiles where the contributor array contains the username
	const userProfiles = await db.query.performanceProfiles.findMany({
		where: sql`${performanceProfiles.contributor} @> ARRAY[${username}]`,
		columns: {
			groupId: true,
			gameVersion: true,
			sourcePrUrl: true
		}
	});

	if (userProfiles.length === 0) {
		return { username, session, contributions: [] };
	}

	// Get the unique group IDs from their contributions
	const groupIds = [...new Set(userProfiles.map(p => p.groupId))];

	// Fetch the primary game info for each of those groups in a single query
	// We only need one game from each group to get the name and a linkable ID
	const gamesInvolved = await db.query.games.findMany({
		where: inArray(games.groupId, groupIds),
		distinctOn: [games.groupId] // Get only one entry per group
	});

	// Create a map for quick lookups
	const gamesMap = new Map(gamesInvolved.map(g => [g.groupId, g]));

	// Group the profiles by game
	const contributionsByGroup = userProfiles.reduce((acc, profile) => {
		const game = gamesMap.get(profile.groupId);
		if (!game) return acc; // Safely skip profiles for games not in our DB

		if (!acc[profile.groupId]) {
			acc[profile.groupId] = {
				game: {
					name: game.names[0],
					id: game.id,
					iconUrl: game.iconUrl
				},
				versions: []
			};
		}
		acc[profile.groupId].versions.push({
			version: profile.gameVersion,
			sourcePrUrl: profile.sourcePrUrl
		});
		return acc;
	}, {});

	// Convert the grouped object to an array for the frontend
	const contributions = Object.values(contributionsByGroup);
	
	return {
		username,
		session,
		contributions,
		// This is for the badges/stats at the top of the page
		totalContributions: userProfiles.length
	};
};