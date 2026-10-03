import { describe, it, expect } from 'vitest'
import { intensityOn, scenesOn, scenesFromParams, activeScenes, lightFor, SEASONS } from '../src/lib/seasons.js'

const on = (season, y, m, d, h = 12) => intensityOn(SEASONS[season], new Date(y, m - 1, d, h))

describe('a scene is built up gradually', () => {
	it('has nothing a long way out', () => {
		expect(on('halloween', 2026, 8, 1)).toBe(0)
		expect(on('winter', 2026, 6, 15)).toBe(0)
	})

	it('starts a few days early with only a little', () => {
		const first = on('halloween', 2026, 9, 25)
		expect(first).toBeGreaterThan(0)
		expect(first).toBeLessThan(0.1)
	})

	it('adds more each day until it is complete', () => {
		const days = [25, 28, 30].map(d => on('halloween', 2026, 9, d)).concat([1, 5, 10, 15, 20].map(d => on('halloween', 2026, 10, d)))
		for (let i = 1; i < days.length; i++) expect(days[i]).toBeGreaterThan(days[i - 1])
		expect(on('halloween', 2026, 10, 22)).toBe(1)
	})

	it('stays complete through the month, including its last day', () => {
		expect(on('halloween', 2026, 10, 31)).toBe(1)
		expect(on('autumn', 2026, 11, 20)).toBe(1)
		expect(on('winter', 2026, 12, 31)).toBe(1)
	})

	it('comes down over a couple of days', () => {
		const after = on('halloween', 2026, 11, 2)
		expect(after).toBeGreaterThan(0)
		expect(after).toBeLessThan(1)
		expect(on('halloween', 2026, 11, 6)).toBe(0)
	})

	it('runs winter into January and no further', () => {
		expect(on('winter', 2027, 1, 2)).toBeGreaterThan(0)
		expect(on('winter', 2027, 1, 2)).toBeLessThan(1)
		expect(on('winter', 2027, 1, 10)).toBe(0)
	})
})

describe('scenesOn', () => {
	it('is empty in the quiet part of the year', () => {
		expect(scenesOn(new Date(2026, 5, 15))).toEqual([])
	})

	it('puts the next scene up while the last comes down', () => {
		const names = scenesOn(new Date(2026, 9, 31, 12)).map(s => s.season.name)
		expect(names).toEqual(['halloween', 'autumn'])
	})

	it('is Halloween, lightly, on the third of October', () => {
		const scenes = scenesOn(new Date(2026, 9, 3, 12))
		expect(scenes).toHaveLength(1)
		expect(scenes[0].season.name).toBe('halloween')
		expect(scenes[0].intensity).toBeGreaterThan(0.1)
		expect(scenes[0].intensity).toBeLessThan(0.5)
	})
})

describe('previews', () => {
	it('names a scene, fully built by default, or part built', () => {
		expect(scenesFromParams(new URLSearchParams('season=winter'))?.[0].intensity).toBe(1)
		expect(scenesFromParams(new URLSearchParams('season=winter&build=0.3'))?.[0].intensity).toBe(0.3)
	})

	it('shows nothing for off, and ignores anything else', () => {
		expect(scenesFromParams(new URLSearchParams('season=off'))).toEqual([])
		expect(scenesFromParams(new URLSearchParams('season=spring'))).toBeUndefined()
		expect(scenesFromParams(new URLSearchParams('season=__proto__'))).toBeUndefined()
		expect(scenesFromParams(null)).toBeUndefined()
	})

	it('clamps the build to something sensible', () => {
		expect(scenesFromParams(new URLSearchParams('season=winter&build=9'))?.[0].intensity).toBe(1)
		expect(scenesFromParams(new URLSearchParams('season=winter&build=nope'))?.[0].intensity).toBe(1)
	})
})

describe('activeScenes', () => {
	it('respects the setting', () => {
		expect(activeScenes('off', null, new Date(2026, 9, 31, 12))).toEqual([])
		expect(activeScenes('auto', null, new Date(2026, 9, 31, 12)).length).toBeGreaterThan(0)
	})

	it('lets an address override both', () => {
		expect(activeScenes('off', new URLSearchParams('season=autumn'))[0].season.name).toBe('autumn')
	})
})

describe('lightFor', () => {
	it('is white with no scene', () => {
		expect(lightFor([])).toBe(0xffffff)
	})

	it('leans toward the scene as it fills', () => {
		const faint = lightFor([{ season: SEASONS.winter, intensity: 0.1 }])
		const full = lightFor([{ season: SEASONS.winter, intensity: 1 }])
		const red = (/** @type {number} */ c) => (c >> 16) & 255
		expect(red(faint)).toBeGreaterThan(red(full))
		expect(red(full)).toBeLessThan(255)
	})
})
