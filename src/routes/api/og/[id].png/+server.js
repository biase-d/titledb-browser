import * as gameRepo from '$lib/repositories/gameRepository'
import { generateOgImage } from '$lib/server/og-generator'

/**
 * Format performance profile data for display
 * @param {Object} modeData
 * @returns {string|null}
 */
function formatPerf(modeData) {
	if (!modeData) return null

	// Filter out placeholder values
	const fps = modeData.target_fps
	const hasMeaningfulFps = fps && (typeof fps === 'number' || fps === 'Unlocked' || !isNaN(parseInt(fps, 10)))
	const hasMeaningfulRes = !!modeData.resolution_type

	if (!hasMeaningfulRes && !hasMeaningfulFps && !modeData.fps_behavior) return null

	let res = 'Unknown'
	if (modeData.resolution_type === 'Fixed') res = modeData.resolution || 'Fixed'
	else if (modeData.resolution_type === 'Dynamic') res = 'Dynamic'
	else if (modeData.resolution_type === 'Multiple Fixed') res = 'Multiple'

	const fpsText = hasMeaningfulFps ? `${fps} FPS` : (modeData.fps_behavior || 'Unknown')
	return `${res} • ${fpsText}`
}

/**
 * Format graphics settings for display
 * @param {Object} modeData
 * @returns {string|null}
 */
function formatGraphics(modeData) {
	if (!modeData) return null

	if (!modeData.resolution && !modeData.framerate) return null

	let res = modeData.resolution?.resolutionType || 'Unknown'
	if (res === 'Fixed' && modeData.resolution?.fixedResolution) res = modeData.resolution.fixedResolution

	// Filter out placeholder FPS values
	const targetFps = modeData.framerate?.targetFps
	const hasMeaningfulFps = targetFps && (typeof targetFps === 'number' || targetFps === 'Unlocked' || !isNaN(parseInt(targetFps, 10)))

	let fps = 'Unknown'
	if (hasMeaningfulFps) fps = `${targetFps} FPS`
	else if (modeData.framerate?.lockType && modeData.framerate.lockType !== 'Unknown') fps = modeData.framerate.lockType

	return `${res} • ${fps}`
}

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, locals }) {
	try {
		const gameId = params.id

		const data = await gameRepo.getGameWithPerformanceForOg(locals.db, gameId)
		if (!data) return new Response('Game not found', { status: 404 })

		const { game, performance: perf, graphics } = data

		let dockedText = 'No Data'
		let handheldText = 'No Data'

		if (perf?.profiles) {
			const d = formatPerf(perf.profiles.docked)
			const h = formatPerf(perf.profiles.handheld)
			if (d) dockedText = d
			if (h) handheldText = h
		}

		if (dockedText === 'No Data' && graphics?.settings?.docked) {
			const d = formatGraphics(graphics.settings.docked)
			if (d) dockedText = d
		}
		if (handheldText === 'No Data' && graphics?.settings?.handheld) {
			const h = formatGraphics(graphics.settings.handheld)
			if (h) handheldText = h
		}

		const ogResponse = await generateOgImage({
			title: game.names[0],
			publisher: game.publisher,
			bannerUrl: game.bannerUrl,
			dockedText,
			handheldText
		})

		const buffer = await ogResponse.arrayBuffer()

		return new Response(buffer, {
			headers: {
				'Content-Type': 'image/png',
				'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
			}
		})
	} catch (e) {
		console.error(`[OG Error] Failed for ${params.id}:`, e)
		return new Response('Image Generation Failed', { status: 500 })
	}
}
