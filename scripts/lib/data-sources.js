import fs from 'node:fs/promises';
import path from 'node:path';

export function getBaseId(titleId) {
  return titleId.substring(0, 13) + '000';
}

/**
 * Reads the data repositories to discover all game groups and title mappings
 * @param {object} REPOS - The repository configuration object
 * @returns {Promise<{allGroupIds: Set<string>, customGroupMap: Map<string, string>, mainGamesList: object}>}
 */
/**
 * Reads data repositories to discover game groups, title mappings, and all data files
 * @param {object} REPOS - The repository configuration object
 * @returns {Promise<{
 *   allGroupIds: Set<string>,
 *   customGroupMap: Map<string, string>,
 *   mainGamesList: object,
 *   discoveredFiles: { performance: {groupId: string, fileName: string}[], graphics: {groupId: string, fileName: string}[], videos: {groupId: string, fileName: string}[] }
 * }>}
 */
export async function discoverDataSources(REPOS) {
  console.log('Discovering data sources and files...');
  const allGroupIds = new Set();
  const customGroupMap = new Map();
  const dataRepoPath = REPOS.nx_performance.path;
  const discoveredFiles = { performance: [], graphics: [], videos: [], groups: [] };

  // Read custom group mappings
  const groupsDir = path.join(dataRepoPath, 'groups');
  try {
    for (const file of await fs.readdir(groupsDir)) {
      if (path.extname(file) === '.json') {
        const customGroupId = path.basename(file, '.json');
        allGroupIds.add(customGroupId);
        const titleIds = JSON.parse(await fs.readFile(path.join(groupsDir, file), 'utf-8'));
        for (const titleId of titleIds) {
          customGroupMap.set(titleId, customGroupId);
        }
      }
    }
  } catch (e) {
    console.warn('Could not process custom groups directory. Skipping.');
  }

  // Discover all data files in one pass
  const dataTypes = [
    { name: 'performance', path: 'profiles', isHierarchical: true },
    { name: 'graphics', path: 'graphics', isHierarchical: false },
    { name: 'videos', path: 'videos', isHierarchical: false },
    { name: 'groups', path: 'groups', isHierarchical: false },
  ];

  for (const type of dataTypes) {
    const dirPath = path.join(dataRepoPath, type.path);
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      for (const file of files) {
        if (type.isHierarchical && file.isDirectory()) {
          const groupId = file.name;
          allGroupIds.add(groupId);
          const subFiles = await fs.readdir(path.join(dirPath, groupId));
          for (const subFile of subFiles) {
            if (path.extname(subFile) === '.json') {
              discoveredFiles[type.name].push({ groupId, fileName: subFile });
            }
          }
        } else if (!type.isHierarchical && file.isFile() && path.extname(file.name) === '.json') {
          const groupId = path.basename(file.name, '.json');
          allGroupIds.add(groupId);
          discoveredFiles[type.name].push({ groupId, fileName: file.name });
        }
      }
    } catch (e) {
      console.warn(`Could not process ${type.name} directory. Skipping.`);
    }
  }

  // Read the main titles list from titledb_filtered
  const mainJsonPath = path.join(REPOS.titledb_filtered.path, 'output', 'main.json');
  const mainGamesList = JSON.parse(await fs.readFile(mainJsonPath, 'utf-8'));

  for (const id of Object.keys(mainGamesList)) {
    allGroupIds.add(getBaseId(id));

    if (customGroupMap.has(id)) {
      allGroupIds.add(customGroupMap.get(id));
    }
  }

  console.log(`Discovered ${allGroupIds.size} unique game groups.`);
  return { allGroupIds, customGroupMap, mainGamesList, discoveredFiles };
}

/**
 * Parses the size string (e.g., "15.1 GiB") into bytes
 * @param {string} sizeStr - The size string to parse
 * @returns {number|null} The size in bytes, or null
 */
export function parseSizeToBytes(sizeStr) {
  if (!sizeStr) return null;
  const match = sizeStr.match(/([\d.]+)\s*(\w+)/);
  if (!match) return null;
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  const units = { kib: 1024, mib: 1024 ** 2, gib: 1024 ** 3, kb: 1000, mb: 1000 ** 2, gb: 1000 ** 3 };
  return Math.round(value * (units[unit] || 1));
}