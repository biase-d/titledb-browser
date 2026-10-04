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
		this.lastColorSource = colorSource
		this.lastBackgroundUrl = backgroundUrl || null

		if (!colorSource) {
			this.clearTheme()
			return
		}

		const theme = await extractTheme(colorSource)
		if (theme) {
			this.colors = theme
			this.backgroundImage = backgroundUrl || colorSource
			this.isActive = true
		} else {
			console.warn('[ThemeStore] Failed to extract theme')
		}
	}

	clearTheme () {
		this.colors = null
		this.backgroundImage = null
		this.isActive = false
		this.lastColorSource = null
		this.lastBackgroundUrl = null
	}
}

export const themeStore = new ThemeStore()
