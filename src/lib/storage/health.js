/**
 * @file Storage Health
 * @description A real reachability probe for the object store
 *
 * Reporting "configured" because an adapter object exists says nothing: wrong
 * credentials, a wrong bucket name or an unreachable host all look identical
 * from the outside until an image is requested. Listing one object is the
 * cheapest call that exercises the endpoint, the credentials and the bucket
 */

/**
 * @typedef {Object} StorageProbe
 * @property {'up'|'down'|'not-configured'} status
 * @property {number} latency - Milliseconds, 0 when not configured
 */

const TIMEOUT_MS = 5000

/**
 * @param {import('./types').StorageAdapter|null} storage
 * @returns {Promise<StorageProbe>}
 */
export async function probeStorage (storage) {
	if (!storage) return { status: 'not-configured', latency: 0 }

	const start = Date.now()
	try {
		await Promise.race([
			storage.list('', 1),
			new Promise((_, reject) =>
				setTimeout(() => reject(new Error('Storage probe timed out')), TIMEOUT_MS)
			)
		])
		return { status: 'up', latency: Date.now() - start }
	} catch {
		// The caller decides what to say about it; the raw error names hosts
		// and keys and must not reach a public endpoint
		return { status: 'down', latency: Date.now() - start }
	}
}
