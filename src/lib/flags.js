/**
 * Converts a 2-letter country code to an Iconify icon name
 * We use the 'circle-flags' set for consistent, round flag icons
 * @param {string} countryCode
 * @returns {string}
 */
export function getFlagIcon (countryCode) {
	if (!countryCode) {
		return 'mdi:earth'
	}

	const code = countryCode.toLowerCase()

	return `circle-flags:${code}`
}

/**
 * Gets the full country name from a code
 * @param {string} code
 * @returns {string}
 */
export function getCountryName (code) {
	try {
		return new Intl.DisplayNames(['en'], { type: 'region' }).of(code)
	} catch (e) {
		return code
	}
}
