import { describe, it, expect } from 'vitest'
import { asSearchPlatform, platformOf } from '$lib/platform'

describe('search platform', () => {
	it('keeps all, otherwise falls back to a console', () => {
		expect(asSearchPlatform('all')).toBe('all')
		expect(asSearchPlatform('switch2')).toBe('switch2')
		expect(asSearchPlatform('nonsense')).toBe('switch')
		expect(asSearchPlatform(null)).toBe('switch')
	})
	it('reads the console from the title ID', () => {
		expect(platformOf('040003C0262C0000')).toBe('switch2')
		expect(platformOf('0100000000010000')).toBe('switch')
	})
})
