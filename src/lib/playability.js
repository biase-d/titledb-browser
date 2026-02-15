/**
 * @typedef {Object} PlayabilityScore
 * @property {string} score - 'Perfect', 'Great', 'Playable', 'Rough'
 * @property {string} label - Display label
 * @property {string} color - Color class/value (e.g., 'text-green-500')
 * @property {string} description - Brief explanation why
 */

/**
 * Calculate the playability score based on performance profile
 * @param {Object} profile - A single profile object (e.g. from performance_profiles.profiles array)
 * @returns {PlayabilityScore}
 */
export function calculatePlayabilityScore (profile) {
	if (!profile) return { score: 'Unknown', label: 'Unknown', color: 'text-gray-500', description: 'No data available' }

	const { docked, handheld } = profile

	// Prioritize docked, fallback to handheld
	const targetFps = docked?.target_fps || handheld?.target_fps
	const fpsBehavior = docked?.fps_behavior || handheld?.fps_behavior || 'Stable'

	// Handle Unlocked FPS (usually considered Great or Perfect depending on the game,
	// but for our purposes we'll treat it as a high performance target if behavior is stable)
	const isHighPerformance = targetFps === 60 || targetFps === 'Unlocked'

	// Check for "Perfect"
	// Criteria: 60FPS (or Unlocked) AND Locked behavior
	if (isHighPerformance && fpsBehavior === 'Locked') {
		return {
			score: 'Perfect',
			label: 'Perfect',
			color: 'text-green-400',
			description: 'Runs at a locked high framerate.'
		}
	}

	// Check for "Great"
	// Criteria: Locked 30FPS OR Stable 60FPS/Unlocked
	if ((targetFps === 30 && fpsBehavior === 'Locked') || (isHighPerformance && fpsBehavior === 'Stable')) {
		return {
			score: 'Great',
			label: 'Great',
			color: 'text-blue-400',
			description: 'Solid performance. Either locked 30FPS or mostly stable high framerate.'
		}
	}

	// Check for "Playable"
	// Criteria: Stable 30FPS OR Unstable but generally okay (if >= 30 FPS)
	const isAtLeast30 = targetFps >= 30 || targetFps === 'Unlocked'
	if ((targetFps === 30 && fpsBehavior === 'Stable') || (isAtLeast30 && fpsBehavior === 'Unstable')) {
		return {
			score: 'Playable',
			label: 'Playable',
			color: 'text-yellow-400',
			description: 'Playable, but may experience frame drops.'
		}
	}

	// Default to "Rough" for Very Unstable or no framerate targets
	return {
		score: 'Rough',
		label: 'Rough',
		color: 'text-red-400',
		description: 'Performance issues, potential crashes, or very low framerate.'
	}
}
