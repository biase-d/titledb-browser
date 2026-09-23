import { json } from '@sveltejs/kit'
import * as statusService from '$lib/services/statusService'

/** @type {import('./$types').RequestHandler} */
export async function GET ({ locals, url }) {
    const health = await statusService.getSystemHealth(locals.db)

    // Uptime monitors treat a non-2xx as the alert condition, so `?strict=1`
    // makes the HTTP status carry the verdict. Off by default: dashboards that
    // poll this endpoint expect 200 and read the body themselves
    const strict = url.searchParams.get('strict') === '1'
    const status = strict && health.status === 'down' ? 503 : 200

    return json(health, {
        status,
        headers: {
            // Cache for 30 seconds
            'Cache-Control': 'public, max-age=30'
        }
    })
}
