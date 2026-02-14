import { json } from '@sveltejs/kit';
import { getDatabase } from '$lib/database/context';
import { getStorage } from '$lib/storage/context';
import { checkHealth } from '$lib/services/healthService';

/** @type {import('./$types').RequestHandler} */
export const GET = async ({ locals, platform }) => {
    // In strict environments, we might want to dependency inject via locals, 
    // but the context helpers handle lazy loading correctly from locals.
    const db = getDatabase(locals);
    const storage = getStorage(locals);

    // Pass platform context
    const currentPlatform = platform || locals.platform;

    try {
        const health = await checkHealth(db, storage, currentPlatform);

        // Return 200 even if degraded, 503 if completely down? 
        // 200 is safer for monitoring dashboards unless critical.
        // We'll return 200 with status field.
        return json(health);
    } catch (err) {
        console.error('Health check failed:', err);
        return json({
            status: 'error',
            error: err.message,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
};
