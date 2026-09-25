import { describe, it, expect } from 'vitest'
import { mapGraphicsToPerformance } from '../src/lib/repositories/searchRepository.js'

/**
 * A framerate switched from a fixed target to Unlocked keeps the old targetFps
 * in its saved JSON. The form hides the input rather than clearing it, and
 * older records were written before it was cleared at all, so the reader has to
 * treat lockType as the authority
 */
describe('Unlocked framerate', () => {
	/** @param {object} framerate */
	const docked = (framerate) => mapGraphicsToPerformance({ docked: { framerate } }).docked

	it('reports Unlocked even when a stale targetFps is still present', () => {
		expect(docked({ lockType: 'Unlocked', targetFps: 30 }).target_fps).toBe('Unlocked')
	})

	it('reports Unlocked when there is no targetFps at all', () => {
		expect(docked({ lockType: 'Unlocked' }).target_fps).toBe('Unlocked')
	})

	it('still reports a real target for a locked framerate', () => {
		expect(docked({ lockType: 'API', targetFps: 30 }).target_fps).toBe(30)
		expect(docked({ lockType: 'Custom', targetFps: 60 }).target_fps).toBe(60)
	})

	it('reports null when a locked framerate names no target', () => {
		expect(docked({ lockType: 'API' }).target_fps).toBeNull()
	})

	it('does not invent a target when the framerate is missing', () => {
		expect(mapGraphicsToPerformance({ docked: {} }).docked.target_fps).toBeNull()
	})
})
