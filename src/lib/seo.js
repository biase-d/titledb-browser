/**
 * Decisions about what search engines should be told about a title page.
 * Kept in one place so the page, its canonical link and the sitemap cannot
 * drift apart: a sitemap that lists a URL the page itself marks noindex, or
 * names a different canonical, is a contradiction Google resolves its own way
 */

/**
 * The one URL that stands for a game in search. Chosen from the titles that
 * really share a group, never from titles that merely share a name: those can
 * differ from page to page, which gave one game two competing canonicals
 *
 * Prefers the US release, then the lowest ID. The sitemap query applies the
 * same ordering
 *
 * @param {Array<{ id: string, groupId?: string, regions?: string[] | null }>} titles
 * @param {string} groupId - the group of the title being viewed
 * @param {string} fallbackId - returned when the group has no other titles
 * @returns {string}
 */
export function pickCanonicalTitleId (titles, groupId, fallbackId) {
	const members = titles.filter(t => t.groupId === groupId)
	if (members.length <= 1) return fallbackId
	const us = members.filter(t => t.regions?.includes('US')).map(t => t.id).sort()
	return us[0] ?? members.map(t => t.id).sort()[0]
}

/**
 * Whether a profile says anything about how the game runs. The synced data
 * contains placeholder profiles that hold only a contributor name
 * @param {any} profiles
 * @returns {boolean}
 */
function profileHasValues (profiles) {
	return ['docked', 'handheld'].some(mode =>
		profiles?.[mode]?.target_fps != null || profiles?.[mode]?.resolution_type != null
	)
}

/**
 * Whether a page has something to index beyond the artwork and name that every
 * title has. Pages without it are near-identical boilerplate, and thousands of
 * those are what get a site labelled "crawled, currently not indexed"
 *
 * @param {{ profiles?: any[], graphics?: any, videoCount?: number }} data approved data only
 * @returns {boolean}
 */
export function hasIndexableData ({ profiles = [], graphics = null, videoCount = 0 }) {
	return videoCount > 0 ||
		Object.keys(graphics?.settings ?? {}).length > 0 ||
		profiles.some(p => profileHasValues(p.profiles))
}
