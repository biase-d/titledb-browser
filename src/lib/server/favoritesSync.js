import * as repo from '$lib/repositories/favoritesRepository'

const COOKIE = 'favorites'
const MERGED = 'fav_sync'
const YEAR = 60 * 60 * 24 * 365

/** The IDs in the favourites cookie @param {string | undefined} raw */
function parse (raw) {
	try {
		const value = JSON.parse(raw ?? '[]')
		return Array.isArray(value) ? value.filter(v => typeof v === 'string') : []
	} catch {
		return []
	}
}

/**
 * Keeps a signed-in person's favourites on their account, so they follow them to
 * another device, and the favourites cookie (which the pages read) in step
 *
 * The first time someone signs in on a browser, what they had favourited before
 * signing in is added to their account, so nothing is lost. From then on the
 * account is the truth, and the cookie is rewritten from it, so a favourite
 * removed on one device is not brought back by another's old cookie
 *
 * @param {{ db: any, cookies: import('@sveltejs/kit').Cookies, userId: string }} args
 * @returns {Promise<string[]>} the person's favourites
 */
export async function syncFavorites ({ db, cookies, userId }) {
	if (cookies.get(MERGED) !== userId) {
		await repo.addFavorites(db, userId, parse(cookies.get(COOKIE)))
		cookies.set(MERGED, userId, { path: '/', maxAge: YEAR, httpOnly: true, sameSite: 'lax' })
	}

	const ids = await repo.getUserFavorites(db, userId)
	// Readable by the page's script, which keeps it in step as stars are pressed
	cookies.set(COOKIE, JSON.stringify(ids), { path: '/', maxAge: YEAR, httpOnly: false, sameSite: 'lax' })
	return ids
}
