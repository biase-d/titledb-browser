import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import * as gameRepo from '$lib/repositories/gameRepository';

/**
 * @file GitHub Webhook Handler
 * @description Internal API to handle GitHub PR merge events and update DB status
 * 
 * Target: /api/v1/internal/github/webhook
 */

export async function POST({ request, locals }) {
    // 1. Basic security check
    // In a prod environment, we would use GitHub signature verification
    const apiKey = request.headers.get('x-github-token');
    if (!apiKey || apiKey !== env.INTERNAL_WEBHOOK_SECRET) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();

    // We only care about merged PRs
    if (payload.action === 'closed' && payload.pull_request?.merged) {
        const prNumber = payload.pull_request.number;

        try {
            await gameRepo.approveContribution(locals.db, prNumber);
            return json({ success: true, message: `Contribution PR #${prNumber} approved and live.` });
        } catch (err) {
            console.error('Webhook error:', err);
            return json({ error: 'Failed to update database' }, { status: 500 });
        }
    }

    return json({ message: 'Event ignored' });
}
