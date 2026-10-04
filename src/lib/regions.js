const northAmerica = new Set(['US', 'CA', 'MX'])
const southAmerica = new Set(['BR', 'AR', 'CL', 'CO', 'PE', 'CR', 'GT', 'HN', 'NI', 'PA', 'PY', 'UY', 'EC', 'SV', 'BO', 'DO'])

const nordic = new Set(['SE', 'NO', 'DK', 'FI'])
const dach = new Set(['DE', 'AT', 'CH'])
const benelux = new Set(['BE', 'NL', 'LU'])
const iberia = new Set(['ES', 'PT'])
const britishIsles = new Set(['GB', 'IE'])

const oceania = new Set(['AU', 'NZ'])
const eastAsia = new Set(['HK', 'TW', 'KR', 'CN', 'MO', 'JP'])
const southeastAsia = new Set(['SG', 'TH', 'MY'])
const africa = new Set(['ZA'])

const americas = new Set([...northAmerica, ...southAmerica])
const europe = new Set(['GB', 'FR', 'DE', 'IT', 'ES', 'NL', 'PT', 'RU', 'AT', 'BE', 'BG', 'CH', 'CY', 'CZ', 'DK', 'EE', 'FI', 'GR', 'HR', 'HU', 'IE', 'IL', 'LT', 'LU', 'LV', 'MT', 'NO', 'PL', 'RO', 'SE', 'SI', 'SK'])

/**
 * Every country code this app groups or labels. The flag icon bundle is
 * generated from this list, so anything added here is bundled automatically
 * (see scripts/build-icons.js); codes outside it still resolve, just via
 * the Iconify API at runtime
 * @type {string[]}
 */
export const KNOWN_REGION_CODES = [...new Set([
	...americas, ...europe, ...nordic, ...dach, ...benelux, ...iberia,
	...britishIsles, ...oceania, ...eastAsia, ...southeastAsia, ...africa
])].sort()

/**
 * Maps country codes to human-readable
 * Prioritizes specific sub-regions and common cross-regional pairings
 *
 * @param {string[]} regions - Array of country codes (e.g. ['US', 'JP'])
 * @returns {string|null} - The formatted label or null if empty
 */
export function getRegionLabel (regions) {
	if (!regions || !Array.isArray(regions) || regions.length === 0) return null

	const set = new Set(regions)
	const count = set.size

	if (count === 1) {
		const code = regions[0]
		if (code === 'KR') return 'Korea'
		if (code === 'US') return 'USA'
		if (code === 'GB') return 'UK'
		if (code === 'HK') return 'Hong Kong'
		const name = new Intl.DisplayNames(['en'], { type: 'region' }).of(code)
		return name || code
	}

	const isStrict = (/** @type {Set<string>} */ targetSet) => regions.every(r => targetSet.has(r))

	if (isStrict(nordic)) return 'Nordic'
	if (isStrict(dach)) return 'Germany & Austria'
	if (isStrict(benelux)) return 'Benelux'
	if (isStrict(iberia)) return 'Iberia'
	if (isStrict(britishIsles)) return 'UK & Ireland'

	if (isStrict(northAmerica)) return 'North America'
	if (isStrict(southAmerica)) return 'South America'

	if (isStrict(oceania)) return 'Australia & New Zealand'

	if (isStrict(eastAsia)) {
		if (set.has('JP') && count > 1) return 'Japan & East Asia'
		if (!set.has('JP')) return 'East Asia'
	}
	if (isStrict(southeastAsia)) return 'Southeast Asia'

	if (isStrict(new Set([...eastAsia, ...southeastAsia]))) return 'Asia'
	if (isStrict(americas)) return 'The Americas'
	if (isStrict(europe)) return 'Europe'
	if (isStrict(africa)) return 'Africa'

	const hasNorthAmerica = regions.some(r => northAmerica.has(r))
	const hasEurope = regions.some(r => europe.has(r))
	const hasJapan = set.has('JP')
	const hasAsia = regions.some(r => eastAsia.has(r) && r !== 'JP')

	if (count === 2 && set.has('US') && set.has('JP')) return 'USA & Japan'
	if (isStrict(new Set([...northAmerica, 'JP']))) return 'North America & Japan'

	if (hasNorthAmerica && hasEurope && !hasJapan && !hasAsia) {
		return 'Western'
	}

	if (hasNorthAmerica && hasEurope && hasJapan) {
		return 'Major Regions'
	}

	if (isStrict(new Set([...europe, ...oceania]))) return 'Europe & Oceania'

	if (hasEurope && (hasJapan || hasAsia) && !hasNorthAmerica) {
		return 'Europe & Asia'
	}

	if (hasNorthAmerica && (hasJapan || hasAsia) && !hasEurope) {
		return 'Americas & Asia'
	}

	if (hasNorthAmerica && hasEurope) {
		return 'International'
	}

	if (count <= 3) return regions.join(', ')

	return 'Multi-Region'
}

/**
 * Compact forms of the labels that do not fit a badge
 *
 * The badges are narrow by design - they sit in the corner of a card, not in a
 * sentence - and the long labels were being cut to stubs like "MAJOR RE…",
 * "INTERNATI…" and "THE AMER…", which is worse than useless: those appear only
 * on multi-region titles, so the badge was unreadable in exactly the cases it
 * exists to explain. Callers keep the full label in a title attribute
 */
const SHORT_LABELS = {
	'Major Regions': 'Major',
	International: 'Intl.',
	'The Americas': 'Americas',
	'North America': 'N. America',
	'South America': 'S. America',
	'North America & Japan': 'NA & JP',
	'Americas & Asia': 'AM & Asia',
	'Australia & New Zealand': 'ANZ',
	'Japan & East Asia': 'JP & Asia',
	'Southeast Asia': 'SE Asia',
	'East Asia': 'E. Asia',
	'Europe & Oceania': 'EU & Oceania',
	'Europe & Asia': 'EU & Asia',
	'Germany & Austria': 'DE & AT',
	'UK & Ireland': 'UK & IE',
	'USA & Japan': 'US & JP'
}

/**
 * A label short enough for a badge. Falls back to the full one when it already
 * fits, so anything not listed above is unaffected
 * @param {string[]|null|undefined} regions
 * @returns {string|null}
 */
export function getRegionLabelShort (regions) {
	const label = getRegionLabel(regions)
	if (!label) return null
	return SHORT_LABELS[label] ?? label
}
