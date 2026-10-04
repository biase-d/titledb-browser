/**
 * Present a graphics record in the shape the list and card components read
 * Shared by the library cards and the title page, and tested: the lockType/targetFps precedence here is easy to get
 * backwards and the failure is silent - a wrong number, not an error
 */
export function mapGraphicsToPerformance (graphics) {
	if (!graphics) return null
	const mapMode = (gMode) => {
		if (!gMode) return {}
		const res = gMode.resolution || {}
		const fps = gMode.framerate || {}
		return {
			resolution_type: res.resolutionType,
			resolution: res.fixedResolution,
			min_res: res.minResolution,
			max_res: res.maxResolution,
			resolutions: res.multipleResolutions?.join(', '),
			// lockType wins: a record switched to Unlocked can still carry the
			// targetFps that was set before, and reading that first reports the
			// stale number as the target
			target_fps: fps.lockType === 'Unlocked' ? 'Unlocked' : (fps.targetFps || null),
			fps_behavior: fps.lockType === 'API' ? 'Locked' : 'Stable'
		}
	}
	return { docked: mapMode(graphics.docked), handheld: mapMode(graphics.handheld) }
}

/**
 * Whether a performance-shaped object carries a frame rate or a resolution
 * @param {any} mode
 */
function modeHasValues (mode) {
	return !!(mode?.target_fps || mode?.resolution_type || mode?.resolution || mode?.min_res || mode?.max_res || mode?.resolutions)
}

/**
 * What the title page shows as performance when no measured profile exists:
 * the targets recorded in the game's graphics settings. Those are what the
 * game is set to do, not a measurement, so the stability rating the mapping
 * guesses ("Stable") is dropped rather than shown as if someone had tested it
 *
 * @param {any} settings - a graphics_settings.settings object
 * @returns {{ docked: any, handheld: any } | null} null when there is nothing to show
 */
export function graphicsAsTargets (settings) {
	const mapped = mapGraphicsToPerformance(settings)
	if (!mapped) return null
	const strip = (/** @type {any} */ mode) => modeHasValues(mode) ? { ...mode, fps_behavior: undefined } : null
	const docked = strip(mapped.docked)
	const handheld = strip(mapped.handheld)
	return docked || handheld ? { docked, handheld } : null
}
