import { loadGamesPage } from '$lib/server/gamesPageLoad'

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ url, parent, cookies, locals }) => {
	const { session } = await parent()
	return loadGamesPage({ url, cookies, locals, session }, 'switch')
}
