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
    toggle: (id) => {
      update(currentFavorites => {
        if (currentFavorites.has(id)) {
          currentFavorites.delete(id)
        } else {
          currentFavorites.add(id)
        }
        updateCookie(currentFavorites)
        goto(window.location.href, { invalidateAll: true })
        return currentFavorites
      })
    },
    set
  }
}

function createDraftsStore () {
  const { subscribe, set } = writable([])

  async function init () {
    if (browser) {
      const draftsFromDB = await getAllDrafts()
      set(draftsFromDB)
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
