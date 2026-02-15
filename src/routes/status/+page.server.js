import * as statusService from '$lib/services/statusService'

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
    const health = await statusService.getSystemHealth(locals.db)
    return { health }
}
