import { openDB } from 'idb'

const DB_NAME = 'titledb'
const DB_VERSION = 6
const FAVORITES_STORE_NAME = 'favorites-store'
const DRAFTS_STORE_NAME = 'performance-drafts'

async function getDB () {
  return await openDB(DB_NAME, DB_VERSION, {
    upgrade (db, oldVersion) {
      if (!db.objectStoreNames.contains(FAVORITES_STORE_NAME)) {
        db.createObjectStore(FAVORITES_STORE_NAME)
      }
      if (!db.objectStoreNames.contains(DRAFTS_STORE_NAME)) {
        db.createObjectStore(DRAFTS_STORE_NAME) 
      }
    }
  })
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
 * @param {object} data The performance data object.
 */
export async function saveDraft (id, data) {
  const db = await getDB()
  return await db.put(DRAFTS_STORE_NAME, data, id)
}

/**
 * Retrieves a performance data draft from the database.
 * @param {string} id The title ID.
 * @returns {Promise<object|undefined>} The draft data or undefined if not found.
 */
export async function getDraft (id) {
  const db = await getDB()
  return await db.get(DRAFTS_STORE_NAME, id)
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