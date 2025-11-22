import { searchGames } from '$lib/games/searchGames';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ url, parent, cookies }) => {
	const { session } = await parent();
	
	// Read the preferred region from the cookie
	const preferredRegion = cookies.get('preferred_region') || 'US';
	
	// Pass it to the search params
	const searchParams = new URLSearchParams(url.searchParams);
	searchParams.set('region', preferredRegion);

	const searchResults = await searchGames(searchParams);

	return {
		session,
		...searchResults
	};
};