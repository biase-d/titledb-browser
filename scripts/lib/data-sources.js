import fs from 'node:fs/promises';
import path from 'node:path';

function getBaseId(titleId) { return titleId.substring(0, 13) + '000'; }

/**
 * Reads the data repositories to discover all game groups and title mappings
 * @param {object} REPOS - The repository configuration object
 * @returns {Promise<{allGroupIds: Set<string>, customGroupMap: Map<string, string>, mainGamesList: object}>}
 */
export async function discoverDataSources(REPOS) {
  console.log('Discovering data sources...');
  const allGroupIds = new Set();
  const customGroupMap = new Map();
  const dataRepoPath = REPOS.nx_performance.path;

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

  // Discover group IDs from performance, graphics, and video data
  const dataDirs = ['profiles', 'graphics', 'videos'];
  for (const dirName of dataDirs) {
    const dirPath = path.join(dataRepoPath, dirName);
    try {
      for (const file of await fs.readdir(dirPath, { withFileTypes: true })) {
        if (dirName === 'profiles' && file.isDirectory()) {
          allGroupIds.add(file.name);
        } else if (file.isFile() && path.extname(file.name) === '.json') {
          allGroupIds.add(path.basename(file.name, '.json'));
        }
      }
    } catch (e) {
      console.warn(`Could not process ${dirName} directory. Skipping.`);
    }
  }

  // Read the main titles list from titledb_filtered
  const mainJsonPath = path.join(REPOS.titledb_filtered.path, 'output', 'main.json');
  const mainGamesList = JSON.parse(await fs.readFile(mainJsonPath, 'utf-8'));

  // Ensure all games from the main list have a group ID accounted for
  for (const id of Object.keys(mainGamesList)) {
    allGroupIds.add(customGroupMap.get(id) || getBaseId(id));
  }

  console.log(`Discovered ${allGroupIds.size} unique game groups.`);
  return { allGroupIds, customGroupMap, mainGamesList };
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