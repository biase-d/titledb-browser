import { writable } from 'svelte/store'

// lightweight main.json { id: [names] }
export const titleIndex = writable({})

// Rich full_index.json for filtering [{id, names, publisher,...}]
// It starts empty. Its length will determine if filters are active.
export const fullTitleIndex = writable([])