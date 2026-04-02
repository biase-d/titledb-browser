import { Vibrant } from 'node-vibrant/browser'

/**
 * Extracts a dominant color using node-vibrant for better UI palettes
 * @param {string} imageUrl
 * @returns {Promise<{ primary: string, accent: string, overlay: string } | null>}
 */
export async function extractTheme(imageUrl) {
	if (typeof window === 'undefined') return null
	if (!imageUrl) return null

	// Bypass CORS for external assets
	let proxyUrl = imageUrl
	if (imageUrl.includes('nintendo.net') || imageUrl.includes('githubusercontent.com')) {
		proxyUrl = `/api/v1/proxy/image?url=${encodeURIComponent(imageUrl)}`
	}

	try {
		const img = new Image()
		img.crossOrigin = 'Anonymous'
		img.src = proxyUrl

		await new Promise((resolve, reject) => {
			img.onload = resolve
			img.onerror = () => reject(new Error('Image failed to load'))
		})

		const palette = await Vibrant.from(img).getPalette()
		const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches

		let swatch = isDarkMode 
			? (palette.Vibrant || palette.Muted) 
			: (palette.DarkVibrant || palette.Vibrant || palette.Muted)

		// Fallback if Vibrant fails to find any usable colors
		if (!swatch) {
			console.warn('[ThemeEngine] node-vibrant found no swatches, using fallback')
			return {
				primary: 'var(--color-primary-dark)',
				accent: 'rgba(128, 128, 128, 0.1)',
				overlay: 'rgba(0, 0, 0, 0.6)'
			}
		}

		const [r, g, b] = swatch.rgb.map(Math.floor)

		let primary = `rgb(${r}, ${g}, ${b})`
		let accent = `rgba(${r}, ${g}, ${b}, 0.15)`
		let overlay = `rgba(${Math.floor(r * 0.1)}, ${Math.floor(g * 0.1)}, ${Math.floor(b * 0.1)}, 0.7)`

		if (!isDarkMode) {
			accent = `rgba(${r}, ${g}, ${b}, 0.12)`
			overlay = 'rgba(255, 255, 255, 0.85)'
		}

		return { primary, accent, overlay }

	} catch (e) {
		console.error('[ThemeEngine] node-vibrant extraction failed:', e)
		return null
	}
}