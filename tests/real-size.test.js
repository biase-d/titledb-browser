import { describe, it, expect } from 'vitest'
import { guessPxPerMm, clampPxPerMm, CSS_PX_PER_MM, MIN_PX_PER_MM, MAX_PX_PER_MM } from '../src/lib/realSize.js'

describe('guessPxPerMm', () => {
	it('knows a 14-inch MacBook Pro: 254 ppi at ratio 2 is 5 CSS px to the mm', () => {
		expect(guessPxPerMm({ width: 1512, height: 982, dpr: 2 })).toBeCloseTo(5, 1)
		// either way round
		expect(guessPxPerMm({ width: 982, height: 1512, dpr: 2 })).toBeCloseTo(5, 1)
	})

	it('treats a recognised size at ratio 1 as not that panel', () => {
		expect(guessPxPerMm({ width: 1512, height: 982, dpr: 1 })).toBeCloseTo(CSS_PX_PER_MM, 5)
	})

	it('sizes phones to the hand', () => {
		const android = guessPxPerMm({ width: 412, height: 915, dpr: 2.6, ua: 'Mozilla/5.0 (Linux; Android 14)', touch: true })
		const iphone = guessPxPerMm({ width: 393, height: 852, dpr: 3, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', touch: true })
		expect(android).toBeGreaterThan(5.5)
		expect(iphone).toBeGreaterThan(5.5)
	})

	it('guesses larger than the spec for an unknown dense screen (4.6 raised by 1.3), and the spec for a plain one', () => {
		expect(guessPxPerMm({ width: 1600, height: 900, dpr: 2 })).toBeCloseTo(4.6 * 1.3, 5)
		expect(guessPxPerMm({ width: 1920, height: 1080, dpr: 1 })).toBeCloseTo(CSS_PX_PER_MM, 5)
	})
})

describe('clampPxPerMm', () => {
	it('keeps a value in the range a slider can reach', () => {
		expect(clampPxPerMm(0)).toBe(MIN_PX_PER_MM)
		expect(clampPxPerMm(99)).toBe(MAX_PX_PER_MM)
		expect(clampPxPerMm(4.2)).toBe(4.2)
	})
})
