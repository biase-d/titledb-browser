import { error } from '@sveltejs/kit';
import { getGameDetails } from '$lib/games/getGameDetails';
import { Game } from '$lib/models/Game.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, parent, url }) => {
	const { session } = await parent();
	const titleId = params.id;

	const details = await getGameDetails(titleId);

	if (!details) {
		error(404, 'Game not found');
	}

	const game = new Game(details);
	
	return {
		session,
		game,
		url: {
			href: url.href,
			origin: url.origin,
		}
	};
};
