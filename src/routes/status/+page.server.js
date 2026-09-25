import * as statusService from '$lib/services/statusService'
import { getStorage } from '$lib/storage/context'

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
    const health = await statusService.getSystemHealth(locals.db, getStorage(locals))
    return { health }
}
