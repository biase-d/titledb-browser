/**
 * @file GitHub Repository
 * @description Repository for abstracting GitHub API interactions
 * Replaces direct usage of GitHubService class
 */

import { GitHubService } from '$lib/services/GitHubService'

/**
 * Get file content from GitHub as JSON
 * @param {string} path - File path in repository
 * @returns {Promise<Object|null>}
 */
export async function getRemoteJson (path) {
	return await GitHubService.getJsonContent(path)
}

/**
 * Get file SHA from GitHub
 * @param {string} path - File path in repository
 * @returns {Promise<string|null>}
 */
export async function getRemoteSha (path) {
	return await GitHubService.getFileSha(path)
}

/**
 * Create a pull request
 * @param {Object} params
 * @param {string} params.branchName - Name of the new branch
 * @param {string} params.commitMessage - Commit message
 * @param {string} params.prTitle - PR title
 * @param {string} params.prBody - PR body
 * @param {Array<{path: string, content: string|null}>} params.files - Files to create/update
 * @returns {Promise<{url: string, number: number}>}
 */
export async function createPullRequest (params) {
	return await GitHubService.createPullRequest(params)
}
