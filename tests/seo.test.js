import { describe, it, expect } from 'vitest'
import { pickCanonicalTitleId, hasIndexableData } from '../src/lib/seo.js'

describe('pickCanonicalTitleId', () => {
	const titles = [
		{ id: '01000F900B6CC000', groupId: 'G', regions: ['AU', 'NZ'] },
		{ id: '010043600B6A6000', groupId: 'G', regions: ['GB', 'FR'] },
		{ id: '010095300B6A4000', groupId: 'G', regions: ['US', 'CA'] }
	]

	it('prefers the US release', () => {
		expect(pickCanonicalTitleId(titles, 'G', 'x')).toBe('010095300B6A4000')
	})

	it('falls back to the lowest ID without a US release', () => {
		expect(pickCanonicalTitleId(titles.slice(0, 2), 'G', 'x')).toBe('01000F900B6CC000')
	})

	it('is the same whichever title of the group is being viewed', () => {
		// the list is the group's, so every page of the game computes the same answer
		expect(pickCanonicalTitleId([...titles].reverse(), 'G', 'x')).toBe(pickCanonicalTitleId(titles, 'G', 'y'))
	})

	it('ignores titles that only share a name, which sit in another group', () => {
		const withNameMatch = [...titles.slice(0, 1), { id: '010095300B6A4000', groupId: 'OTHER', regions: ['US'] }]
		expect(pickCanonicalTitleId(withNameMatch, 'G', 'self')).toBe('self')
	})

	it('uses the fallback when the group is a single title', () => {
		expect(pickCanonicalTitleId([titles[0]], 'G', 'self')).toBe('self')
	})
})

describe('hasIndexableData', () => {
	it('is false for a title with nothing but artwork', () => {
		expect(hasIndexableData({})).toBe(false)
	})

	it('is false for a placeholder profile that only names a contributor', () => {
		expect(hasIndexableData({ profiles: [{ profiles: {} }] })).toBe(false)
		expect(hasIndexableData({ profiles: [{ profiles: { docked: {}, handheld: {} } }] })).toBe(false)
	})

	it('is true for a profile with a frame rate or a resolution type', () => {
		expect(hasIndexableData({ profiles: [{ profiles: { docked: { target_fps: 30 } } }] })).toBe(true)
		expect(hasIndexableData({ profiles: [{ profiles: { handheld: { resolution_type: 'Fixed' } } }] })).toBe(true)
	})

	it('is true with graphics settings or a video', () => {
		expect(hasIndexableData({ graphics: { settings: { docked: {} } } })).toBe(true)
		expect(hasIndexableData({ graphics: { settings: {} } })).toBe(false)
		expect(hasIndexableData({ videoCount: 1 })).toBe(true)
	})
})
