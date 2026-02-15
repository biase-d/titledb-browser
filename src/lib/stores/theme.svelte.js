import { extractTheme } from '../utils/theme'

class ThemeStore {
	/**
     * @type {{ primary: string, accent: string, overlay: string } | null}
     */
	colors = $state(null)
	/**
     * @type {string | null}
     */
	backgroundImage = $state(null)
	isActive = $state(false)
	/** @type {string | null} */
	lastColorSource = null
	/** @type {string | null} */
	lastBackgroundUrl = null

	constructor () {
		if (typeof window !== 'undefined') {
			window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
				if (this.isActive && this.lastColorSource) {
					console.log('[ThemeStore] System theme changed, refreshing theme')
					this.setTheme(this.lastColorSource, this.lastBackgroundUrl)
				}
			})
		}
	}

	/**
     * @param {string | null} colorSource
     * @param {string | null} [backgroundUrl]
     */
	async setTheme (colorSource, backgroundUrl) {
		console.log('[ThemeStore] Setting theme for:', colorSource)
		this.lastColorSource = colorSource
		this.lastBackgroundUrl = backgroundUrl || null

		if (!colorSource) {
			this.clearTheme()
			return
		}

		const theme = await extractTheme(colorSource)
		if (theme) {
			console.log('[ThemeStore] Theme extracted and applying:', theme)
			this.colors = theme
			this.backgroundImage = backgroundUrl || colorSource
			this.isActive = true
		} else {
			console.warn('[ThemeStore] Failed to extract theme')
		}
	}

	clearTheme () {
		console.log('[ThemeStore] Clearing theme')
		this.colors = null
		this.backgroundImage = null
		this.isActive = false
		this.lastColorSource = null
		this.lastBackgroundUrl = null
	}
}

export const themeStore = new ThemeStore()
