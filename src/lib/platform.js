/**
 * Which console a title is for
 *
 * Switch titles have IDs starting 01 (and 0100 for applications); Switch 2 titles
 * start 04, which is how titledb files them (its output2 folder). The rule needs
 * no column: a title's platform is read from its ID, here and in SQL, so nothing
 * has to be migrated and a title cannot disagree with itself
 */

/** @typedef {'switch' | 'switch2'} Platform */

/** @param {string | null | undefined} titleId */
export function isSwitch2Id (titleId) {
	return /^04/i.test(titleId ?? '')
}

/** @param {string | null | undefined} titleId @returns {Platform} */
export function platformOf (titleId) {
	return isSwitch2Id(titleId) ? 'switch2' : 'switch'
}

/** A value from an address or a prop, made into a platform; anything else is the first Switch @param {unknown} value @returns {Platform} */
export function asPlatform (value) {
	return value === 'switch2' ? 'switch2' : 'switch'
}

/** The SQL fragment that keeps only one platform's titles, for a column of title IDs. Built from the two fixed values, never from input @param {Platform} platform @param {string} column */
export function platformClause (platform, column) {
	return platform === 'switch2' ? `${column} LIKE '04%'` : `${column} NOT LIKE '04%'`
}

export const PLATFORM_LABEL = { switch: 'Switch', switch2: 'Switch 2' }

/** The platform a search covers: one console, or both when it is 'all' @param {unknown} value @returns {Platform | 'all'} */
export function asSearchPlatform (value) {
	return value === 'all' ? 'all' : asPlatform(value)
}
