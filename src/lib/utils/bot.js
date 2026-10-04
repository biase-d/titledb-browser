/**
 * Detect a crawler, so interactive extras can be skipped for it
 *
 * Used to keep the onboarding modal away from crawlers. Google judges a page by
 * what it renders, and a modal over the content is both a poor signal and, for
 * the URL inspection tool, a confusing thing to be shown instead of the page
 *
 * Named agents first, then generic shapes. The generic patterns catch the long
 * tail - a list of names alone goes stale the moment a crawler is renamed, and
 * Google alone renders under half a dozen different ones
 */

/** Agents worth naming, mostly because their names are not obviously botlike */
const NAMED = [
	// Google renders under several agents, not just Googlebot
	'googlebot',
	'google-inspectiontool',   // the URL inspection tool in Search Console
	'googleother',
	'storebot-google',
	'adsbot-google',
	'google-extended',
	'mediapartners-google',
	// Other search engines
	'bingbot',
	'bingpreview',
	'yandexbot',
	'duckduckbot',
	'slurp',
	'baiduspider',
	'applebot',
	'petalbot',
	'ia_archiver',
	// Link unfurlers: they fetch a page to build a preview card
	'discordbot',
	'twitterbot',
	'facebookexternalhit',
	'telegrambot',
	'slackbot',
	'linkedinbot',
	'whatsapp',
	'redditbot',
	'pinterest',
	// Auditing
	'lighthouse',
	'pagespeed',
	'chrome-lighthouse'
]

/**
 * Shapes a crawler's agent tends to have, whatever it is called
 *
 * Note what is missing: a bare 'bot', and even 'bot ' with a trailing space.
 * Phones are called things like "CUBOT NOTE 20", so both would deny onboarding
 * to the people it exists for. 'bot/' is safe because a version follows, and
 * '+http' is the contact URL nearly every crawler carries and no browser does
 */
const GENERIC = ['bot/', 'crawler', 'spider', 'headlesschrome', '+http']

/**
 * @param {string} [userAgent] - Defaults to the browser's own
 * @returns {boolean}
 */
export function isBot (userAgent) {
	const source = userAgent ?? (typeof navigator === 'undefined' ? '' : navigator.userAgent)
	if (!source) return false

	const ua = source.toLowerCase()

	if (NAMED.some(name => ua.includes(name))) return true

	return GENERIC.some(pattern => ua.includes(pattern)) || ua.endsWith('bot')
}
