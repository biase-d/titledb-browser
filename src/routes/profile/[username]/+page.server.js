import * as profileService from '$lib/services/profileService'

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, parent, url, locals }) => {
	const { session } = await parent()
	const { username } = params

	const page = parseInt(url.searchParams.get('page') || '1', 10)

	const result = await profileService.getUserContributions(locals.db, username, page)

	return {
		username,
		session,
		githubAvatarUrl: `https://github.com/${username}.png`,
		contributions: result.contributions,
		totalContributions: result.totalContributions,
		currentTierName: result.currentTierName,
		featuredGame: result.featuredGame,
		pagination: result.pagination
	}
}
