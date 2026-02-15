import { json } from '@sveltejs/kit'
import * as statusService from '$lib/services/statusService'

/** @type {import('./$types').RequestHandler} */
export async function GET({ locals }) {
    const health = await statusService.getSystemHealth(locals.db)

    // Cache for 30 seconds
    return json(health, {
        headers: {
            'Cache-Control': 'public, max-age=30'
        }
    })
}
