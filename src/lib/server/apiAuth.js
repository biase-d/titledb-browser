import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * Helpers for the API's tokens. Pure, so they can be tested without a database.
 * The tokens themselves are stored in apiTokens.js
 *
 * A token looks like spk_ followed by 43 characters of URL-safe randomness. Only
 * its SHA-256 is stored, so a leaked database does not leak working tokens; the
 * person it was made for sees the whole thing once, when it is created
 */

export const TOKEN_PREFIX = 'spk_'
/** Characters of the random part kept in the clear, to tell one token from another in a list */
export const DISPLAY_CHARS = 6

/** @returns {{ token: string, hash: string, display: string }} */
export function generateToken () {
	const body = randomBytes(32).toString('base64url')
	const token = `${TOKEN_PREFIX}${body}`
	return { token, hash: hashToken(token), display: `${TOKEN_PREFIX}${body.slice(0, DISPLAY_CHARS)}` }
}

/** @param {string} token */
export function hashToken (token) {
	return createHash('sha256').update(token).digest('hex')
}

/** Whether a string has the shape of a token, before the database is asked @param {unknown} value */
export function looksLikeToken (value) {
	return typeof value === 'string' && /^spk_[A-Za-z0-9_-]{43}$/.test(value)
}

/**
 * The token in an Authorization header, or null
 * @param {string | null | undefined} header
 * @returns {string | null}
 */
export function parseBearer (header) {
	const match = /^Bearer\s+(\S+)\s*$/i.exec(header ?? '')
	return match ? match[1] : null
}

/** Constant-time comparison of two hex digests @param {string} a @param {string} b */
export function sameDigest (a, b) {
	const x = Buffer.from(a)
	const y = Buffer.from(b)
	return x.length === y.length && timingSafeEqual(x, y)
}

/**
 * Whether a request came from one of this site's own pages (its search box, for
 * one) rather than from a script. A browser says so itself in Sec-Fetch-Site and
 * Origin. A script can say the same, so this is a courtesy to the site's own
 * pages and not a lock: the API is gated to know who is using it, not to be secret
 *
 * @param {Request} request
 * @param {URL} url
 */
export function isSameOrigin (request, url) {
	const fetchSite = request.headers.get('sec-fetch-site')
	if (fetchSite) return fetchSite === 'same-origin'
	const origin = request.headers.get('origin')
	if (origin) return origin === url.origin
	const referer = request.headers.get('referer')
	return !!referer && referer.startsWith(`${url.origin}/`)
}

/**
 * A fixed-window counter per key, in memory. One process only: if the site is run
 * as several, each keeps its own count, which only makes it more lenient
 *
 * @param {{ limit: number, windowMs: number, now?: () => number }} options
 */
export function createRateLimiter ({ limit, windowMs, now = () => Date.now() }) {
	/** @type {Map<string, { start: number, count: number }>} */
	const windows = new Map()
	return {
		/**
		 * @param {string} key
		 * @returns {{ ok: boolean, remaining: number, retryAfter: number }} retryAfter in seconds
		 */
		hit (key) {
			const t = now()
			let w = windows.get(key)
			if (!w || t - w.start >= windowMs) {
				w = { start: t, count: 0 }
				windows.set(key, w)
				// Old windows are dropped as new ones start, so the map cannot grow without end
				if (windows.size > 5000) for (const [k, v] of windows) if (t - v.start >= windowMs) windows.delete(k)
			}
			w.count += 1
			const ok = w.count <= limit
			return { ok, remaining: Math.max(0, limit - w.count), retryAfter: Math.max(1, Math.ceil((w.start + windowMs - t) / 1000)) }
		}
	}
}

/**
 * The paths a token is needed for: the data. The status endpoints stay open for
 * uptime monitors, and the image proxy and share images because pages and link
 * previews load them
 * @param {string} pathname
 */
export function isGatedPath (pathname) {
	return pathname === '/api/v1/games' || pathname.startsWith('/api/v1/games/') || pathname === '/api/v1/stats'
}
