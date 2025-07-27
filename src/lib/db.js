import { openDB } from 'idb'

const DB_NAME = 'title-db-cache'
const DB_VERSION = 5
const INDEX_STORE_NAME = 'title-index'
const FULL_INDEX_STORE_NAME = 'full-title-index'
const DETAILS_STORE_NAME = 'title-details'
const FAVORITES_STORE_NAME = 'favorites-store'
const DRAFTS_STORE_NAME = 'performance-drafts'

const INDEX_CACHE_TTL = 1000 * 60 * 60 * 24 // 1 day
const DETAILS_CACHE_TTL = 1000 * 60 * 60 * 24 * 7 // 7 days

async function getDB () {
  return await openDB(DB_NAME, DB_VERSION, {
    upgrade (db, oldVersion) {
      if (!db.objectStoreNames.contains(INDEX_STORE_NAME)) {
        db.createObjectStore(INDEX_STORE_NAME)
      }
      if (!db.objectStoreNames.contains(DETAILS_STORE_NAME)) {
        db.createObjectStore(DETAILS_STORE_NAME, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(FULL_INDEX_STORE_NAME)) {
        db.createObjectStore(FULL_INDEX_STORE_NAME)
      }
      if (!db.objectStoreNames.contains(FAVORITES_STORE_NAME)) {
        db.createObjectStore(FAVORITES_STORE_NAME)
      }
      if (!db.objectStoreNames.contains(DRAFTS_STORE_NAME)) {
        db.createObjectStore(DRAFTS_STORE_NAME) 
      }
    }
  })
}

export async function getCachedIndex () {
  const db = await getDB()
  const cached = await db.get(INDEX_STORE_NAME, 'main')
  if (!cached) return null
    const isStale = Date.now() - cached.timestamp > INDEX_CACHE_TTL
    return isStale ? null : cached.data
}
export async function setCachedIndex (data) {
  const db = await getDB()
  return db.put(INDEX_STORE_NAME, { timestamp: Date.now(), data }, 'main')
}
export async function getCachedFullIndex () {
  const db = await getDB()
  const cached = await db.get(FULL_INDEX_STORE_NAME, 'full')
  if (!cached) return null
    return cached.data
}
export async function setCachedFullIndex (data) {
  const db = await getDB()
  return db.put(FULL_INDEX_STORE_NAME, { timestamp: Date.now(), data }, 'full')
}
export async function getCachedTitleDetail (id) {
  const db = await getDB()
  const cached = await db.get(DETAILS_STORE_NAME, id)
  if (!cached) return null
    const isStale = Date.now() - cached.timestamp > DETAILS_CACHE_TTL
    return isStale ? null : cached.data
}
export async function setCachedTitleDetail (id, data) {
  const db = await getDB()
  const record = { id, timestamp: Date.now(), data }
  return db.put(DETAILS_STORE_NAME, record)
}

/**
 * Retrieves all favorited title IDs from the database.
 * @returns {Promise<Set<string>>} A Set of the favorited IDs.
 */
export async function getFavorites () {
  const db = await getDB()
  const keys = await db.getAllKeys(FAVORITES_STORE_NAME)
  return new Set(keys)
}

/**
 * Toggles a title's favorite status in the database.
 * Adds the ID if it doesn't exist, removes it if it does.
 * @param {string} id The title ID to toggle.
 */
export async function toggleFavorite (id) {
  const db = await getDB()
  const tx = db.transaction(FAVORITES_STORE_NAME, 'readwrite')
  const store = tx.objectStore(FAVORITES_STORE_NAME)
  const existing = await store.get(id)

  if (existing) {
    await store.delete(id)
  } else {
    await store.put(true, id)
  }

  await tx.done
}

/**
 * Saves a performance data draft to the database.
 * @param {string} id The title ID.
 * @param {string} name The Game name
 * @param {object} data The performance data object.
 */
export async function saveDraft (id, name, data) {
  const db = await getDB()
  return db.put(DRAFTS_STORE_NAME, data, name, id,)
}

/**
 * Retrieves a performance data draft from the database.
 * @param {string} id The title ID.
 * @returns {Promise<object|undefined>} The draft data or undefined if not found.
 */
export async function getDraft (id) {
  const db = await getDB()
  return db.get(DRAFTS_STORE_NAME, id)
}

/**
 * Deletes a performance data draft from the database.
 * @param {string} id The title ID.
 */
export async function deleteDraft (id) {
  const db = await getDB()
  return db.delete(DRAFTS_STORE_NAME, id)
}

/**
 * Retrieves all saved drafts.
 * @returns {Promise<Array<{id: string, data: object}>>} An array of all drafts.
 */
export async function getAllDrafts () {
  const db = await getDB()
  const keys = await db.getAllKeys(DRAFTS_STORE_NAME)
  const values = await db.getAll(DRAFTS_STORE_NAME)
  return keys.map((key, index) => ({ id: key, data: values[index] }))
}