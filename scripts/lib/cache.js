import fs from 'node:fs/promises';
import path from 'node:path';

const CACHE_DIR = '.cache';
const CONTRIBUTOR_MAP_CACHE = path.join(CACHE_DIR, 'contributorMap.json');
const METADATA_CACHE = path.join(CACHE_DIR, 'metadata.json');
const DATE_MAP_CACHE = path.join(CACHE_DIR, 'dateMap.json');

/**
 * Loads cached data if available and valid
 * @param {boolean} useCache - Whether to attempt loading from cache
 * @returns {Promise<{cachedMap: object|null, cachedMetadata: object|null, cachedDateMap: object|null}>}
 */
export async function loadCache(useCache) {
  if (!useCache) {
    return { cachedMap: null, cachedMetadata: null, cachedDateMap: null };
  }

  try {
    const [cachedMap, cachedMetadata, cachedDateMapJson] = await Promise.all([
      fs.readFile(CONTRIBUTOR_MAP_CACHE, 'utf-8').then(JSON.parse).catch(() => null),
      fs.readFile(METADATA_CACHE, 'utf-8').then(JSON.parse).catch(() => null),
      fs.readFile(DATE_MAP_CACHE, 'utf-8').then(JSON.parse).catch(() => null),
    ]);

    if (!cachedMap || !cachedMetadata || !cachedDateMapJson) {
      console.log('One or more cache files are missing. A full rebuild will be performed');
      return { cachedMap: null, cachedMetadata: null, cachedDateMap: null };
    }
    
    // Revive dates from the date map JSON
    const cachedDateMap = {};
    for (const type in cachedDateMapJson) {
      cachedDateMap[type] = {};
      for (const key in cachedDateMapJson[type]) {
        cachedDateMap[type][key] = new Date(cachedDateMapJson[type][key]);
      }
    }

    console.log('Successfully loaded all data from cache');
    return { cachedMap, cachedMetadata, cachedDateMap };

  } catch (error) {
    console.warn('Failed to load cache:', error.message);
    return { cachedMap: null, cachedMetadata: null, cachedDateMap: null };
  }
}

/**
 * Saves all computed data to the cache
 * @param {object} contributorMap - The contributor map to save
 * @param {object} metadata - The metadata to save
 * @param {object} dateMap - The date map to save   
 */
export async function saveCache(contributorMap, metadata, dateMap) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await Promise.all([
      fs.writeFile(CONTRIBUTOR_MAP_CACHE, JSON.stringify(contributorMap, null, 2)),
      fs.writeFile(METADATA_CACHE, JSON.stringify(metadata, null, 2)),
      fs.writeFile(DATE_MAP_CACHE, JSON.stringify(dateMap)),
    ]);
    console.log('All maps and metadata have been saved to cache');
  } catch (error) {
    console.error('Failed to save cache:', error.message);
  }
}