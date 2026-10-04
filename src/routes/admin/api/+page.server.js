import { error } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'
import { RETAIN_DAYS, topUsers } from '$lib/server/apiUsage'

/** The GitHub logins allowed in, from ADMIN_LOGINS (comma separated). Nobody if it is not set */
const admins = () => (env.ADMIN_LOGINS ?? '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean)

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals, url }) => {
	const session = await locals.auth?.()
	const login = String(session?.user?.login ?? '').toLowerCase()
	// A page that does not exist for anyone else, rather than one that refuses them
	if (!login || !admins().includes(login)) throw error(404, 'Not found')

	const days = [1, 7, 30].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 7
	const users = await topUsers(locals.db, days)
	return { days, users, retainDays: RETAIN_DAYS }
}
