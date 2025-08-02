import { error } from '@sveltejs/kit'
import { getGameDetails } from '$lib/games/getGameDetails'


/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, parent }) => {
	const { session } = await parent();
	const titleId = params.id;

	const details = await getGameDetails(titleId);

	if (!details) {
		error(404, 'Game not found');
	}

	return {
		session,
		...details
	};
};