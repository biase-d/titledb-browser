
import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as gameService from '../src/lib/services/gameService.js'
import * as gameRepo from '$lib/repositories/gameRepository'
import * as searchRepo from '$lib/repositories/searchRepository'
import * as requestRepo from '$lib/repositories/requestRepository'

vi.mock('$lib/repositories/gameRepository')
vi.mock('$lib/repositories/searchRepository')
vi.mock('$lib/repositories/requestRepository')

describe('Game Service', () => {
    const dbMock = {}

    beforeEach(() => {
        vi.resetAllMocks()
        vi.mocked(gameRepo.getGameDetails).mockResolvedValue({ id: '123', title: 'Test Game' })
        vi.mocked(gameRepo.findGameById).mockResolvedValue({ id: '123' })
        vi.mocked(searchRepo.searchGames).mockResolvedValue({ results: [], pagination: {}, stats: {} })
        vi.mocked(requestRepo.hasUserRequestedData).mockResolvedValue(false)
        vi.mocked(requestRepo.createDataRequest).mockResolvedValue()
        vi.mocked(requestRepo.removeDataRequest).mockResolvedValue()
    })

    it('should get game context with user request status', async () => {
        vi.mocked(requestRepo.hasUserRequestedData).mockResolvedValue(true)

        const result = await gameService.getGameContext(dbMock, '123', 'user1')
        expect(result.userContext.hasRequested).toBe(true)
    })

    it('getGameContext should return null if game not found', async () => {
        vi.mocked(gameRepo.getGameDetails).mockResolvedValue(null)

        const result = await gameService.getGameContext(dbMock, '999', 'user1')
        expect(result).toBe(null)
    })

    it('should toggle request data: ON if not existing', async () => {
        vi.mocked(requestRepo.hasUserRequestedData).mockResolvedValue(false)

        const result = await gameService.requestGameData(dbMock, 'user1', '123')
        expect(result.requested).toBe(true)
        expect(requestRepo.createDataRequest).toHaveBeenCalledWith(dbMock, 'user1', '123')
        expect(requestRepo.removeDataRequest).not.toHaveBeenCalled()
    })

    it('should toggle request data: OFF if existing', async () => {
        vi.mocked(requestRepo.hasUserRequestedData).mockResolvedValue(true)

        const result = await gameService.requestGameData(dbMock, 'user1', '123')
        expect(result.requested).toBe(false)
        expect(requestRepo.removeDataRequest).toHaveBeenCalledWith(dbMock, 'user1', '123')
        expect(requestRepo.createDataRequest).not.toHaveBeenCalled()
    })

    describe('searchGames', () => {
        it('should call repo search with params', async () => {
            const params = new URLSearchParams({ q: 'test' })
            vi.mocked(searchRepo.searchGames).mockResolvedValue({
                results: [{ id: '1', title: 'Found Game' }],
                pagination: { currentPage: 1, totalPages: 1, totalItems: 1 },
                stats: {}
            })

            const result = await gameService.searchGames(dbMock, params)

            expect(result.results).toHaveLength(1)
            expect(searchRepo.searchGames).toHaveBeenCalledWith(dbMock, params)
        })
    })
})

