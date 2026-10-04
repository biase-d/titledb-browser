/**
 * @file Pipeline Lock
 * @description Makes sure only one pipeline run touches the database at a time
 *
 * Two runs at once is not a theoretical problem: a full rebuild writes into the
 * standby schema and then swaps it in, so overlapping runs write to the same
 * standby and both swap — leaving whichever finished second pointing at a schema
 * the other was still filling. The `build_status` row was only ever advisory;
 * nothing read it before starting
 *
 * A Postgres advisory lock is the right tool because it is held by the session
 * and released automatically if the process dies, so a crashed build cannot
 * leave the pipeline permanently locked (which a row-based flag would)
 */

// Arbitrary but fixed: any key works as long as every caller uses the same one
const LOCK_KEY = 8_374_512_901

/** Raised when another run holds the lock, so callers can exit quietly */
export class PipelineBusyError extends Error {
	constructor () {
		super('Another pipeline run is already in progress')
		this.name = 'PipelineBusyError'
	}
}

/**
 * Take the lock without waiting. Returns a release function
 * @param {import('postgres').Sql} sqlClient
 * @returns {Promise<() => Promise<void>>}
 */
export async function acquirePipelineLock (sqlClient) {
	const [{ locked }] = await sqlClient.unsafe(`SELECT pg_try_advisory_lock(${LOCK_KEY}) AS locked`)

	if (!locked) throw new PipelineBusyError()

	return async () => {
		try {
			await sqlClient.unsafe(`SELECT pg_advisory_unlock(${LOCK_KEY})`)
		} catch {
			// The connection is closing anyway, which releases it regardless
		}
	}
}
