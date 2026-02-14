import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import * as requestRepo from '$lib/repositories/requestRepository';

/** @type {import('./$types').RequestHandler} */
export const GET = async ({ request, locals }) => {
    const authHeader = request.headers.get('authorization');
    const cronSecret = env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        throw error(401, 'Unauthorized');
    }

    try {
        const requests = await requestRepo.getAllDataRequests(locals.db);
        return json(requests);
    } catch (err) {
        console.error('Backup failed:', err);
        throw error(500, 'Database error');
    }
};