import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getGameDetails } from '../src/lib/repositories/gameRepository.js'

const mockGame = {
	id: '0100A3D000196000',
	groupId: '0100A3D000196',
	names: ['Test Game'],
	regions: ['US'],
	publisher: 'Test Publisher',
	iconUrl: null,
	bannerUrl: null
}

const mockApprovedProfile = {
	id: 1,
	groupId: '0100A3D000196',
	gameVersion: '1.0.0',
	suffix: null,
	profiles: { docked: { target_fps: 60, resolution_type: 'Fixed', resolution: '1920x1080' }, handheld: {} },
	contributor: ['user1'],
	sourcePrUrl: 'https://github.com/biase-d/nx-performance/pull/10',
	status: 'approved',
	lastUpdated: new Date()
}

const mockPendingSubmission = {
	id: 42,
	userId: 'github|456',
	githubPrNumber: 99,
	groupId: '0100A3D000196',
	data: [{ gameVersion: '1.1.0', profiles: { docked: { target_fps: 60 }, handheld: {} } }],
	status: 'pending',
	type: 'performance',
	createdAt: new Date()
}

// Build a minimal drizzle-like db mock that supports query and select chains
function buildDbMock ({ pendingSubmissions = [] } = {}) {
	const queryMock = {
		games: {
			findFirst: vi.fn().mockResolvedValue(mockGame),
			findMany: vi.fn().mockResolvedValue([{ id: mockGame.id, names: mockGame.names, regions: mockGame.regions }])
		},
		gameGroups: {
			findFirst: vi.fn().mockResolvedValue({ id: '0100A3D000196', youtubeContributors: [] })
		},
		performanceProfiles: {
			findMany: vi.fn().mockResolvedValue([mockApprovedProfile])
		},
		graphicsSettings: {
			findFirst: vi.fn().mockResolvedValue(null)
		},
		youtubeLinks: {
			findMany: vi.fn().mockResolvedValue([])
		}
	}

	const selectMock = vi.fn().mockReturnValue({
		from: vi.fn().mockReturnValue({
			where: vi.fn().mockResolvedValue(pendingSubmissions)
		})
	})

	return { query: queryMock, select: selectMock }
}

describe('getGameDetails — hybrid pending + approved', () => {
	it('returns approved performance profiles from the active schema', async () => {
		const db = buildDbMock()
		const result = await getGameDetails(db, '0100A3D000196000')

		expect(result).not.toBeNull()
		expect(result.game.performanceHistory).toHaveLength(1)
		expect(result.game.performanceHistory[0].gameVersion).toBe('1.0.0')
		expect(result.game.performanceHistory[0].isPending).toBeFalsy()
	})

	it('merges pending submissions into performanceHistory with isPending: true', async () => {
		const db = buildDbMock({ pendingSubmissions: [mockPendingSubmission] })
		const result = await getGameDetails(db, '0100A3D000196000')

		expect(result).not.toBeNull()
		const allProfiles = result.game.performanceHistory
		const pending = allProfiles.filter(p => p.isPending)
		const approved = allProfiles.filter(p => !p.isPending)

		expect(approved).toHaveLength(1)
		expect(pending).toHaveLength(1)
		expect(pending[0].gameVersion).toBe('1.1.0')
		expect(pending[0].isPending).toBe(true)
	})

	it('does not include pending submissions when there are none', async () => {
		const db = buildDbMock({ pendingSubmissions: [] })
		const result = await getGameDetails(db, '0100A3D000196000')

		const pending = result.game.performanceHistory.filter(p => p.isPending)
		expect(pending).toHaveLength(0)
	})

	it('should_include_regional_releases_when_fetching_title_data', async () => {
		const db = buildDbMock()
		
		// Mock findMany to return multiple titles sharing the same groupId
		db.query.games.findMany = vi.fn().mockResolvedValue([
			{ id: '010019C023004000', names: ['Until Then'], regions: ['US'] },
			{ id: '010019C023005000', names: ['Until Then (JP)'], regions: ['JP'] }
		])

		const result = await getGameDetails(db, '010019C023004000')

		// Assert that the returned payload contains the regional variants
		expect(result).not.toBeNull()
		expect(result.allTitlesInGroup).toBeDefined()
		expect(result.allTitlesInGroup).toHaveLength(2)
		expect(result.allTitlesInGroup.map(t => t.id)).toContain('010019C023004000')
		expect(result.allTitlesInGroup.map(t => t.id)).toContain('010019C023005000')
	})

	it('returns null when game is not found', async () => {
		const db = buildDbMock()
		db.query.games.findFirst = vi.fn().mockResolvedValue(null)

		const result = await getGameDetails(db, 'NONEXISTENT')
		expect(result).toBeNull()
	})
})
