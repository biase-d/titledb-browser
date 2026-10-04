import { SvelteKitAuth } from '@auth/sveltekit'
import GitHub from '@auth/sveltekit/providers/github'
import { env } from '$env/dynamic/private'
import { sequence } from '@sveltejs/kit/hooks'
import { db } from '$lib/db'
import { dev } from '$app/environment'
import { json } from '@sveltejs/kit'
import { createRateLimiter, isGatedPath, isSameOrigin, parseBearer } from '$lib/server/apiAuth'
import { verifyToken } from '$lib/server/apiTokens'
import { recordUsage } from '$lib/server/apiUsage'

/** @type {import('@sveltejs/kit').Handle} */
const dbHandler = async ({ event, resolve }) => {
	event.locals.db = db
	return resolve(event)
}

/** @type {import('@sveltejs/kit').Handle} */
const securityHandler = async ({ event, resolve }) => {
	// Prevent automated crawlers from seeing unbranded/raw signin forms
	if (event.url.pathname === '/auth/signin' && event.request.method === 'GET') {
		return new Response(null, {
			status: 302,
			headers: {
				Location: '/contribute'
			}
		})
	}

	const response = await resolve(event)

	// Auth.js builds its redirects with immutable headers, and setting one on
	// those throws. That throw is not cosmetic: the sign-in form posts to
	// /auth/signin/github, which answers with exactly such a redirect, so
	// setting a header here turned signing in into a 500. A redirect carries no
	// markup for these headers to protect, so skipping it costs nothing
	try {
		response.headers.set('X-Content-Type-Options', 'nosniff')
		response.headers.set('X-Frame-Options', 'DENY')
		response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
		response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')

		// Auth and API responses are never worth indexing - except the two that
		// exist to be referenced as page imagery. og:image and the image in the
		// VideoGame structured data both point at these, and Google requires a
		// rich-result image to be crawlable *and* indexable, so a noindex here
		// is enough to have the rich result rejected
		const isPageImagery = event.url.pathname === '/api/v1/proxy/image' ||
			event.url.pathname.startsWith('/api/og/')

		if (!isPageImagery && (event.url.pathname.startsWith('/auth') || event.url.pathname.startsWith('/api'))) {
			response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
		}
	} catch {
		// Immutable headers, as above
	}

	return response
}

/** @type {import('@sveltejs/kit').Handle} */
const authHandler = SvelteKitAuth({
	trustHost: true,
	// Every built-in Auth.js page is replaced by one of ours. They are generic,
	// unbranded pages carrying a sign-in form, which is the shape Safe Browsing
	// reads as a phishing page - and /auth/signin was not the only one: /auth/error,
	// /auth/signout and /auth/verify-request each served the same thing
	pages: {
		signIn: '/contribute',
		signOut: '/',
		error: '/',
		verifyRequest: '/'
	},
	providers: [
		GitHub({
			clientId: env.GITHUB_ID,
			clientSecret: env.GITHUB_SECRET,
			authorization: {
				params: {
					scope: ''
				}
			}
		})
	],
	callbacks: {
		async jwt ({ token, profile }) {
			if (profile) {
				// @ts-ignore
				token.login = profile.login
				// @ts-ignore
				token.id = profile.id
			}
			return token
		},
		async session ({ session, token }) {
			// @ts-ignore
			session.user.login = token.login
			// @ts-ignore
			session.user.id = token.id
			return session
		}
	}
}).handle

/**
 * How many requests a minute: each token, and each caller with no token (counted by
 * IP address). Both can be set in the environment
 */
const limitFrom = (/** @type {string | undefined} */ value, /** @type {number} */ fallback) => {
	const n = Number(value)
	return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}
const TOKEN_LIMIT = limitFrom(env.API_TOKEN_LIMIT, 300)
const ANON_LIMIT = limitFrom(env.API_ANON_LIMIT, 30)
const tokenLimiter = createRateLimiter({ limit: TOKEN_LIMIT, windowMs: 60_000 })
const anonLimiter = createRateLimiter({ limit: ANON_LIMIT, windowMs: 60_000 })

/** The caller's address, or 'unknown' where the server cannot tell @param {import('@sveltejs/kit').RequestEvent} event */
function callerAddress (event) {
	try { return event.getClientAddress() } catch { return 'unknown' }
}

/**
 * The data API is open, with a modest limit for anyone, and a token (made at
 * /docs/api by signing in with GitHub) lifts it. Either way the use is counted
 * (see $lib/server/apiUsage) so that someone using it heavily can be found. The
 * site's own pages, which use the same endpoints for search, are not limited or
 * counted. They are recognised by what the browser says about itself, which a
 * script can say too: this is not a lock, only a way of knowing who is calling
 * @type {import('@sveltejs/kit').Handle}
 */
const apiGateHandler = async ({ event, resolve }) => {
	if (!isGatedPath(event.url.pathname) || event.request.method === 'OPTIONS') return resolve(event)

	const header = event.request.headers.get('authorization')
	const token = parseBearer(header)
	const userAgent = event.request.headers.get('user-agent') ?? ''

	/** @param {{ ok: boolean, remaining: number, retryAfter: number }} limit @param {number} max @param {string} tier */
	const answer = async (limit, max, tier) => {
		if (!limit.ok) {
			return json(
				{ message: tier === 'anonymous' ? `Too many requests. Without a token the limit is ${max} a minute; a token raises it (see the docs).` : 'Too many requests. Slow down a little.', retryAfter: limit.retryAfter, docs: `${event.url.origin}/docs/api#authentication` },
				{ status: 429, headers: { 'Retry-After': String(limit.retryAfter), 'X-RateLimit-Limit': String(max), 'X-RateLimit-Remaining': '0', 'X-RateLimit-Tier': tier } }
			)
		}
		const response = await resolve(event)
		try {
			response.headers.set('X-RateLimit-Limit', String(max))
			response.headers.set('X-RateLimit-Remaining', String(limit.remaining))
			response.headers.set('X-RateLimit-Tier', tier)
		} catch { /* immutable */ }
		return response
	}

	if (token || header) {
		const owner = token ? await verifyToken(event.locals.db, token) : null
		if (!owner) {
			return json(
				{ message: 'That token is not valid, or it has been revoked.', docs: `${event.url.origin}/docs/api#authentication` },
				{ status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="Switch Performance API", error="invalid_token"' } }
			)
		}
		const limit = tokenLimiter.hit(owner.id)
		recordUsage(event.locals.db, { subject: `token:${owner.id}`, label: owner.name ? `${owner.login}: ${owner.name}` : owner.login, userAgent, limited: !limit.ok })
		return answer(limit, TOKEN_LIMIT, 'token')
	}

	if (isSameOrigin(event.request, event.url)) return resolve(event)

	const ip = callerAddress(event)
	const limit = anonLimiter.hit(ip)
	recordUsage(event.locals.db, { subject: `ip:${ip}`, userAgent, limited: !limit.ok })
	return answer(limit, ANON_LIMIT, 'anonymous')
}

/**
 * Local development only: be signed in as DEV_FAKE_USER without GitHub, so the
 * pages behind a sign-in (contribute, profile settings) can be opened on a
 * machine that has no OAuth app. It does nothing unless the server was started
 * with `vite dev` (`dev` is false in a build, so in production this is a
 * pass-through whatever the environment says) and the variable is set. It only
 * answers locals.auth(); nothing is written, and GitHub calls still need a real token
 * @type {import('@sveltejs/kit').Handle}
 */
const devSignInHandler = async ({ event, resolve }) => {
	if (dev && env.DEV_FAKE_USER) {
		const login = env.DEV_FAKE_USER
		const locals = /** @type {any} */ (event.locals)
		locals.auth = async () => ({
			user: { name: login, login, id: 'dev-user', image: null },
			expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
		})
	}
	return resolve(event)
}

export const handle = sequence(dbHandler, securityHandler, apiGateHandler, authHandler, devSignInHandler)
