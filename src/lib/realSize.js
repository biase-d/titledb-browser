/**
 * Making a cartridge the size of a real one on screen
 *
 * A browser cannot read a screen's physical size, and a CSS millimetre is only
 * 96 pixels per inch by definition, so "21 mm" is drawn smaller than 21 mm on
 * most laptops (a Retina MacBook shows roughly 125 CSS pixels per inch) and
 * larger on a few. Two things fix it: a guess from the device, here, and a
 * calibration the visitor can do in Settings, which wins
 *
 * All sizes are in CSS pixels per millimetre
 */

/** What the CSS spec says: 96 pixels to 25.4 mm */
export const CSS_PX_PER_MM = 96 / 25.4

export const MIN_PX_PER_MM = 2.5
export const MAX_PX_PER_MM = 9

/** The cartridge itself, in millimetres, and a bank card to hold against the screen */
export const CARTRIDGE_MM = { width: 21, height: 31, depth: 3 }
export const CARD_MM = { width: 85.6, height: 53.98 }

/** An unrecognised high-density screen: about 4.6, raised by 1.3 after comparing with a real cartridge */
const UNKNOWN_DENSE_PX_PER_MM = 4.6 * 1.3

/** @param {number} n */
export const clampPxPerMm = (n) => Math.min(MAX_PX_PER_MM, Math.max(MIN_PX_PER_MM, n))

/**
 * Known screens, by their default size in CSS pixels (long side x short side):
 * the panel's own pixels per inch. CSS pixels per mm = ppi / pixel ratio / 25.4
 * @type {Record<string, number>}
 */
const SCREENS = {
	// MacBook Pro 14" and 16"
	'1512x982': 254, '1728x1117': 254,
	// MacBook Air 13" and 15" (M2 and later)
	'1470x956': 224, '1710x1107': 224,
	// MacBook Air / Pro 13" (the older Retina ones)
	'1440x900': 227, '1280x800': 227,
	// iMac 24"
	'2240x1260': 218,
	// iPad: Pro 12.9", Pro 11" / Air, 10.2", mini
	'1366x1024': 264, '1194x834': 264, '1180x820': 264, '1133x744': 326
}

/**
 * A guess at CSS pixels per millimetre for this device
 *
 * @param {{ width: number, height: number, dpr: number, ua?: string, touch?: boolean }} screen CSS pixels, as the browser reports them
 * @returns {number}
 */
export function guessPxPerMm ({ width, height, dpr, ua = '', touch = false }) {
	const long = Math.max(width, height)
	const short = Math.min(width, height)

	const ppi = SCREENS[`${long}x${short}`]
	if (ppi && dpr >= 2) return clampPxPerMm(ppi / dpr / 25.4)

	// Phones and tablets size CSS pixels to the hand, not to 96: about 160 per inch on
	// Android, 150-160 on an iPhone, 132 on an iPad
	if (/android/i.test(ua) && touch) return 160 / 25.4
	if (/iphone/i.test(ua)) return 154 / 25.4
	if (/ipad/i.test(ua)) return 132 / 25.4

	// A high-density laptop or monitor we do not recognise: these sit around 110-125
	// CSS pixels per inch, which would make it 4.6 px to the mm, but at that the
	// cartridge looked too small on a real one, so it is raised by a third. A
	// standard-density screen is close to 96 already
	if (dpr >= 2) return clampPxPerMm(UNKNOWN_DENSE_PX_PER_MM)
	return CSS_PX_PER_MM
}
