import { describe, it, expect } from 'vitest'
import { eggFor } from '../src/lib/franchise.js'

describe('eggFor', () => {
	it('matches a franchise by name, whoever published it', () => {
		expect(eggFor(['Super Mario Odyssey'], 'Nintendo')).toBe('block')
		expect(eggFor(['Mario & Sonic at the Olympic Games'], 'SEGA')).toBe('block')
		expect(eggFor(['The Legend of Zelda: Tears of the Kingdom'], 'Nintendo')).toBe('rupee')
		expect(eggFor(['Animal Crossing: New Horizons'], 'Nintendo')).toBe('bell')
		expect(eggFor(['Kirby and the Forgotten Land'], 'Nintendo')).toBe('star')
		expect(eggFor(['Pokémon Legends: Arceus'], 'The Pokémon Company')).toBe('ball')
		expect(eggFor(['Pokemon Sword'], null)).toBe('ball')
	})

	it('gives any other Nintendo game the generic one', () => {
		expect(eggFor(['Splatoon 3'], 'Nintendo')).toBe('block')
	})

	it('gives a game that is not Nintendo\'s nothing', () => {
		expect(eggFor(['Hollow Knight'], 'Team Cherry')).toBeNull()
		expect(eggFor([], null)).toBeNull()
		expect(eggFor(undefined, undefined)).toBeNull()
	})

	it('does not mistake a word that merely contains a name', () => {
		expect(eggFor(['Marionette Dreams'], 'Indie')).toBeNull()
	})
})
