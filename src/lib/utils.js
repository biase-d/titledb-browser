import stringify from 'json-stable-stringify'

/**
 * Recursively clones and prunes an object, removing keys that have empty values
 * An empty value is considered to be: null, undefined, "", [], or {}
 * @param {any} value The value to prune
 * @returns {any} The pruned value, or undefined if the value itself is empty
 */
export function pruneEmptyValues (value) {
	if (typeof value !== 'object' || value === null) {
		return value === '' || value === null ? undefined : value
	}

	if (Array.isArray(value)) {
		const prunedArray = value
			.map(item => pruneEmptyValues(item))
			.filter(item => item !== undefined)
		return prunedArray.length > 0 ? prunedArray : undefined
	}

	const prunedObj = {}
	let keyCount = 0
	for (const key of Object.keys(value)) {
		const prunedValue = pruneEmptyValues(value[key])
		if (prunedValue !== undefined) {
			prunedObj[key] = prunedValue
			keyCount++
		}
	}

	return keyCount > 0 ? prunedObj : undefined
}

/**
 * Checks if a performance profile is effectively empty
 * @param {any} profile
 * @returns {boolean}
 */
export function isProfileEmpty (profile) {
	if (!profile || !profile.profiles) return true
	const { docked, handheld } = profile.profiles
	const isModeEmpty = (mode) => {
		if (!mode) return true
		return !(mode.resolution || mode.resolutions || mode.min_res || mode.max_res || mode.resolution_notes || mode.fps_notes || mode.target_fps)
	}
	return isModeEmpty(docked) && isModeEmpty(handheld)
}

/**
 * Checks if a graphics settings object is effectively empty
 * @param {any} graphics
 * @returns {boolean}
 */
export function isGraphicsEmpty (graphics) {
	if (!graphics || Object.keys(graphics).length === 0) return true
	const isModeDataEmpty = (modeData) => {
		if (!modeData) return true
		const res = modeData.resolution
		if (res && (res.fixedResolution || res.minResolution || res.maxResolution || res.multipleResolutions?.[0] || res.notes)) return false
		const fps = modeData.framerate
		if (fps && (fps.targetFps || fps.notes)) return false
		const custom = modeData.custom
		if (custom && Object.values(custom).some(c => c.value || c.notes)) return false
		return true
	}
	const shared = graphics.shared
	if (shared && Object.values(shared).some(s => s.value || s.notes)) return false
	return isModeDataEmpty(graphics.docked) && isModeDataEmpty(graphics.handheld)
}

/**
 * Generates a human-readable summary of changes between original and updated contribution data
 * @param {object} originals - The original data from the database
 * @param {object} updated - The new data submitted by the user
 * @returns {string[]} An array of strings describing the changes
 */
export function generateChangeSummary (originals, updated) {
	const summary = []
	const {
		originalPerformance = [],
		originalGraphics = {},
		originalYoutubeLinks = [],
		originalGroup = []
	} = originals
	const {
		performanceProfiles = [],
		graphicsData = {},
		youtubeLinks = [],
		updatedGroup = []
	} = updated

	// Performance Profile Changes
	const originalProfilesMap = new Map(originalPerformance.map(p => [p.gameVersion + (p.suffix || ''), p]))
	const newProfilesMap = new Map(performanceProfiles.map(p => [p.gameVersion + (p.suffix || ''), p]))

	for (const [key, newProfile] of newProfilesMap.entries()) {
		const originalProfile = originalProfilesMap.get(key)
		const newIsEmpty = isProfileEmpty(newProfile)
		if (!originalProfile) {
			summary.push(newIsEmpty ? `Added empty placeholder for performance v${newProfile.gameVersion}.` : `Added new performance data for v${newProfile.gameVersion}.`)
		} else {
			const originalIsEmpty = isProfileEmpty(originalProfile)
			const contentChanged = stringify(pruneEmptyValues(newProfile.profiles)) !== stringify(pruneEmptyValues(originalProfile.profiles))
			if (contentChanged) {
				if (newIsEmpty && !originalIsEmpty) summary.push(`Cleared performance data for v${newProfile.gameVersion}.`)
				else if (originalIsEmpty && !newIsEmpty) summary.push(`Added performance data to v${newProfile.gameVersion}.`)
				else if (!newIsEmpty && !originalIsEmpty) summary.push(`Updated performance data for v${newProfile.gameVersion}.`)
			}
		}
	}

	for (const [key, oldProfile] of originalProfilesMap.entries()) {
		if (!newProfilesMap.has(key)) {
			summary.push(`Removed performance profile for v${oldProfile.gameVersion}.`)
		}
	}

	// Graphics Settings Changes
	const prunedNewGraphics = pruneEmptyValues(graphicsData)
	const originalSettings = originalGraphics?.settings || {}

	const newGraphicsToCompare = { ...prunedNewGraphics }
	delete newGraphicsToCompare.contributor

	const originalSettingsToCompare = { ...originalSettings }
	delete originalSettingsToCompare.contributor

	const prunedNewGraphicsContent = pruneEmptyValues(newGraphicsToCompare)
	const prunedOriginalGraphicsContent = pruneEmptyValues(originalSettingsToCompare)

	const contentChanged = stringify(prunedNewGraphicsContent) !== stringify(prunedOriginalGraphicsContent)

	// A schema update is required if the contributor field in the file is a string, not an array.
	const needsSchemaUpdate = typeof originalSettings.contributor === 'string'

	if (contentChanged) {
		const newIsEmpty = isGraphicsEmpty(prunedNewGraphics)
		const originalIsEmpty = isGraphicsEmpty(prunedOriginalGraphicsContent)
		if (newIsEmpty && !originalIsEmpty) summary.push('Cleared graphics settings.')
		else if (!newIsEmpty && originalIsEmpty) summary.push('Added new graphics settings.')
		else if (!newIsEmpty && !originalIsEmpty) summary.push('Updated graphics settings.')
	} else if (needsSchemaUpdate) {
		// If the content is the same but the original file had a string contributor, it's a schema update.
		summary.push('Updated graphics data to the latest schema version.')
	}

	// YouTube Link Changes
	const normalizeLinks = (links) => links.filter(l => l.url && l.url.trim() !== '').map(l => ({ url: l.url, notes: l.notes || '' })).sort((a, b) => a.url.localeCompare(b.url))
	const normalizedNew = normalizeLinks(youtubeLinks)
	const normalizedOriginal = normalizeLinks(originalYoutubeLinks)
	if (stringify(normalizedNew) !== stringify(normalizedOriginal)) {
		summary.push('Updated YouTube links.')
	}

	// Grouping Changes
	const originalGroupIds = new Set(originalGroup.map(g => g.id))
	const updatedGroupIds = new Set(updatedGroup.map(g => g.id))
	if (!areSetsEqual(originalGroupIds, updatedGroupIds)) {
		summary.push('Adjusted regional game grouping.')
	}

	return summary
}

/**
 * A helper function to compare two sets for equality
 * @param {Set<any>} setA
 * @param {Set<any>} setB
 */
export function areSetsEqual (setA, setB) {
	if (setA.size !== setB.size) return false
	for (const item of setA) {
		if (!setB.has(item)) return false
	}
	return true
}
