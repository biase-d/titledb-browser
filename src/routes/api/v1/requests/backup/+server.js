import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { dataRequests } from '$lib/db/schema';
import { CRON_SECRET } from '$env/static/private';

export const GET = async ({ request }) => {
    const authHeader = request.headers.get('authorization');
    
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
        throw error(401, 'Unauthorized');
    }

    try {
        const requests = await db.select().from(dataRequests);
        return json(requests);
    } catch (err) {
        console.error('Backup failed:', err);
        throw error(500, 'Database error');
    }
};