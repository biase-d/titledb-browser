import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { dataRequests } from '$lib/db/schema';
import { and, eq } from 'drizzle-orm';

export const POST = async ({ request, locals }) => {
    const session = await locals.auth();
    
    if (!session?.user?.id) {
        throw error(401, 'You must be signed in to request data.');
    }

    const { gameId } = await request.json();
    if (!gameId) {
        throw error(400, 'Game ID is required.');
    }

    const userId = session.user.id;

    try {
        // Check if request exists
        const existing = await db.select()
            .from(dataRequests)
            .where(and(eq(dataRequests.gameId, gameId), eq(dataRequests.userId, userId)))
            .limit(1);

        if (existing.length > 0) {
            // Remove vote (Toggle off)
            await db.delete(dataRequests)
                .where(and(eq(dataRequests.gameId, gameId), eq(dataRequests.userId, userId)));
            return json({ requested: false });
        } else {
            // Add vote (Toggle on)
            await db.insert(dataRequests).values({
                gameId,
                userId
            });
            return json({ requested: true });
        }
    } catch (err) {
        console.error('Error toggling request:', err);
        throw error(500, 'Failed to update request.');
    }
};