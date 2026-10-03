import { describe, it, expect } from 'vitest'
import { generateChangeSummary, EMPTY_ROW_NOTE } from '../src/lib/utils.js'

const empty = { gameVersion: '1.0.0', suffix: null, profiles: {} }

describe('a new version row with nothing in it', () => {
	it('is reported as ignored, not as a placeholder that will be saved', () => {
		const summary = generateChangeSummary({}, { performanceProfiles: [empty] })
		expect(summary).toHaveLength(1)
		expect(summary[0]).toContain(EMPTY_ROW_NOTE)
		expect(summary[0]).toContain('nothing to save')
	})

	it('still counts real data in the same submission', () => {
		const real = { gameVersion: '1.0.1', suffix: null, profiles: { docked: { target_fps: 30, resolution_type: 'Fixed', resolution: '1920x1080', fps_behavior: 'Locked' }, handheld: {} } }
		const summary = generateChangeSummary({}, { performanceProfiles: [empty, real] })
		expect(summary.some(s => s.includes('Added new performance data for v1.0.1'))).toBe(true)
		expect(summary.some(s => s.includes(EMPTY_ROW_NOTE))).toBe(true)
	})
})
