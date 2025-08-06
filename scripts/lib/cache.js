import fs from 'node:fs/promises';
import path from 'node:path';

const CACHE_DIR = '.cache';
const CONTRIBUTOR_MAP_CACHE = path.join(CACHE_DIR, 'contributorMap.json');
const METADATA_CACHE = path.join(CACHE_DIR, 'metadata.json');

/**
 * Loads cached contributor and metadata if available.
 * @param {boolean} useCache - Whether to attempt loading from cache.
 * @returns {Promise<{cachedMap: object|null, cachedMetadata: object|null}>}
 */
export async function loadCache(useCache) {
  if (!useCache) {
    return { cachedMap: null, cachedMetadata: null };
  }

  try {
    const [cachedMap, cachedMetadata] = await Promise.all([
      fs.readFile(CONTRIBUTOR_MAP_CACHE, 'utf-8').then(JSON.parse).catch(() => null),
      fs.readFile(METADATA_CACHE, 'utf-8').then(JSON.parse).catch(() => null),
    ]);

    if (!cachedMap || !cachedMetadata) {
      console.log('Contributor map or metadata cache is missing. A full build will be performed.');
      return { cachedMap: null, cachedMetadata: null };
    }
    
    console.log('Successfully loaded contributor map and metadata from cache.');
    return { cachedMap, cachedMetadata };

  } catch (error) {
    console.warn('Failed to load cache:', error.message);
    return { cachedMap: null, cachedMetadata: null };
  }
}

/**
 * Saves contributor map and metadata to the cache.
 * @param {object} contributorMap - The contributor map to save.
 * @param {object} metadata - The metadata to save.
 */
export async function saveCache(contributorMap, metadata) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await Promise.all([
      fs.writeFile(CONTRIBUTOR_MAP_CACHE, JSON.stringify(contributorMap, null, 2)),
      fs.writeFile(METADATA_CACHE, JSON.stringify(metadata, null, 2)),
    ]);
    console.log('Contributor map and metadata have been saved to cache.');
  } catch (error) {
    console.error('Failed to save cache:', error.message);
  }
}