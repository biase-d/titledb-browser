import { GitHubService } from '$lib/services/GitHubService';
import stringify from 'json-stable-stringify';
import { merge } from 'lodash-es';

export class ContributionService {
    /**
     * Prepares a file update by merging existing remote data with new user data
     * 
     * @param {string} path - The file path (e.g 'profiles/0100AD900.../1.0.0.json')
     * @param {object} newData - The new data submitted by the user
     * @param {string} username - The current user's GitHub username
     * @param {boolean} isDeepMerge - If true (Graphics), merges fields. If false (Profiles), overwrites data but keeps contributors
     * @returns {Promise<{content: string, sha: string|null}>} The formatted JSON string and the FRESH SHA from GitHub
     */
    static async prepareFileUpdate(path, newData, username, isDeepMerge = false) {
        const remoteContent = await GitHubService.getJsonContent(path);
        const sha = await GitHubService.getFileSha(path);

        let finalContent = {};
        let contributors = new Set();

        if (remoteContent && remoteContent.contributor) {
            const existing = Array.isArray(remoteContent.contributor) 
                ? remoteContent.contributor 
                : [remoteContent.contributor];
            existing.forEach(c => contributors.add(c));
        }
        
        if (newData.contributor) {
             const clientContribs = Array.isArray(newData.contributor) ? newData.contributor : [newData.contributor];
             clientContribs.forEach(c => contributors.add(c));
        }
        
        if (username) {
            contributors.add(username);
        }

        if (remoteContent && isDeepMerge) {
            const { contributor: _, ...remoteData } = remoteContent;
            const { contributor: __, ...userData } = newData;
    
            finalContent = merge({}, remoteData, userData);
        } else {
            const { contributor: __, ...userData } = newData;
            finalContent = userData;
        }

        if (remoteContent && remoteContent.lastUpdated && !finalContent.lastUpdated) {
            finalContent.lastUpdated = remoteContent.lastUpdated;
        }

        finalContent.contributor = Array.from(contributors);

        return {
            content: stringify(finalContent, { space: 2 }),
            sha
        };
    }

    static async prepareGroupUpdate(path, submittedIds) {
        const remoteIds = await GitHubService.getJsonContent(path) || [];
        const sha = await GitHubService.getFileSha(path);
        const mergedIds = Array.from(new Set([...remoteIds, ...submittedIds])).sort();

        return {
            content: stringify(mergedIds, { space: 2 }),
            sha
        };
    }
}