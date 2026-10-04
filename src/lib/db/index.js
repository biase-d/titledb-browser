import { env } from '$env/dynamic/private'
import * as schema from './schema'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'

/** @type {ReturnType<typeof drizzle> | null} */
let instance = null

function connect () {
	// Read at runtime rather than inlined at build time: the image is built
	// without secrets and takes its environment from the host at start
	if (!env.POSTGRES_URL) {
		throw new Error('POSTGRES_URL is not set')
	}

	const client = postgres(env.POSTGRES_URL, {
		parameters: {
			search_path: 'public, extensions'
		}
	})
	return drizzle(client, { schema })
}

/**
 * Connects on first use, not on import. SvelteKit's postbuild analysis imports
 * every server module, so connecting at module scope would require the database
 * to be reachable — and POSTGRES_URL to be set — at build time
 * @type {ReturnType<typeof drizzle>}
 */
export const db = /** @type {any} */ (new Proxy({}, {
	get (_target, prop) {
		instance ??= connect()
		const value = Reflect.get(instance, prop)
		return typeof value === 'function' ? value.bind(instance) : value
	}
}))
