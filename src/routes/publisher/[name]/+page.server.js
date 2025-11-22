import { searchGames } from '$lib/games/searchGames';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, url, parent, cookies }) => {
	const { session } = await parent();
	const publisherName = params.name;

	// Create search params for the query
	const searchParams = new URLSearchParams(url.searchParams);
	searchParams.set('publisher', publisherName);
	
	// Respect the user's region preference for sorting/grouping
	const preferredRegion = cookies.get('preferred_region') || 'US';
	searchParams.set('region', preferredRegion);
	
	const searchResults = await searchGames(searchParams);

	return {
		session,
		publisherName,
		...searchResults
	};
};