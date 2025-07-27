import { writable } from 'svelte/store'
import { browser } from '$app/environment'
import { getFavorites, toggleFavorite, getAllDrafts, deleteDraft } from '$lib/db.js'

export const favorites = createFavoritesStore()
export const draftsStore = createDraftsStore()

function createFavoritesStore() {
    const { subscribe, set } = writable(new Set())
    async function init() {
        if (browser) {
            const favoritesFromDB = await getFavorites()
            set(favoritesFromDB)
        }
    }
    init()
    async function toggle(id) {
        await toggleFavorite(id)
        await init()
    }
    return { subscribe, toggle }
}

function createDraftsStore() {
    const { subscribe, set, update } = writable([])

    async function init() {
        if (browser) {
            const draftsFromDB = await getAllDrafts()
            set(draftsFromDB)
        }
    }

    init()

    return {
        subscribe,
        save: async (id, name, data) => {
            await saveDraft(id, name, data)
            await init()
        },
        delete: async (id) => {
            await deleteDraft(id)
            await init()
        }
    }
}
