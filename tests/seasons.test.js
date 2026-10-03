import { describe, it, expect } from 'vitest'
import { seasonFor, seasonFromParam, SEASONS } from '../src/lib/seasons.js'

describe('seasonFor', () => {
	it('is Halloween in October, autumn in November, winter in December', () => {
		expect(seasonFor(new Date(2026, 9, 1))).toBe(SEASONS.halloween)
		expect(seasonFor(new Date(2026, 9, 31))).toBe(SEASONS.halloween)
		expect(seasonFor(new Date(2026, 10, 1))).toBe(SEASONS.autumn)
		expect(seasonFor(new Date(2026, 11, 31))).toBe(SEASONS.winter)
	})

	it('is nothing for the rest of the year', () => {
		for (const month of [0, 1, 2, 3, 4, 5, 6, 7, 8]) {
			expect(seasonFor(new Date(2026, month, 15))).toBeNull()
		}
	})
})

describe('seasonFromParam', () => {
	it('names a scene, or none', () => {
		expect(seasonFromParam('winter')).toBe(SEASONS.winter)
		expect(seasonFromParam('off')).toBeNull()
	})

	it('ignores anything else, including inherited object keys', () => {
		expect(seasonFromParam('spring')).toBeUndefined()
		expect(seasonFromParam('toString')).toBeUndefined()
		expect(seasonFromParam('__proto__')).toBeUndefined()
		expect(seasonFromParam(null)).toBeUndefined()
	})
})
