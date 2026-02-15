/**
 * @file Contribution Service
 * @description Pure functions for preparing GitHub contributions
 * Refactored from Class-based ContributionService.js
 */

import * as githubRepo from '$lib/repositories/githubRepository'
import stringify from 'json-stable-stringify'
import { merge } from 'lodash-es'
import { getContributionStrategy } from './contributionStrategies'

/**
 * Prepare a file update by merging existing remote data with new user data
 *
 * @param {string} path - Remote file path
 * @param {Object} newData - New data to merge
 * @param {string} username - User's GitHub username
 * @param {boolean} [isDeepMerge=false] - Deep merge for config, shallow for arrays
 * @returns {Promise<{content: string, sha: string|null}>}
 */
export async function prepareFileUpdate (path, newData, username, isDeepMerge = false) {
	const remoteContent = await githubRepo.getRemoteJson(path)
	const sha = await githubRepo.getRemoteSha(path)

	let finalContent = {}
	const contributors = new Set()

	// Preserve existing contributors
	const remoteData = /** @type {any} */ (remoteContent)
	if (remoteData && remoteData.contributor) {
		const existing = Array.isArray(remoteData.contributor)
			? remoteData.contributor
			: [remoteData.contributor]
		existing.forEach(c => contributors.add(c))
	}

	const nextData = /** @type {any} */ (newData)
	// Add new contributors from request
	if (nextData.contributor) {
		const clientContribs = Array.isArray(nextData.contributor) ? nextData.contributor : [nextData.contributor]
		clientContribs.forEach(c => contributors.add(c))
	}

	// Add current user
	if (username) {
		contributors.add(username)
	}

	// Merge logic
	if (remoteContent && isDeepMerge) {
		// Exclude contributor field from merge sources to handle it manually
		const { contributor: _, ...remoteData } = remoteContent
		const { contributor: __, ...userData } = newData

		finalContent = merge({}, remoteData, userData)
	} else {
		const { contributor: __, ...userData } = newData
		finalContent = userData
	}

	// Preserve lastUpdated if not provided in new data
	if (remoteData && remoteData.lastUpdated && !finalContent.lastUpdated) {
		finalContent.lastUpdated = remoteData.lastUpdated
	}

	// Set updated contributors list
	finalContent.contributor = Array.from(contributors)

	return {
		content: stringify(finalContent, { space: 2 }),
		sha
	}
}

/**
 * Prepare a group ID list update
 * @param {string} path - Remote file path
 * @param {string[]} submittedIds - IDs to add
 * @returns {Promise<{content: string, sha: string|null}>}
 */
export async function prepareGroupUpdate (path, submittedIds) {
	const remoteIds = Array.isArray(await githubRepo.getRemoteJson(path))
		? await githubRepo.getRemoteJson(path)
		: []
	const sha = await githubRepo.getRemoteSha(path)

	const mergedIds = Array.from(new Set([...(Array.isArray(remoteIds) ? remoteIds : []), ...submittedIds])).sort()

	return {
		content: stringify(mergedIds, { space: 2 }),
		sha
	}
}

/**
 * Submit a contribution using the active strategy
 * @param {Object} prDetails
 * @param {string} prDetails.prTitle
 * @param {string} prDetails.prBody
 * @param {Array<{path: string, content: string|null, encoding?: string}>} prDetails.files - Files to create/update
 * @param {string} username
 * @param {any} dbConnection
 * @param {boolean} [isBetaEnabled=false]
 * @returns {Promise<{success: boolean, url?: string, number?: number, error?: string}>}
 */
export async function submitContribution (prDetails, username, dbConnection, isBetaEnabled = false) {
	const strategy = getContributionStrategy(isBetaEnabled)

	return await strategy.submit(prDetails, username, dbConnection)
}
