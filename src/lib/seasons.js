/**
 * The seasonal scenes: Halloween, autumn and winter (more can be added here)
 *
 * A scene is never switched on all at once. It is put up the way a person
 * would: it starts a few days before its month with a few pieces, and more are
 * added each day (and new kinds appear) until it is complete, then it stays up,
 * then it is taken down over a couple of days. Two scenes can overlap while one
 * is being taken down and the next put up
 *
 * A scene is a quiet layer: drifting particles behind the page and a tint on
 * the light that falls on the cartridges. It never replaces the visitor's own
 * accent colour or the theme engine's
 */

/**
 * @typedef {'halloween' | 'autumn' | 'winter'} SeasonName
 *
 * A date in the year, as month (0-11) and day. `year` is added to the year it
 * is read in, so a window can run into January
 * @typedef {{ month: number, day: number, year?: number }} MonthDay
 *
 * @typedef {Object} Season
 * @property {SeasonName} name
 * @property {string} label
 * @property {number} light - the colour of the light on the cartridges, 0xRRGGBB
 * @property {MonthDay} start - the first pieces go up
 * @property {MonthDay} full - everything is up
 * @property {MonthDay} end - it starts coming down
 * @property {number} fadeDays - how long coming down takes
 */

/** @type {Record<SeasonName, Season>} */
export const SEASONS = {
	halloween: {
		name: 'halloween',
		label: 'Halloween',
		light: 0xffa95a,
		start: { month: 8, day: 24 },
		full: { month: 9, day: 22 },
		end: { month: 10, day: 1 },
		fadeDays: 2
	},
	autumn: {
		name: 'autumn',
		label: 'Autumn',
		light: 0xffc88a,
		start: { month: 9, day: 29 },
		full: { month: 10, day: 12 },
		end: { month: 10, day: 29 },
		fadeDays: 3
	},
	winter: {
		name: 'winter',
		label: 'Winter',
		light: 0xcfe6ff,
		start: { month: 10, day: 25 },
		full: { month: 11, day: 15 },
		end: { month: 11, day: 31 },
		fadeDays: 3
	}
}

const DAY = 86_400_000

const smooth = (/** @type {number} */ t) => t * t * (3 - 2 * t)

/**
 * How much of a scene is up on a date: 0 (nothing) to 1 (all of it). Rises
 * smoothly through the build-up, holds, then falls through the take-down
 * @param {Season} season
 * @param {Date} date
 * @returns {number}
 */
export function intensityOn (season, date) {
	let best = 0
	// A scene that ran into this year's January started last year
	for (const year of [date.getFullYear() - 1, date.getFullYear()]) {
		const at = (/** @type {MonthDay} */ d) => new Date(year, d.month, d.day).getTime()
		const t = date.getTime()
		const start = at(season.start)
		const full = at(season.full)
		const end = at(season.end) + DAY // the end day itself is still up
		const gone = end + season.fadeDays * DAY

		let i = 0
		if (t >= start && t < full) i = smooth((t - start) / (full - start))
		else if (t >= full && t < end) i = 1
		else if (t >= end && t < gone) i = 1 - smooth((t - end) / (gone - end))
		best = Math.max(best, i)
	}
	return best
}

/**
 * @typedef {{ season: Season, intensity: number }} Scene
 */

/**
 * Every scene that is up on a date, fullest first. Usually none or one; two
 * while one is coming down and the next going up
 * @param {Date} [date]
 * @returns {Scene[]}
 */
export function scenesOn (date = new Date()) {
	return Object.values(SEASONS)
		.map(season => ({ season, intensity: intensityOn(season, date) }))
		.filter(scene => scene.intensity > 0.02)
		.sort((a, b) => b.intensity - a.intensity)
}

/**
 * A scene named in the address (?season=winter), for previewing one out of its
 * time, optionally part-built (&build=0.3). 'off' previews none. Anything else
 * is ignored
 * @param {URLSearchParams | null | undefined} params
 * @returns {Scene[] | undefined} undefined when the address names nothing
 */
export function scenesFromParams (params) {
	const value = params?.get('season')
	if (value === 'off') return []
	if (!value || !Object.hasOwn(SEASONS, value)) return undefined
	const build = Number(params?.get('build') ?? 1)
	const intensity = Number.isFinite(build) ? Math.min(1, Math.max(0.05, build)) : 1
	return [{ season: SEASONS[/** @type {SeasonName} */ (value)], intensity }]
}

/**
 * The scenes to show now: one named in the address wins (for previews), then the
 * visitor's setting, then the calendar
 * @param {'auto' | 'off'} preference
 * @param {URLSearchParams | null | undefined} params
 * @param {Date} [date]
 * @returns {Scene[]}
 */
export function activeScenes (preference, params, date = new Date()) {
	const forced = scenesFromParams(params)
	if (forced !== undefined) return forced
	return preference === 'off' ? [] : scenesOn(date)
}

/**
 * The colour of the light on the cartridges: white, leaning toward the fullest
 * scene's colour as much as that scene is up
 * @param {Scene[]} scenes
 * @returns {number} 0xRRGGBB
 */
export function lightFor (scenes) {
	const top = scenes[0]
	if (!top) return 0xffffff
	const k = top.intensity * 0.9
	const mix = (/** @type {number} */ shift) => Math.round(255 + (((top.season.light >> shift) & 255) - 255) * k)
	return (mix(16) << 16) | (mix(8) << 8) | mix(0)
}
