import { json, error } from '@sveltejs/kit';
import { CRON_SECRET } from '$env/static/private';
import * as requestRepo from '$lib/repositories/requestRepository';

export const GET = async ({ request, locals }) => {
    const authHeader = request.headers.get('authorization');

    if (authHeader !== `Bearer ${CRON_SECRET}`) {
        throw error(401, 'Unauthorized');
    }

    try {
        const db = locals.db;
        // We'll need to export a getAllRequests function from requestRepository if it doesn't exist,
        // or just use db.select().from(dataRequests) via the repository if we want to be strict.
        // For now, let's assume we can use the repository or direct DB via locals for this admin task.
        // Since requestRepository currently has specific user functions, I'll add getAllRequests to it later
        // or just access the table via the repository export if I exported the schema there?
        // Actually, let's keep it simple and safe: use locals.db but standard query here since it's a backup script.
        // BUT better to use repository pattern. Let's add getAllRequests to repository first or just use direct db access via locals for now to be safe.
        // I'll stick to direct locals.db access here as it's a maintenance script, not core business logic.
        // Actually, waiting... I can't import schema here if I want to be purely decoupled?
        // Yes I can, schema is part of the data layer.

        // Wait, I submitted the code with locals.db logic.
        // Re-reading my decision: "I'll switch to locals.db or requestRepository".
        // Let's use locals.db and schema for now to avoid breaking if repository doesn't have getAll.

        const { dataRequests } = await import('$lib/db/schema');
        const requests = await db.select().from(dataRequests);
        return json(requests);
    } catch (err) {
        console.error('Backup failed:', err);
        throw error(500, 'Database error');
    }
};