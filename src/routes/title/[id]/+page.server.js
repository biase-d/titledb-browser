import { error } from '@sveltejs/kit';
import * as gameService from '$lib/services/gameService';
import { Game } from '$lib/models/Game.js';

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