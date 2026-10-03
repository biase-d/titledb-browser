/**
 * The seasonal scenes. October is Halloween, November autumn, December winter;
 * the rest of the year has none (more can be added here)
 *
 * A scene is a quiet layer: drifting particles over the page and a tint on the
 * light that falls on the cartridges. It never replaces the visitor's own
 * accent colour or the theme engine's
 */

/**
 * @typedef {'halloween' | 'autumn' | 'winter'} SeasonName
 * @typedef {Object} Season
 * @property {SeasonName} name
 * @property {string} label
 * @property {number} light - the colour of the light on the cartridges, 0xRRGGBB
 */

/** @type {Record<SeasonName, Season>} */
export const SEASONS = {
	halloween: { name: 'halloween', label: 'Halloween', light: 0xffa95a },
	autumn: { name: 'autumn', label: 'Autumn', light: 0xffc88a },
	winter: { name: 'winter', label: 'Winter', light: 0xcfe6ff }
}

/**
 * The scene for a date, by calendar month
 * @param {Date} [date]
 * @returns {Season | null}
 */
export function seasonFor (date = new Date()) {
	switch (date.getMonth()) {
		case 9: return SEASONS.halloween
		case 10: return SEASONS.autumn
		case 11: return SEASONS.winter
		default: return null
	}
}

/**
 * A scene named in the address (?season=winter), for previewing one out of its
 * month. 'off' previews none. Anything else is ignored
 * @param {string | null | undefined} value
 * @returns {Season | null | undefined} undefined when the value names nothing
 */
export function seasonFromParam (value) {
	if (value === 'off') return null
	return value && Object.hasOwn(SEASONS, value) ? SEASONS[/** @type {SeasonName} */ (value)] : undefined
}

/**
 * The scene to show now: one named in the address wins (for previews), then the
 * visitor's setting, then the calendar
 * @param {'auto' | 'off'} preference
 * @param {URLSearchParams | null | undefined} params
 * @param {Date} [date]
 * @returns {Season | null}
 */
export function activeSeason (preference, params, date = new Date()) {
	const forced = seasonFromParam(params?.get('season'))
	if (forced !== undefined) return forced
	return preference === 'off' ? null : seasonFor(date)
}
