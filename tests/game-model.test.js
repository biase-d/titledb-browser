import { describe, it, expect } from 'vitest'
import { Game } from '../src/lib/models/Game.js'

describe('Game.allContributors', () => {
	it('counts names that differ by case or spaces as one person', () => {
		const game = new Game({
			contributor: ['biase-d', 'Biase-D'],
			graphics: { contributor: ['biase-d '] },
			youtubeLinks: [{ submittedBy: 'ALICE' }, { submittedBy: 'alice' }]
		})
		expect(game.allContributors).toEqual(['biase-d', 'ALICE'])
	})

	it('ignores missing and blank names', () => {
		const game = new Game({ contributor: ['', '  '], youtubeLinks: [{ submittedBy: null }, { submittedBy: undefined }] })
		expect(game.allContributors).toEqual([])
	})
})
