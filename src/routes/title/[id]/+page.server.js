import { error, fail } from '@sveltejs/kit';
import * as gameService from '$lib/services/gameService';
import { Game } from '$lib/models/Game.js';
import * as prefRepo from '$lib/repositories/preferencesRepository';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, parent, url, cookies, locals }) => {
	const { session } = await parent();
	const titleId = params.id;

	// Use service layer to get game details with user context
	const userId = session?.user?.id;
	const db = locals.db;

	const details = await gameService.getGameContext(db, titleId, userId);

	if (!details) {
		error(404, 'Game not found');
	}

	const game = new Game(details);

	const preferredRegion = cookies.get('preferred_region') || 'US';

	return {
		session,
		game,
		preferredRegion,
		hasRequested: details.userContext?.hasRequested || false,
		url: {
			href: url.href,
			origin: url.origin,
		}
	};
};

/** @type {import('./$types').Actions} */
export const actions = {
	setFeatured: async ({ locals, params }) => {
		// @ts-ignore
		const username = session?.user?.login;
		const gameId = params.id;

		if (!username) return fail(401);

		await prefRepo.upsertUserPreferences(locals.db, username, { featuredGameId: gameId });

		return { success: true };
	}
};