import { writable } from 'svelte/store'
import { browser } from '$app/environment'
import { invalidateAll } from '$app/navigation'

export const COUNTRY_GROUPS = [
	{
		label: 'The Americas',
		options: [
			{ id: 'US', label: 'United States' },
			{ id: 'CA', label: 'Canada' },
			{ id: 'MX', label: 'Mexico' },
			{ id: 'BR', label: 'Brazil' },
			{ id: 'AR', label: 'Argentina' },
			{ id: 'CL', label: 'Chile' },
			{ id: 'CO', label: 'Colombia' },
			{ id: 'PE', label: 'Peru' }
		]
	},
	{
		label: 'Asia',
		options: [
			{ id: 'JP', label: 'Japan' },
			{ id: 'KR', label: 'Korea' },
			{ id: 'HK', label: 'Hong Kong' },
			{ id: 'TW', label: 'Taiwan' },
			{ id: 'CN', label: 'China' },
			{ id: 'SG', label: 'Singapore' },
			{ id: 'MY', label: 'Malaysia' },
			{ id: 'TH', label: 'Thailand' }
		]
	},
	{
		label: 'Oceania',
		options: [
			{ id: 'AU', label: 'Australia' },
			{ id: 'NZ', label: 'New Zealand' }
		]
	},
	{
		label: 'Europe',
		options: [
			{ id: 'GB', label: 'United Kingdom' },
			{ id: 'FR', label: 'France' },
			{ id: 'DE', label: 'Germany' },
			{ id: 'IT', label: 'Italy' },
			{ id: 'ES', label: 'Spain' },
			{ id: 'NL', label: 'Netherlands' },
			{ id: 'PT', label: 'Portugal' },
			{ id: 'RU', label: 'Russia' },
			{ id: 'SE', label: 'Sweden' },
			{ id: 'NO', label: 'Norway' },
			{ id: 'DK', label: 'Denmark' },
			{ id: 'FI', label: 'Finland' },
			{ id: 'PL', label: 'Poland' }
		]
	},
	{
		label: 'Africa',
		options: [
			{ id: 'ZA', label: 'South Africa' }
		]
	}
]

function createPreferencesStore() {
	const initialRegion = browser
		? (localStorage.getItem('preferred_region') || 'US')
		: 'US'

	const initialAdaptiveTheme = browser
		? (localStorage.getItem('adaptive_theme') !== 'false')
		: true

	const initialBetaFlow = browser
		? (localStorage.getItem('beta_flow') === 'true')
		: false

	const initialHighResImages = browser
		? (localStorage.getItem('high_res_images') === 'true')
		: false

	const initialFavoriteColor = browser
		? (localStorage.getItem('favorite_color') || '#3b82f6')
		: '#3b82f6'

	const { subscribe, update } = writable({
		region: initialRegion,
		adaptiveTheme: initialAdaptiveTheme,
		betaFlow: initialBetaFlow,
		highResImages: initialHighResImages,
		favoriteColor: initialFavoriteColor
	})

	return {
		subscribe,
		/**
		 * Updates the region preference
		 * @param {string} regionCode - The 2-letter country code (e.g., 'JP')
		 */
		setRegion: (regionCode) => {
			if (!browser) return

			update(state => {
				const newState = { ...state, region: regionCode }
				localStorage.setItem('preferred_region', regionCode)
				document.cookie = `preferred_region=${regionCode}; path=/; max-age=31536000; SameSite=Lax`
				return newState
			})
			invalidateAll()
		},
		/**
		 * Toggles the adaptive theme preference
		 * @param {boolean} enabled
		 */
		setAdaptiveTheme: (enabled) => {
			if (!browser) return

			update(state => {
				const newState = { ...state, adaptiveTheme: enabled }
				localStorage.setItem('adaptive_theme', enabled.toString())
				document.cookie = `adaptive_theme=${enabled}; path=/; max-age=31536000; SameSite=Lax`
				return newState
			})
		},
		/**
		 * Toggles the beta contribution flow preference
		 * @param {boolean} enabled
		 */
		setBetaFlow: (enabled) => {
			if (!browser) return

			update(state => {
				const newState = { ...state, betaFlow: enabled }
				localStorage.setItem('beta_flow', enabled.toString())
				document.cookie = `beta_flow=${enabled}; path=/; max-age=31536000; SameSite=Lax`
				return newState
			})
			invalidateAll()
		},
		/**
		 * Toggles the high resolution images preference
		 * @param {boolean} enabled
		 */
		setHighResImages: (enabled) => {
			if (!browser) return

			update(state => {
				const newState = { ...state, highResImages: enabled }
				localStorage.setItem('high_res_images', enabled.toString())
				document.cookie = `high_res_images=${enabled}; path=/; max-age=31536000; SameSite=Lax`
				return newState
			})
			invalidateAll()
		},
		/**
		 * Updates the favorite color preference
		 * @param {string} color - Hex color code
		 */
		setFavoriteColor: (color) => {
			if (!browser) return

			update(state => {
				const newState = { ...state, favoriteColor: color }
				localStorage.setItem('favorite_color', color)
				document.cookie = `favorite_color=${color}; path=/; max-age=31536000; SameSite=Lax`
				return newState
			})
		}
	}
}

export const preferences = createPreferencesStore()
