import { error } from '@sveltejs/kit';
import { getGameDetails } from '$lib/games/getGameDetails';
import { Game } from '$lib/models/Game.js';
import { db } from '$lib/db';
import { dataRequests } from '$lib/db/schema';
import { and, eq } from 'drizzle-orm';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, parent, url, cookies }) => {
	const { session } = await parent();
	const titleId = params.id;

	const details = await getGameDetails(titleId);

	if (!details) {
		error(404, 'Game not found');
	}

	const game = new Game(details);
	
	const preferredRegion = cookies.get('preferred_region') || 'US';

    // Check if user has requested data for this game
    let hasRequested = false;
    if (session?.user?.id) {
        const req = await db.select().from(dataRequests)
            .where(and(eq(dataRequests.gameId, titleId), eq(dataRequests.userId, session.user.id)))
            .limit(1);
        hasRequested = req.length > 0;
    }

	return {
		session,
		game,
		preferredRegion,
        hasRequested,
		url: {
			href: url.href,
			origin: url.origin,
		}
	};
};