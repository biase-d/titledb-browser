import { describe, it, expect } from 'vitest'
import { cleanListName, MAX_LIST_NAME } from '../src/lib/repositories/favoritesRepository.js'
import { titleId } from '../src/lib/server/favoritesApi.js'

describe('cleanListName', () => {
	it('trims, collapses spaces and newlines, and caps the length', () => {
		expect(cleanListName('  Playing   now \n')).toBe('Playing now')
		expect(cleanListName('x'.repeat(100)).length).toBe(MAX_LIST_NAME)
		expect(cleanListName('   ')).toBe('')
		expect(cleanListName(undefined)).toBe('')
	})
})

describe('titleId', () => {
	it('accepts a 16-digit hex title ID in either case and upper-cases it', () => {
		expect(titleId('0100a3d000196000')).toBe('0100A3D000196000')
		expect(titleId(' 0100A3D000196000 ')).toBe('0100A3D000196000')
	})

	it('refuses anything else', () => {
		expect(titleId('nope')).toBeNull()
		expect(titleId('0100A3D00019600')).toBeNull()
		expect(titleId('0100A3D0001960000')).toBeNull()
		expect(titleId(null)).toBeNull()
	})
})
