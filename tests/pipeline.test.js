import { describe, it, expect, vi } from 'vitest'
import { acquirePipelineLock, PipelineBusyError } from '../src/lib/pipeline/lock.js'

/**
 * These replace the tests for the old POST /api/v1/pipeline/run route. The
 * pipeline is triggered by a scheduled task running scripts/build.js in the
 * container now, so the thing worth covering is the lock that keeps two runs
 * from overlapping — which is what protects the standby-schema swap
 */
describe('Pipeline lock', () => {
	/** @param {boolean} locked */
	function sqlClientReturning (locked) {
		return { unsafe: vi.fn().mockResolvedValue([{ locked }]) }
	}

	it('takes the lock when no other run holds it', async () => {
		const sqlClient = sqlClientReturning(true)

		const release = await acquirePipelineLock(/** @type {any} */ (sqlClient))

		expect(typeof release).toBe('function')
		expect(sqlClient.unsafe).toHaveBeenCalledWith(expect.stringContaining('pg_try_advisory_lock'))
	})

	it('throws PipelineBusyError when another run holds it', async () => {
		const sqlClient = sqlClientReturning(false)

		await expect(acquirePipelineLock(/** @type {any} */ (sqlClient)))
			.rejects.toBeInstanceOf(PipelineBusyError)
	})

	it('releases with pg_advisory_unlock', async () => {
		const sqlClient = sqlClientReturning(true)

		const release = await acquirePipelineLock(/** @type {any} */ (sqlClient))
		await release()

		expect(sqlClient.unsafe).toHaveBeenLastCalledWith(expect.stringContaining('pg_advisory_unlock'))
	})

	it('uses the same lock key to take and release, or the lock would leak', async () => {
		const sqlClient = sqlClientReturning(true)

		const release = await acquirePipelineLock(/** @type {any} */ (sqlClient))
		await release()

		const keyOf = (/** @type {string} */ sql) => sql.match(/\((\d+)\)/)?.[1]
		const [[acquireSql], [releaseSql]] = sqlClient.unsafe.mock.calls
		expect(keyOf(acquireSql)).toBe(keyOf(releaseSql))
	})

	it('swallows a failure to release, since the connection closing frees it anyway', async () => {
		const sqlClient = {
			unsafe: vi.fn()
				.mockResolvedValueOnce([{ locked: true }])
				.mockRejectedValueOnce(new Error('connection closed'))
		}

		const release = await acquirePipelineLock(/** @type {any} */ (sqlClient))

		await expect(release()).resolves.toBeUndefined()
	})
})
