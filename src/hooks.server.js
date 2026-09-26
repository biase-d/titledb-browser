import { SvelteKitAuth } from '@auth/sveltekit'
import GitHub from '@auth/sveltekit/providers/github'
import { env } from '$env/dynamic/private'
import { sequence } from '@sveltejs/kit/hooks'
import { db } from '$lib/db'

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

		// Auth and API responses are never worth indexing
		if (event.url.pathname.startsWith('/auth') || event.url.pathname.startsWith('/api')) {
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

export const handle = sequence(dbHandler, securityHandler, authHandler)
