/**
 * The 'circle-flags' set mixes country flags with language flags in a single flat
 * namespace, so a few two-letter names are claimed by an ISO 639 language instead
 * of the ISO 3166-1 country that shares the code, and the country flag is absent
 * from the set altogether:
 *
 *   ar -> Arabic      (not Argentina)
 *   ie -> Interlingue (not Ireland)
 *   io -> Ido         (not British Indian Ocean Territory)
 *   la -> Latin       (not Laos)
 *
 * For those we fall back to 'flag' (flag-icons), which is keyed strictly by
 * ISO 3166-1 alpha-2. Its art is square, so those icons get clipped to a circle
 * in CountryFlag.svelte to match the rest
 */
const LANGUAGE_CODE_COLLISIONS = new Set(['AR', 'IE', 'IO', 'LA'])

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

	if (LANGUAGE_CODE_COLLISIONS.has(code.toUpperCase())) {
		return `flag:${code}-1x1`
	}

	return `circle-flags:${code}`
}

/**
 * Whether getFlagIcon returned an icon with square art that needs clipping
 * @param {string} countryCode
 * @returns {boolean}
 */
export function isSquareFlagIcon (countryCode) {
	if (!countryCode) return false
	return LANGUAGE_CODE_COLLISIONS.has(countryCode.toUpperCase())
}

/**
 * Gets the full country name from a code
 * @param {string} code
 * @returns {string}
 */
export function getCountryName (code) {
	try {
		return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code
	} catch (e) {
		return code
	}
}
