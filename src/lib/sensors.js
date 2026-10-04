/**
 * Device orientation, for turning a cartridge by tilting the phone
 *
 * The browser fuses the accelerometer and gyroscope into one orientation event.
 * Three things make it less simple than adding a listener:
 *  - iOS asks first, and only from a tap (DeviceOrientationEvent.requestPermission)
 *  - nothing is fired on most desktops, and some phones report null values
 *  - it needs a secure page (https, or localhost)
 */

const RAD = Math.PI / 180

/** Whether this browser has the event at all (a phone may still have no sensor) */
export function sensorsPossible () {
	return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window && window.isSecureContext
}

/** Whether the visitor has to be asked first (iOS 13 and later) */
export function needsPermission () {
	return typeof DeviceOrientationEvent !== 'undefined' &&
		typeof (/** @type {any} */ (DeviceOrientationEvent)).requestPermission === 'function'
}

/**
 * Asks, where asking is needed. Call it from a tap
 * @returns {Promise<'granted' | 'denied' | 'unsupported'>}
 */
export async function requestPermission () {
	if (!sensorsPossible()) return 'unsupported'
	if (!needsPermission()) return 'granted'
	try {
		const answer = await (/** @type {any} */ (DeviceOrientationEvent)).requestPermission()
		return answer === 'granted' ? 'granted' : 'denied'
	} catch {
		return 'denied'
	}
}

/** @param {number} degrees into -180..180 */
export function wrap180 (degrees) {
	return ((((degrees + 180) % 360) + 360) % 360) - 180
}

const clamp = (/** @type {number} */ v, /** @type {number} */ limit) => Math.max(-limit, Math.min(limit, v))

/**
 * How much to turn a card for how far the phone has tilted from where it was
 * when the reading began
 *
 * @param {{ beta: number, gamma: number }} base reading at the start, in degrees
 * @param {{ beta: number, gamma: number }} now the current reading, in degrees
 * @param {number} [screenAngle] 0, 90, 180 or 270: how the screen is turned
 * @returns {{ yaw: number, pitch: number }} radians
 */
export function tiltToRotation (base, now, screenAngle = 0) {
	const dBeta = wrap180(now.beta - base.beta)
	const dGamma = wrap180(now.gamma - base.gamma)

	// beta is the tilt of the top edge toward or away from you and gamma the tilt
	// left or right, both measured against the device, so a turned screen swaps them
	const angle = ((Math.round(screenAngle / 90) * 90) % 360 + 360) % 360
	let side = dGamma
	let front = dBeta
	if (angle === 90) { side = -dBeta; front = dGamma } else if (angle === 180) { side = -dGamma; front = -dBeta } else if (angle === 270) { side = dBeta; front = -dGamma }

	return {
		// Turned a bit more than the phone is, so a small tilt is enough
		// Tilting the right edge down turns the card's face to the right
		yaw: clamp(side * RAD * 1.5, 1.4),
		pitch: clamp(front * RAD * 1.2, 0.9)
	}
}

/**
 * Follows the phone's tilt. The first reading is the starting point, so the card
 * begins level whichever way the phone is held
 *
 * @param {(tilt: { yaw: number, pitch: number }) => void} onTilt
 * @param {() => void} [onUnavailable] nothing arrived: no sensor on this device
 * @returns {() => void} stops following
 */
export function followTilt (onTilt, onUnavailable) {
	/** @type {{ beta: number, gamma: number } | null} */
	let base = null
	let got = false

	const handler = (/** @type {DeviceOrientationEvent} */ e) => {
		if (e.beta === null || e.gamma === null) return
		got = true
		const reading = { beta: e.beta, gamma: e.gamma }
		base ??= reading
		onTilt(tiltToRotation(base, reading, screen.orientation?.angle ?? 0))
	}

	window.addEventListener('deviceorientation', handler)
	const timer = setTimeout(() => { if (!got) onUnavailable?.() }, 900)

	return () => {
		clearTimeout(timer)
		window.removeEventListener('deviceorientation', handler)
	}
}
