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

import { render } from '@testing-library/svelte'
import Page from '../src/routes/title/[id]/+page.svelte'

describe('OG Image Cache Invalidation', () => {
    it('should include a cache-busting query parameter in og:image meta tag', () => {
        const mockData = {
            url: new URL('http://localhost/title/0100A3D000196000'),
            game: {
                id: '0100A3D000196000',
                names: ['Test Game'],
                regions: ['US'],
                lastUpdated: new Date('2024-01-01T00:00:00Z'),
                performanceHistory: [],
                allContributors: []
            },
            preferredRegion: 'US'
        }

        render(Page, { props: { data: mockData } })
        
        const ogImage = document.querySelector('meta[property="og:image"]')
        expect(ogImage).not.toBeNull()
        const content = ogImage.getAttribute('content')
        expect(content).toContain('ts=')
    })
})
