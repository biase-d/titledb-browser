import { html } from 'satori-html';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { promises as fs } from 'fs';
import { db } from '$lib/db';
import { games, performanceProfiles, graphicsSettings } from '$lib/db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * Format performance text for display from a Performance Profile
 * @param {any} modeData
 */
function formatPerf(modeData) {
	if (!modeData) return 'N/A';
	const getVerticalRes = (res) => (res ? res.trim().split('x')[1] || '?' : '?');
	
	let resText = 'N/A';
	if (modeData.resolution_type === 'Fixed' && modeData.resolution) {
		resText = `Fixed ${getVerticalRes(modeData.resolution)}p`;
	} else if (modeData.resolution_type === 'Dynamic' && modeData.min_res) {
		resText = `Dynamic ${getVerticalRes(modeData.min_res)}p ~ ${getVerticalRes(modeData.max_res)}p`;
	} else if (modeData.resolution_type === 'Multiple Fixed' && modeData.resolutions) {
		resText = `Multiple Resolutions`;
	}

	const fpsText = modeData.target_fps ? `${modeData.target_fps} FPS` : 'N/A';
	return `${resText} / ${fpsText}`;
}

/**
 * Format performance text for display from Graphics Settings
 * @param {any} modeData
 */
function formatGraphics(modeData) {
	if (!modeData) return 'N/A';

	let resText = 'N/A';
	if (modeData.resolution) {
		const res = modeData.resolution;
		if (res.resolutionType === 'Fixed' && res.fixedResolution) {
			resText = res.fixedResolution;
		} else if (res.resolutionType === 'Dynamic' && res.minResolution) {
			resText = `${res.minResolution} ~ ${res.maxResolution}`;
		} else if (res.resolutionType === 'Multiple Fixed' && res.multipleResolutions?.length > 0 && res.multipleResolutions[0]) {
			resText = 'Multiple';
		}
	}

	let fpsText = 'N/A';
	if (modeData.framerate && modeData.framerate.lockType !== 'Unlocked') {
		if (modeData.framerate.targetFps) {
			fpsText = `${modeData.framerate.targetFps} FPS`
		}
	} else {
		fpsText = 'Unlocked FPS'
	}

	if (resText === 'N/A' && fpsText === 'N/A') return 'N/A';
	return `${resText} / ${fpsText}`;
}

// Helpers to check for actual data to display
function perfModeHasData(modeData) {
    if (!modeData) return false;
    return !!(modeData.target_fps || modeData.resolution || modeData.min_res || modeData.max_res || (modeData.resolutions && modeData.resolutions.split(',').filter(Boolean).length > 0));
}

function graphicsModeHasData(modeData) {
    if (!modeData) return false;
    const hasRes = modeData.resolution && (modeData.resolution.fixedResolution || modeData.resolution.minResolution || (modeData.resolution.multipleResolutions && modeData.resolution.multipleResolutions[0]));
    const hasFps = modeData.framerate && modeData.framerate.targetFps;
    return !!(hasRes || hasFps);
}

const fontRegular = await fetch('https://og-playground.vercel.app/inter-latin-ext-400-normal.woff');
const fontBold = await fetch('https://og-playground.vercel.app/inter-latin-ext-700-normal.woff');

/** @type {import('./$types').RequestHandler} */
export async function GET({ params }) {
	const gameId = params.id;

	// Read font files as buffers
	const fontFile = await fontRegular.arrayBuffer()
	const fontBoldFile = await fontBold.arrayBuffer()

	// Fetch game
	const game = await db.query.games.findFirst({ where: eq(games.id, gameId) });
	if (!game) {
		return new Response('Game not found', { status: 404 });
	}
	const groupId = game.groupId;

	// Fetch both performance and graphics data
	const perf = await db.query.performanceProfiles.findFirst({
		where: eq(performanceProfiles.groupId, groupId),
		orderBy: (profiles) => [desc(profiles.lastUpdated)]
	});
	const graphics = await db.query.graphicsSettings.findFirst({
		where: eq(graphicsSettings.groupId, groupId)
	});

	// Check for the existence of records for the badges
	const hasPerformanceRecord = !!perf;
	const hasGraphicsRecord = !!graphics;

	// Determine the display strings with fallback logic
	let dockedPerf;
	if (perfModeHasData(perf?.profiles?.docked)) {
		dockedPerf = formatPerf(perf.profiles.docked);
	} else if (graphicsModeHasData(graphics?.settings?.docked)) {
		dockedPerf = formatGraphics(graphics.settings.docked);
	} else {
		dockedPerf = 'No data available';
	}

	let handheldPerf;
	if (perfModeHasData(perf?.profiles?.handheld)) {
		handheldPerf = formatPerf(perf.profiles.handheld);
	} else if (graphicsModeHasData(graphics?.settings?.handheld)) {
		handheldPerf = formatGraphics(graphics.settings.handheld);
	} else {
		handheldPerf = 'No data available';
	}
	
	const template = html(`
    <div style="display: flex; position: relative; width: 1200px; height: 630px; background-color: #1a1a1a; color: white; font-family: 'Inter';">
      <img src="${game.bannerUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;" />
      
      <div style="display: flex; flex-direction: column; justify-content: flex-end; position: absolute; top: 0; left: 0; width: 100%; height: 100%; padding: 60px; background: linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.2));">
          
        <div style="font-size: 64px; font-weight: 700; text-shadow: 2px 2px 8px rgba(0,0,0,0.7);">${game.names[0]}</div>
          
        <div style="display: flex; margin-top: 40px; gap: 40px; font-size: 32px;">
            <div style="display: flex; flex-direction: column;">
              <span style="font-size: 24px; opacity: 0.8;">Docked</span>
              <span style="font-weight: 700;">${dockedPerf}</span>
            </div>
            <div style="display: flex; flex-direction: column;">
              <span style="font-size: 24px; opacity: 0.8;">Handheld</span>
              <span style="font-weight: 700;">${handheldPerf}</span>
            </div>
        </div>

        <div style="position: absolute; top: 60px; right: 60px; font-size: 28px; font-weight: 700; opacity: 0.9;">
          Titledb Browser - Work in Progress
        </div>
      </div>
    </div>
  `);

	// Render SVG
	const svg = await satori(template, {
		width: 1200,
		height: 630,
		fonts: [
			{ name: 'Inter', data: fontFile, weight: 400, style: 'normal' },
			{ name: 'Inter', data: fontBoldFile, weight: 700, style: 'normal' }
		]
	});

	// Convert to PNG
	const resvg = new Resvg(svg);
	const pngData = resvg.render();
	const pngBuffer = pngData.asPng();

	// Return binary PNG
	return new Response(pngBuffer, {
		headers: {
			'Content-Type': 'image/png',
			'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
		}
	});
}