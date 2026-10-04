import { writable } from 'svelte/store'
import { browser } from '$app/environment'
import { getAllDrafts, saveDraft, deleteDraft } from '$lib/indexedDB.js'
import { goto } from '$app/navigation'

export const favorites = createFavoritesStore()
export const draftsStore = createDraftsStore()

function createFavoritesStore () {
	const getInitialFavorites = () => {
		if (!browser) return new Set()
		const cookie = document.cookie.split('; ').find(row => row.startsWith('favorites='))
		return cookie ? new Set(JSON.parse(decodeURIComponent(cookie.split('=')[1]))) : new Set()
	}

	const { subscribe, set, update } = writable(getInitialFavorites())

	const updateCookie = (currentFavorites) => {
		if (browser) {
			document.cookie = `favorites=${encodeURIComponent(JSON.stringify(Array.from(currentFavorites)))}; path=/; max-age=31536000; SameSite=Lax`
		}
	}

	return {
		subscribe,
		/**
		 * Stars or un-stars a game. For a signed-in person it is saved to their account
		 * (the endpoint says 401 to anyone else, which is fine: their cookie is all there
		 * is). The page is reloaded only after that is saved, or the reload would read
		 * the account before the change reached it and undo it
		 * @param {string} id
		 */
		toggle: async (id) => {
			/** @type {boolean} */
			let adding = false
			update(current => {
				const next = new Set(current)
				adding = !next.has(id)
				if (adding) next.add(id)
				else next.delete(id)
				updateCookie(next)
				return next
			})
			try {
				await fetch('/api/v1/favorites', {
					method: adding ? 'POST' : 'DELETE',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ gameId: id })
				})
			} catch { /* offline: the cookie has it, and the account will catch up on the next change */ }
			goto(window.location.href, { invalidateAll: true })
		},
		set
	}
}

function createDraftsStore () {
	const { subscribe, set } = writable([])

	async function init () {
		if (!browser) return

		try {
			set(await getAllDrafts())
		} catch (e) {
			// IndexedDB can be unavailable rather than merely empty: private
			// windows, blocked site data, a failed version upgrade. This runs at
			// module load, so a rejection here surfaces as an unhandled rejection
			// on every page view. Drafts are a convenience - degrade to "none"
			console.warn('[drafts] unavailable, continuing without saved drafts:', e)
			set([])
		}
	}

	init()

	return {
		subscribe,
		save: async (id, data) => {
			if (!browser) return
			await saveDraft(id, data)
			await init()
		},
		delete: async (id) => {
			if (!browser) return
			await deleteDraft(id)
			await init()
		}
	}
}
