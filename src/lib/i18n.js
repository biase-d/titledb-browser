/**
 * Selects the most appropriate name from a list based on the user's region preference.
 * Uses script detection (Regex) since the data source doesn't provide language tags.
 *
 * @param {string[]} names
 * @param {string} regionCode
 * @returns {string}
 */
export function getLocalizedName (names, regionCode) {
	if (!names || !Array.isArray(names) || names.length === 0) return 'Unknown Title'

	if (!regionCode || regionCode === 'US' || regionCode === 'GB' || regionCode === 'EU') {
		return names[0]
	}

	const R_KOREAN = /[\uAC00-\uD7AF\u1100-\u11FF]/
	const R_JAPANESE = /[\u3040-\u309F\u30A0-\u30FF]/
	const R_CHINESE = /[\u4E00-\u9FFF]/
	const R_CYRILLIC = /[\u0400-\u04FF]/

	if (regionCode === 'JP') {
		const match = names.find(n => R_JAPANESE.test(n))
		return match || names[0]
	}

	if (regionCode === 'KR') {
		const match = names.find(n => R_KOREAN.test(n))
		return match || names[0]
	}

	if (['HK', 'TW', 'CN', 'MO'].includes(regionCode)) {
		const match = names.find(n => R_CHINESE.test(n) && !R_JAPANESE.test(n))
		return match || names[0]
	}

	if (regionCode === 'RU') {
		const match = names.find(n => R_CYRILLIC.test(n))
		return match || names[0]
	}

	return names[0]
}
