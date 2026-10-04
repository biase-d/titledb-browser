import { fail } from '@sveltejs/kit'
import { createToken, listTokens, MAX_TOKENS, revokeToken } from '$lib/server/apiTokens'

/** @param {any} locals */
async function signedInUser (locals) {
	const session = await locals.auth?.()
	const user = session?.user
	return user?.id && user?.login ? { id: String(user.id), login: String(user.login) } : null
}

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ parent, locals }) => {
	const { session } = await parent()
	const user = await signedInUser(locals)
	// Only what is shown: the signed-out page does not touch the token table
	const tokens = user ? await listTokens(locals.db, user.id) : []
	return { session, tokens, maxTokens: MAX_TOKENS }
}

/** @type {import('./$types').Actions} */
export const actions = {
	/** Makes a token. The whole of it is in the answer, once */
	create: async ({ request, locals }) => {
		const user = await signedInUser(locals)
		if (!user) return fail(401, { message: 'Sign in with GitHub first.' })

		const form = await request.formData()
		const name = String(form.get('name') ?? '')
		const made = await createToken(locals.db, user, name)
		if (!made.ok) return fail(400, { message: `You already have ${MAX_TOKENS} tokens. Revoke one to make another.` })

		return { created: { token: made.token, display: made.display, name: made.name } }
	},

	/** Revokes one of the signed-in person's own tokens */
	revoke: async ({ request, locals }) => {
		const user = await signedInUser(locals)
		if (!user) return fail(401, { message: 'Sign in with GitHub first.' })

		const form = await request.formData()
		const id = String(form.get('id') ?? '')
		if (!id) return fail(400, { message: 'Which token?' })

		await revokeToken(locals.db, user.id, id)
		return { revoked: true }
	}
}
