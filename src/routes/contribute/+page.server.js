import * as contributeService from '$lib/services/contributeService';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ parent, url, cookies, locals }) => {
	const { session } = await parent();

	if (!session?.user) {
		return { session, games: [], pagination: null };
	}

	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const sortBy = url.searchParams.get('sort') || 'default';
	const preferredRegion = cookies.get('preferred_region') || 'US';

	const result = await contributeService.getMissingDataGames(locals.db, {
		page,
		sortBy,
		preferredRegion
	});

	return {
		session,
		games: result.games,
		sortBy: result.sortBy,
		pagination: result.pagination
	};
};