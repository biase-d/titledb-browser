import { performanceProfiles, graphicsSettings, youtubeLinks } from '../../src/lib/db/schema.js';
import path from 'node:path';

/**
 * Configuration object that defines the properties and behavior of each data type to be synced
 * This declarative approach allows the sync logic to be generic and easily extensible
 */
export const DATA_SOURCES = {
  performance: {
    table: performanceProfiles,
    path: 'profiles',
    isHierarchical: true, // Data is in subdirectories like /profiles/{groupId}/
    /**
     * Generates a unique key for a performance profile file
     * @param {string} groupId - The ID of the game group
     * @param {import('fs').Dirent} file - The directory entry for the version file
     * @returns {string} A unique key, e.g., "GROUPID-1.0.0-suffix"
     */
    getKey: (groupId, file) => {
      const baseName = path.basename(file.name, '.json');
      const [gameVersion, ...suffixParts] = baseName.split('$');
      return `${groupId}-${gameVersion}-${suffixParts.join('$') || ''}`;
    },
    /**
     * Builds a database-ready record from the file content and metadata
     * @param {string[]} keyParts - The parts of the key [groupId, gameVersion, suffix]
     * @param {any} content - The parsed JSON content of the file
     * @param {any} metadata - The contributor and PR URL info
     * @returns {object} The record object for insertion into the database
     */
    buildRecord: (keyParts, content, metadata) => ({
      groupId: keyParts[0],
      gameVersion: keyParts[1],
      suffix: keyParts[2] || null,
      profiles: content,
      contributor: metadata.contributors ? metadata.contributors[0] : null,
      sourcePrUrl: metadata.sourcePrUrl,
    })
  },
  graphics: {
    table: graphicsSettings,
    path: 'graphics',
    isHierarchical: false,
    getKey: (groupId, file) => groupId,
    buildRecord: (keyParts, content, metadata) => ({
      groupId: keyParts[0],
      settings: content,
      contributor: metadata.contributors,
    })
  },
  videos: {
    table: youtubeLinks,
    path: 'videos',
    isHierarchical: false,
    getKey: (groupId, file) => groupId,
    buildRecord: (keyParts, content, metadata) => {
      // Videos are a special case; they represent multiple rows
      // We return an array of records
      return content.filter(e => e.url).map(entry => ({
        groupId: keyParts[0],
        url: entry.url,
        notes: entry.notes,
        submittedBy: entry.submittedBy,
      }));
    }
  }
};