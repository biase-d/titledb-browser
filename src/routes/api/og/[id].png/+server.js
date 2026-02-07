import { games, performanceProfiles, graphicsSettings } from '$lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { generateOgImage } from '$lib/server/og-generator';

function formatPerf(modeData) {
    if (!modeData) return null;

    if (!modeData.resolution_type && !modeData.target_fps && !modeData.fps_behavior) return null;

    let res = 'Unknown';
    if (modeData.resolution_type === 'Fixed') res = modeData.resolution || 'Fixed';
    else if (modeData.resolution_type === 'Dynamic') res = 'Dynamic';
    else if (modeData.resolution_type === 'Multiple Fixed') res = 'Multiple';

    const fps = modeData.target_fps ? `${modeData.target_fps} FPS` : (modeData.fps_behavior || 'Unknown');
    return `${res} • ${fps}`;
}

function formatGraphics(modeData) {
    if (!modeData) return null;

    if (!modeData.resolution && !modeData.framerate) return null;

    let res = modeData.resolution?.resolutionType || 'Unknown';
    if (res === 'Fixed' && modeData.resolution?.fixedResolution) res = modeData.resolution.fixedResolution;

    let fps = 'Unknown';
    if (modeData.framerate?.targetFps) fps = `${modeData.framerate.targetFps} FPS`;
    else if (modeData.framerate?.lockType) fps = modeData.framerate.lockType;

    return `${res} • ${fps}`;
}

export async function GET({ params, locals }) {
    try {
        const gameId = params.id;
        const db = locals.db;

        const game = await db.query.games.findFirst({ where: eq(games.id, gameId) });
        if (!game) return new Response('Game not found', { status: 404 });

        const groupId = game.groupId;
        const [perf, graphics] = await Promise.all([
            db.query.performanceProfiles.findFirst({
                where: eq(performanceProfiles.groupId, groupId),
                orderBy: (profiles) => [desc(profiles.lastUpdated)]
            }),
            db.query.graphicsSettings.findFirst({
                where: eq(graphicsSettings.groupId, groupId)
            })
        ]);

        let dockedText = 'No Data';
        let handheldText = 'No Data';

        if (perf?.profiles) {
            const d = formatPerf(perf.profiles.docked);
            const h = formatPerf(perf.profiles.handheld);
            if (d) dockedText = d;
            if (h) handheldText = h;
        }

        if (dockedText === 'No Data' && graphics?.settings?.docked) {
            const d = formatGraphics(graphics.settings.docked);
            if (d) dockedText = d;
        }
        if (handheldText === 'No Data' && graphics?.settings?.handheld) {
            const h = formatGraphics(graphics.settings.handheld);
            if (h) handheldText = h;
        }

        const ogResponse = await generateOgImage({
            title: game.names[0],
            publisher: game.publisher,
            bannerUrl: game.bannerUrl,
            dockedText,
            handheldText
        });

        const buffer = await ogResponse.arrayBuffer();

        return new Response(buffer, {
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
            }
        });

    } catch (e) {
        console.error(`[OG Error] Failed for ${params.id}:`, e);
        return new Response('Image Generation Failed', { status: 500 });
    }
}
