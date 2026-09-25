import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/svelte'

/**
 * The "updating game data" notice moved out of the footer, where it sat below
 * the fold and almost nobody saw it, into the announcement banner at the top of
 * the page. These cover what that move has to get right: it appears while a
 * build is running, it says the phase in words rather than the internal name,
 * and it steps aside when no build is running
 */
const status = { current: /** @type {any} */ (null), refresh: vi.fn() }

vi.mock('$app/environment', () => ({ browser: true, dev: false, building: false, version: 'test' }))
vi.mock('$lib/remote/status.remote.js', () => ({ getSystemStatus: () => status }))
vi.mock('$lib/services/versionService', () => ({ getVersionInfo: () => ({ announcements: [] }) }))

const AnnouncementBanner = (await import('../src/lib/components/AnnouncementBanner.svelte')).default

describe('Build notice', () => {
	beforeEach(() => {
		status.current = null
		localStorage.clear()
	})

	it('shows while the pipeline is running', () => {
		status.current = { isBuilding: true, buildPhase: 'building-maps', databaseHealthy: true }
		const { container } = render(AnnouncementBanner)
		expect(container.textContent).toContain('New game data is being published')
	})

	it('says the phase in words, not the internal name', () => {
		status.current = { isBuilding: true, buildPhase: 'building-maps', databaseHealthy: true }
		const { container } = render(AnnouncementBanner)
		expect(container.textContent).toContain('working out who contributed what')
		expect(container.textContent).not.toContain('building-maps')
	})

	it('still reads sensibly for a phase it has no wording for', () => {
		status.current = { isBuilding: true, buildPhase: 'some-new-phase', databaseHealthy: true }
		const { container } = render(AnnouncementBanner)
		expect(container.textContent).toContain('New game data is being published')
		expect(container.textContent).not.toContain('some-new-phase')
	})

	it('shows nothing when no build is running', () => {
		status.current = { isBuilding: false, buildPhase: null, databaseHealthy: true }
		const { container } = render(AnnouncementBanner)
		expect(container.textContent).not.toContain('New game data is being published')
	})

	it('shows nothing before the status query has resolved', () => {
		status.current = null
		const { container } = render(AnnouncementBanner)
		expect(container.textContent).not.toContain('New game data is being published')
	})
})
