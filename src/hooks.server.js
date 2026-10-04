import { SvelteKitAuth } from '@auth/sveltekit'
import GitHub from '@auth/sveltekit/providers/github'
import { env } from '$env/dynamic/private'
import { sequence } from '@sveltejs/kit/hooks'
import { db } from '$lib/db'
import { dev } from '$app/environment'
import { json } from '@sveltejs/kit'
import { createRateLimiter, isGatedPath, isSameOrigin, parseBearer } from '$lib/server/apiAuth'
import { verifyToken } from '$lib/server/apiTokens'

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

/** A token may make this many requests a minute */
const apiLimiter = createRateLimiter({ limit: 120, windowMs: 60_000 })

/**
 * The data API is for signed-in people, each with a token of their own (made at
 * /docs/api). A request needs one in an Authorization header, unless it comes
 * from one of this site's own pages, which use the same endpoints for search.
 * That exemption rests on what the browser says about itself and is only a
 * courtesy: the gate is there to know who is using the API and to give each a
 * rate limit, not to keep it secret
 * @type {import('@sveltejs/kit').Handle}
 */
const apiGateHandler = async ({ event, resolve }) => {
	if (!isGatedPath(event.url.pathname) || event.request.method === 'OPTIONS') return resolve(event)

	const header = event.request.headers.get('authorization')
	const token = parseBearer(header)

	if (token || header) {
		const owner = token ? await verifyToken(event.locals.db, token) : null
		if (!owner) {
			return json(
				{ message: 'That token is not valid, or it has been revoked.', docs: `${event.url.origin}/docs/api#authentication` },
				{ status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="Switch Performance API", error="invalid_token"' } }
			)
		}
		const limit = apiLimiter.hit(owner.id)
		if (!limit.ok) {
			return json(
				{ message: 'Too many requests. Slow down a little.', retryAfter: limit.retryAfter },
				{ status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
			)
		}
		const response = await resolve(event)
		try { response.headers.set('X-RateLimit-Remaining', String(limit.remaining)) } catch { /* immutable */ }
		return response
	}

	if (isSameOrigin(event.request, event.url)) return resolve(event)

	return json(
		{ message: 'This API needs a token. Sign in with GitHub and make one at /docs/api.', docs: `${event.url.origin}/docs/api#authentication` },
		{ status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="Switch Performance API"' } }
	)
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
