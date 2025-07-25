import { writable } from 'svelte/store'
import { browser } from '$app/environment'
import { getFavorites, toggleFavorite } from '$lib/db.js'

export const titleIndex = writable({})
export const fullTitleIndex = writable([])
export const favorites = createFavoritesStore()

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