import { json } from '@sveltejs/kit'

/**
 * Shared by the favourites endpoints: who is asking, and the shapes they send
 * These are for the site's own pages and work from a signed-in session
 */

/** @param {any} locals @returns {Promise<string | null>} */
export async function userIdOf (locals) {
	const session = await locals.auth?.()
	return session?.user?.id ? String(session.user.id) : null
}

export const unauthorized = () => json({ error: 'Sign in with GitHub to do that.' }, { status: 401 })

/** A title ID, upper-cased, or null @param {unknown} value */
export function titleId (value) {
	const id = String(value ?? '').trim().toUpperCase()
	return /^[0-9A-F]{16}$/.test(id) ? id : null
}

/** The JSON body, or an empty object when there is none @param {Request} request */
export async function body (request) {
	try { return await request.json() } catch { return {} }
}
