import { GitHubService } from './GitHubService'; // Import from your updated file
import stringify from 'json-stable-stringify';
import { merge } from 'lodash-es';

export class ContributionService {
    /**
     * Prepares a file update by merging existing remote data with new user data.
     * @param {string} path - The file path.
     * @param {object} newData - The new data from the user.
     * @param {string} username - The contributor's username.
     * @param {boolean} isDeepMerge - If true, performs a deep merge (for graphics).
     */
    static async prepareFileUpdate(path, newData, username, isDeepMerge = false) {
        const remoteContent = await GitHubService.getJsonContent(path);
        // We fetch the SHA here to return it, but the caller might override it 
        // if they want to enforce optimistic locking (Client SHA).
        const sha = await GitHubService.getFileSha(path);

        let finalContent = {};
        let contributors = new Set();

        // 1. Collect Existing Contributors
        if (remoteContent && remoteContent.contributor) {
            const existing = Array.isArray(remoteContent.contributor) 
                ? remoteContent.contributor 
                : [remoteContent.contributor];
            existing.forEach(c => contributors.add(c));
        }
        
        // 2. Collect Client Contributors (if preserving history passed from UI)
        if (newData.contributor) {
             const clientContribs = Array.isArray(newData.contributor) ? newData.contributor : [newData.contributor];
             clientContribs.forEach(c => contributors.add(c));
        }
        
        // 3. Add Current User
        contributors.add(username);

        // 4. Merge Data
        if (remoteContent && isDeepMerge) {
            // Remove contributor field to avoid merging array into object logic issues
            const { contributor: _, ...remoteData } = remoteContent;
            const { contributor: __, ...userData } = newData;
            finalContent = merge({}, remoteData, userData);
        } else {
            const { contributor: __, ...userData } = newData;
            finalContent = userData;
        }

        // 5. Preserve Last Updated (if exists remotely)
        if (remoteContent && remoteContent.lastUpdated && !finalContent.lastUpdated) {
            finalContent.lastUpdated = remoteContent.lastUpdated;
        }

        finalContent.contributor = Array.from(contributors);

        return {
            content: stringify(finalContent, { space: 2 }),
            sha // Return fresh SHA, caller decides whether to use it or Client SHA
        };
    }

    static async prepareGroupUpdate(path, submittedIds) {
        const remoteIds = await GitHubService.getJsonContent(path) || [];
        const sha = await GitHubService.getFileSha(path);

        // Union of Remote + Submitted to prevent accidental deletions
        const mergedIds = Array.from(new Set([...remoteIds, ...submittedIds])).sort();

        return {
            content: stringify(mergedIds, { space: 2 }),
            sha
        };
    }
}