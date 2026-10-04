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

function createPreferencesStore () {
	const initialRegion = browser
		? (localStorage.getItem('preferred_region') || 'US')
		: 'US'

	const initialAdaptiveTheme = browser
		? (localStorage.getItem('adaptive_theme') !== 'false')
		: true

	// Off by default: a title ID is specialist data, and giving it a line on
	// every card put it on equal footing with the game's name for the many
	// people who never need it. Those who do can turn it on in the view menu
	const initialShowTitleIds = browser
		? (localStorage.getItem('show_title_ids') === 'true')
		: false

	const initialHighResImages = browser
		? (localStorage.getItem('high_res_images') === 'true')
		: false

	const initialFavoriteColor = browser
		? (localStorage.getItem('favorite_color') || '#3b82f6')
		: '#3b82f6'

	/** @type {'system' | 'reduced' | 'full'} */
	const initialMotion = browser
		? (['system', 'reduced', 'full'].includes(localStorage.getItem('motion') ?? '') ? /** @type {any} */ (localStorage.getItem('motion')) : 'system')
		: 'system'

	/** @type {'flat' | 'angled' | 'sway' | 'float'} */
	const initialCartridgeStyle = browser
		? (['flat', 'angled', 'sway', 'float'].includes(localStorage.getItem('cartridge_style') ?? '') ? /** @type {any} */ (localStorage.getItem('cartridge_style')) : 'flat')
		: 'flat'

	/** @type {'auto' | 'off'} */
	// How a game opens from the cartridge view: the card slides into a slot (the
	// default), the cartridge flies to its place on the page, or both
	const storedOpen = browser ? localStorage.getItem('open_style') : null
	const initialOpenStyle = storedOpen === 'fly' || storedOpen === 'both' ? storedOpen : 'slot'

	const initialSeasonal = browser && localStorage.getItem('seasonal') === 'off' ? 'off' : 'auto'

	// Off until asked for: it reads the phone's sensors and keeps the screen busy
	const initialGridTilt = browser && localStorage.getItem('grid_tilt') === 'true'

	// null: use the guess for this device. A number: what the visitor calibrated, in
	// CSS pixels per millimetre (see $lib/realSize)
	const storedMm = browser ? Number(localStorage.getItem('px_per_mm')) : 0
	const initialPxPerMm = Number.isFinite(storedMm) && storedMm > 0 ? storedMm : null

	const { subscribe, update } = writable({
		pxPerMm: initialPxPerMm,
		openStyle: initialOpenStyle,
		gridTilt: initialGridTilt,
		seasonal: initialSeasonal,
		motion: initialMotion,
		cartridgeStyle: initialCartridgeStyle,
		region: initialRegion,
		adaptiveTheme: initialAdaptiveTheme,
		highResImages: initialHighResImages,
		showTitleIds: initialShowTitleIds,
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
		 * Shows or hides title IDs on cards
		 * @param {boolean} enabled
		 */
		setShowTitleIds: (enabled) => {
			if (!browser) return

			update(state => {
				const newState = { ...state, showTitleIds: enabled }
				localStorage.setItem('show_title_ids', enabled.toString())
				return newState
			})
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
		 * How much the site moves: follow the device, or force less or full
		 * @param {'system' | 'reduced' | 'full'} motion
		 */
		setMotion: (motion) => {
			if (!browser) return

			update(state => {
				localStorage.setItem('motion', motion)
				return { ...state, motion }
			})
		},
		/**
		 * Calibrates how big a real-size cartridge is drawn. null goes back to the
		 * guess for this device
		 * @param {number | null} pxPerMm CSS pixels per millimetre
		 */
		setPxPerMm: (pxPerMm) => {
			if (!browser) return

			update(state => {
				if (pxPerMm === null) localStorage.removeItem('px_per_mm')
				else localStorage.setItem('px_per_mm', String(pxPerMm))
				return { ...state, pxPerMm }
			})
		},
		/**
		 * Tilting the phone turns the cartridges in the cartridge view
		 * @param {boolean} enabled
		 */
		setGridTilt: (enabled) => {
			if (!browser) return

			update(state => {
				localStorage.setItem('grid_tilt', enabled.toString())
				return { ...state, gridTilt: enabled }
			})
		},
		/**
		 * How opening a game looks from the cartridge view
		 * @param {'slot' | 'fly' | 'both'} openStyle
		 */
		setOpenStyle: (openStyle) => {
			if (!browser) return

			update(state => {
				localStorage.setItem('open_style', openStyle)
				return { ...state, openStyle }
			})
		},
		/**
		 * Seasonal effects: follow the calendar, or never
		 * @param {'auto' | 'off'} seasonal
		 */
		setSeasonal: (seasonal) => {
			if (!browser) return

			update(state => {
				localStorage.setItem('seasonal', seasonal)
				return { ...state, seasonal }
			})
		},
		/**
		 * How the cartridges are shown in the cartridge view
		 * @param {'flat' | 'angled' | 'sway' | 'float'} style
		 */
		setCartridgeStyle: (style) => {
			if (!browser) return

			update(state => {
				localStorage.setItem('cartridge_style', style)
				return { ...state, cartridgeStyle: style }
			})
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

/**
 * Whether motion should be kept to a minimum: the visitor said so, or their
 * device did and they have not said otherwise
 * @param {{ motion?: 'system' | 'reduced' | 'full' }} prefs
 * @returns {boolean}
 */
export function isReducedMotion (prefs) {
	if (!browser) return false
	if (prefs.motion === 'reduced') return true
	if (prefs.motion === 'full') return false
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
