import { json } from '@sveltejs/kit';
import * as preferencesService from '$lib/services/preferencesService';

/** @type {import('./$types').RequestHandler} */
export async function GET({ locals }) {
    const session = await locals.auth();
    if (!session?.user?.id) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const prefs = await preferencesService.getPreferences(locals.db, session.user.id);
        return json(prefs || {});
    } catch (e) {
        console.error('Error fetching preferences:', e);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
    const session = await locals.auth();
    if (!session?.user?.id) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const saved = await preferencesService.savePreferences(locals.db, session.user.id, body);
        return json(saved);
    } catch (e) {
        console.error('Error saving preferences:', e);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
