import * as githubRepo from '$lib/repositories/githubRepository'
import * as gameRepo from '$lib/repositories/gameRepository'

/**
 * @typedef {Object} ContributionDetails
 * @property {string} groupId
 * @property {string} [prTitle]
 * @property {string} [title]
 * @property {string} [prBody]
 * @property {string} [body]
 * @property {string} commitMessage
 * @property {Array<{path: string, content: string|null, sha?: string|null}>} files
 * @property {any} [rawPerformance]
 * @property {any} [rawGraphics]
 * @property {any} [rawYoutube]
 */

/**
 * Base Strategy Class
 */
class ContributionStrategy {
	/**
	 * @param {ContributionDetails} details
	 * @param {string} username
	 * @param {any} dbConnection
	 * @returns {Promise<{success: boolean, url?: string, number?: number, error?: string}>}
	 */
	async submit (_details, _username, _dbConnection) {
		throw new Error('Method not implemented')
	}
}

/**
 * Legacy/Current behavior: Only creates a Pull Request on GitHub
 */
export class GitHubOnlyStrategy extends ContributionStrategy {
	/**
	 * @param {ContributionDetails} details
	 * @param {string} username
	 * @param {any} dbConnection
	 */
	async submit (details, username, _dbConnection) {
		const branchName = `contrib/${username}/${details.groupId}-${Date.now()}`

		const prDetails = await githubRepo.createPullRequest({
			branchName,
			commitMessage: details.commitMessage,
			prTitle: details.prTitle || details.title || '',
			prBody: details.prBody || details.body || '',
			files: details.files
		})

		if (!prDetails) {
			return { success: false, error: 'Failed to create GitHub PR' }
		}

		return { success: true, url: prDetails.url, number: prDetails.number }
	}
}

/**
 * New behavior: Inserts into DB as 'pending' and then creates a GitHub PR
 */
export class DatabaseAndGitHubStrategy extends ContributionStrategy {
	/**
	 * @param {ContributionDetails} details
	 * @param {string} username
	 * @param {any} dbConnection
	 */
	async submit (details, username, dbConnection) {
		const branchName = `contrib-beta/${username}/${details.groupId}-${Date.now()}`

		const prDetails = await githubRepo.createPullRequest({
			branchName,
			commitMessage: details.commitMessage,
			prTitle: details.prTitle || details.title || '',
			prBody: details.prBody || details.body || '',
			files: details.files
		})

		if (!prDetails) {
			return { success: false, error: 'Failed to create GitHub PR' }
		}

		// 2. Persistent pending status in DB
		await gameRepo.savePendingContribution(dbConnection, {
			groupId: details.groupId,
			performance: details.rawPerformance,
			graphics: details.rawGraphics,
			youtube: details.rawYoutube,
			prNumber: prDetails.number
		})

		return { success: true, url: prDetails.url, number: prDetails.number }
	}
}

/**
 * Factory for selecting the strategy
 * @param {boolean} isBetaEnabled
 * @returns {ContributionStrategy}
 */
export function getContributionStrategy (isBetaEnabled) {
	if (isBetaEnabled) {
		return new DatabaseAndGitHubStrategy()
	}
	return new GitHubOnlyStrategy()
}
