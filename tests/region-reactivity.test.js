import { describe, it, expect, vi } from 'vitest'

vi.mock('$app/environment', () => ({ browser: true }))
vi.mock('$app/navigation', () => ({ goto: vi.fn() }))

vi.mock('$lib/stores/theme.svelte', () => ({
    themeStore: {
        setTheme: vi.fn(),
        clearTheme: vi.fn(),
    }
}))

vi.stubGlobal('matchMedia', vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
})))

if (typeof Element !== 'undefined' && !Element.prototype.animate) {
    Element.prototype.animate = vi.fn().mockReturnValue({
        finished: Promise.resolve(),
        cancel: vi.fn(),
        pause: vi.fn(),
        play: vi.fn(),
        reverse: vi.fn(),
        onfinish: null,
    })
}

import { render } from '@testing-library/svelte'
import Page from '../src/routes/title/[id]/+page.svelte'

describe('Region Switcher Reactivity', () => {
    it('should update page content when switching region release', async () => {
        const mockDataUS = {
            url: new URL('http://localhost/title/0100A3D000196000'),
            game: {
                id: '0100A3D000196000',
                groupId: 'G1',
                names: ['Game US'],
                regions: ['US', 'JP'],
                allTitlesInGroup: [
                    { id: '0100A3D000196000', names: ['Game US'], regions: ['US'] },
                    { id: '0100A3D000196001', names: ['Game JP'], regions: ['JP'] }
                ],
                performanceHistory: [],
                allContributors: []
            },
            preferredRegion: 'US'
        }

        const mockDataJP = {
            url: new URL('http://localhost/title/0100A3D000196001'),
            game: {
                id: '0100A3D000196001',
                groupId: 'G1',
                names: ['Game JP'],
                regions: ['US', 'JP'],
                allTitlesInGroup: [
                    { id: '0100A3D000196000', names: ['Game US'], regions: ['US'] },
                    { id: '0100A3D000196001', names: ['Game JP'], regions: ['JP'] }
                ],
                performanceHistory: [],
                allContributors: []
            },
            preferredRegion: 'JP'
        }

        const { rerender, getAllByText, queryAllByText } = render(Page, { props: { data: mockDataUS } })
        
        expect(getAllByText('Game US').length).toBeGreaterThan(0)
        
        await rerender({ data: mockDataJP })
        
        await new Promise(resolve => setTimeout(resolve, 100))
        
        expect(queryAllByText('Game US').length).toBe(0)
        expect(getAllByText('Game JP').length).toBeGreaterThan(0)
    })
})
