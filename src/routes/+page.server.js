import { searchGames } from '$lib/games/searchGames';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ url, parent }) => {
	const { session } = await parent();
	const searchResults = await searchGames(url.searchParams);

	return {
		session,
		...searchResults
	};
};