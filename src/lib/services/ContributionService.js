/**
 * @file Contribution Service
 * @description Pure functions for preparing GitHub contributions
 * Refactored from Class-based ContributionService.js
 */

import * as githubRepo from '$lib/repositories/githubRepository';
import stringify from 'json-stable-stringify';
import { merge } from 'lodash-es';

/**
 * Prepare a file update by merging existing remote data with new user data
 * 
 * @param {string} path - Remote file path
 * @param {Object} newData - New data to merge
 * @param {string} username - User's GitHub username
 * @param {boolean} [isDeepMerge=false] - Deep merge for config, shallow for arrays
 * @returns {Promise<{content: string, sha: string|null}>}
 */
export async function prepareFileUpdate(path, newData, username, isDeepMerge = false) {
    const remoteContent = await githubRepo.getRemoteJson(path);
    const sha = await githubRepo.getRemoteSha(path);

    let finalContent = {};
    const contributors = new Set();

    // Preserve existing contributors
    if (remoteContent && remoteContent.contributor) {
        const existing = Array.isArray(remoteContent.contributor)
            ? remoteContent.contributor
            : [remoteContent.contributor];
        existing.forEach(c => contributors.add(c));
    }

    // Add new contributors from request
    if (newData.contributor) {
        const clientContribs = Array.isArray(newData.contributor) ? newData.contributor : [newData.contributor];
        clientContribs.forEach(c => contributors.add(c));
    }

    // Add current user
    if (username) {
        contributors.add(username);
    }

    // Merge logic
    if (remoteContent && isDeepMerge) {
        // Exclude contributor field from merge sources to handle it manually
        const { contributor: _, ...remoteData } = remoteContent;
        const { contributor: __, ...userData } = newData;

        finalContent = merge({}, remoteData, userData);
    } else {
        const { contributor: __, ...userData } = newData;
        finalContent = userData;
    }

    // Preserve lastUpdated if not provided in new data
    if (remoteContent && remoteContent.lastUpdated && !finalContent.lastUpdated) {
        finalContent.lastUpdated = remoteContent.lastUpdated;
    }

    // Set updated contributors list
    finalContent.contributor = Array.from(contributors);

    return {
        content: stringify(finalContent, { space: 2 }),
        sha
    };
}

/**
 * Prepare a group ID list update
 * @param {string} path - Remote file path
 * @param {string[]} submittedIds - IDs to add
 * @returns {Promise<{content: string, sha: string|null}>}
 */
export async function prepareGroupUpdate(path, submittedIds) {
    const remoteIds = await githubRepo.getRemoteJson(path) || [];
    const sha = await githubRepo.getRemoteSha(path);

    const mergedIds = Array.from(new Set([...remoteIds, ...submittedIds])).sort();

    return {
        content: stringify(mergedIds, { space: 2 }),
        sha
    };
}

/**
 * Submit a contribution via Pull Request
 * @param {Object} prDetails
 * @param {string} prDetails.title
 * @param {string} prDetails.body
 * @param {Array<{path: string, content: string}>} prDetails.files
 * @param {string} username
 * @returns {Promise<{url: string, number: number}>}
 */
export async function submitContribution(prDetails, username) {
    const branchName = `contribution/${username}-${Date.now()}`;

    return await githubRepo.createPullRequest({
        branchName,
        commitMessage: prDetails.title,
        prTitle: prDetails.title,
        prBody: prDetails.body,
        files: prDetails.files
    });
}