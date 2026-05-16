import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import * as pipelineService from '$lib/services/pipelineService.js';

export async function POST({ request, locals }) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const secret = (env.PIPELINE_SECRET || process.env.PIPELINE_SECRET || '').trim();

    if (!secret) {
        console.error('PIPELINE_SECRET is not configured on the server.');
        return json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (token !== secret) {
        console.warn(`Unauthorized pipeline attempt. Expected secret length: ${secret.length}, received token length: ${token.length}`);
        return json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await request.json().catch(() => ({}));
        if (body.isFullRebuild) {
            process.env.PIPELINE_FULL_REBUILD = 'true';
        } else {
            process.env.PIPELINE_FULL_REBUILD = 'false';
        }

        await pipelineService.runPipeline(locals.db);
        return json({ success: true });
    } catch (e) {
        console.error(e);
        return json({ error: 'Pipeline failed' }, { status: 500 });
    }
}
