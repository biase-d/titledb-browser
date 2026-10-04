import { describe, it, expect } from 'vitest'
import { graphicsAsTargets } from '../src/lib/graphicsPerformance.js'

describe('graphicsAsTargets', () => {
	const settings = {
		docked: { framerate: { lockType: 'Custom', targetFps: 30 }, resolution: { resolutionType: 'Fixed', fixedResolution: '1920x1080' } },
		handheld: { framerate: { lockType: 'Custom', targetFps: 30 }, resolution: { resolutionType: 'Fixed', fixedResolution: '1280x720' } }
	}

	it('turns graphics settings into frame rate and resolution targets', () => {
		const t = graphicsAsTargets(settings)
		expect(t?.docked.target_fps).toBe(30)
		expect(t?.docked.resolution).toBe('1920x1080')
		expect(t?.handheld.resolution).toBe('1280x720')
	})

	it('does not present a guessed stability rating as if it were measured', () => {
		expect(graphicsAsTargets(settings)?.docked.fps_behavior).toBeUndefined()
	})

	it('reports Unlocked rather than a stale target', () => {
		expect(graphicsAsTargets({ docked: { framerate: { lockType: 'Unlocked', targetFps: 30 } } })?.docked.target_fps).toBe('Unlocked')
	})

	it('is null when the settings name no frame rate or resolution', () => {
		expect(graphicsAsTargets({})).toBeNull()
		expect(graphicsAsTargets(null)).toBeNull()
		expect(graphicsAsTargets({ docked: { framerate: { lockType: 'API' } } })).toBeNull()
	})

	it('keeps a mode that has values when the other has none', () => {
		const t = graphicsAsTargets({ docked: { framerate: { lockType: 'Custom', targetFps: 60 } } })
		expect(t?.docked.target_fps).toBe(60)
		expect(t?.handheld).toBeNull()
	})
})
