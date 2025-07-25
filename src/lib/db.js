import { openDB } from 'idb'

const DB_NAME = 'title-db-cache'
const DB_VERSION = 2
const INDEX_STORE_NAME = 'title-index'
const FULL_INDEX_STORE_NAME = 'full-title-index'
const DETAILS_STORE_NAME = 'title-details'

const INDEX_CACHE_TTL = 1000 * 60 * 60 * 24 // 1 day
const DETAILS_CACHE_TTL = 1000 * 60 * 60 * 24 * 7 // 7 days

async function getDB () {
  return await openDB(DB_NAME, DB_VERSION, {
    upgrade (db) {
      if (!db.objectStoreNames.contains(INDEX_STORE_NAME)) {
        db.createObjectStore(INDEX_STORE_NAME)
      }
      if (!db.objectStoreNames.contains(DETAILS_STORE_NAME)) {
        db.createObjectStore(DETAILS_STORE_NAME, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(FULL_INDEX_STORE_NAME)) {
        db.createObjectStore(FULL_INDEX_STORE_NAME)
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