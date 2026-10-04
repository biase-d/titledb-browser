import { describe, it, expect } from 'vitest'
import { tiltToRotation, wrap180 } from '../src/lib/sensors.js'

describe('wrap180', () => {
	it('brings angles into -180..180', () => {
		expect(wrap180(190)).toBe(-170)
		expect(wrap180(-190)).toBe(170)
		expect(wrap180(0)).toBe(0)
		expect(wrap180(360)).toBe(0)
	})
})

describe('tiltToRotation', () => {
	const base = { beta: 45, gamma: 0 }

	it('is level when the phone has not moved', () => {
		const t = tiltToRotation(base, { beta: 45, gamma: 0 })
		expect(Math.abs(t.yaw)).toBe(0)
		expect(Math.abs(t.pitch)).toBe(0)
	})

	it('turns with a tilt to one side and the other way for the other side', () => {
		const right = tiltToRotation(base, { beta: 45, gamma: 20 })
		const left = tiltToRotation(base, { beta: 45, gamma: -20 })
		expect(right.yaw).toBeGreaterThan(0)
		expect(left.yaw).toBeLessThan(0)
		expect(Math.abs(right.yaw)).toBeCloseTo(Math.abs(left.yaw))
	})

	it('pitches with the top edge tilting toward or away', () => {
		expect(tiltToRotation(base, { beta: 65, gamma: 0 }).pitch).toBeGreaterThan(0)
		expect(tiltToRotation(base, { beta: 25, gamma: 0 }).pitch).toBeLessThan(0)
	})

	it('is relative to where it began, not to flat', () => {
		const a = tiltToRotation({ beta: 10, gamma: 5 }, { beta: 20, gamma: 5 })
		const b = tiltToRotation({ beta: 70, gamma: 5 }, { beta: 80, gamma: 5 })
		expect(a.pitch).toBeCloseTo(b.pitch)
	})

	it('does not jump when the angle wraps through 180', () => {
		// 175 to -175 is a 10 degree move, not a 350 degree one
		const t = tiltToRotation({ beta: 175, gamma: 0 }, { beta: -175, gamma: 0 })
		expect(t.pitch).toBeCloseTo((10 * Math.PI / 180) * 1.2)
	})

	it('is limited, so a big swing cannot flip the card over', () => {
		const t = tiltToRotation(base, { beta: 45, gamma: 90 })
		expect(Math.abs(t.yaw)).toBeLessThanOrEqual(1.4)
		const p = tiltToRotation({ beta: 0, gamma: 0 }, { beta: 170, gamma: 0 })
		expect(Math.abs(p.pitch)).toBeLessThanOrEqual(0.9)
	})

	it('swaps the axes when the screen is turned sideways', () => {
		const portrait = tiltToRotation(base, { beta: 45, gamma: 20 }, 0)
		const landscape = tiltToRotation(base, { beta: 45, gamma: 20 }, 90)
		expect(Math.abs(portrait.yaw)).toBeGreaterThan(0)
		expect(Math.abs(landscape.yaw)).toBe(0)
		expect(Math.abs(landscape.pitch)).toBeGreaterThan(0)
	})
})
