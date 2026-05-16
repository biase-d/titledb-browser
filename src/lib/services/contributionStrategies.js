import * as githubRepo from '$lib/repositories/githubRepository'
import { submissions } from '$lib/db/schema'
import { upsertUserAndGetKarma } from '$lib/repositories/userRepository'

const KARMA_APPROVAL_THRESHOLD = 10

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
 * @typedef {{ id: string, login: string }} SessionUser
 */

class ContributionStrategy {
	/**
	 * @param {ContributionDetails} details
	 * @param {SessionUser} user
	 * @param {any} dbConnection
	 * @returns {Promise<{success: boolean, url?: string, number?: number, error?: string}>}
	 */
	async submit (_details, _user, _dbConnection) {
		throw new Error('Method not implemented')
	}
}

/**
 * Legacy behavior: only creates a GitHub PR, no DB write.
 */
export class GitHubOnlyStrategy extends ContributionStrategy {
	async submit (details, user, _dbConnection) {
		const branchName = `contrib/${user.login}/${details.groupId}-${Date.now()}`

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
 * Simultaneous hybrid: writes to public.submissions as 'pending' (or 'approved' for high-karma
 * users), then opens a GitHub PR. The DB entry is visible immediately in the UI.
 */
export class DatabaseAndGitHubStrategy extends ContributionStrategy {
	async submit (details, user, dbConnection) {
		const branchName = `contrib-beta/${user.login}/${details.groupId}-${Date.now()}`

		// Path A: Create PR on GitHub
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

		// Path B: Persist in public.submissions, resolving status via karma
		const karma = await upsertUserAndGetKarma(dbConnection, { id: user.id, login: user.login })
		const status = karma > KARMA_APPROVAL_THRESHOLD ? 'approved' : 'pending'

		/** @type {Array<{userId: string, githubPrNumber: number, groupId: string, data: any, status: string, type: string}>} */
		const rows = []

		if (details.rawPerformance?.length) {
			rows.push({
				userId: user.id,
				githubPrNumber: prDetails.number,
				groupId: details.groupId,
				data: details.rawPerformance,
				status,
				type: 'performance'
			})
		}

		if (details.rawGraphics) {
			rows.push({
				userId: user.id,
				githubPrNumber: prDetails.number,
				groupId: details.groupId,
				data: details.rawGraphics,
				status,
				type: 'graphics'
			})
		}

		if (details.rawYoutube?.length) {
			rows.push({
				userId: user.id,
				githubPrNumber: prDetails.number,
				groupId: details.groupId,
				data: details.rawYoutube,
				status,
				type: 'youtube'
			})
		}

		if (rows.length > 0) {
			await dbConnection.insert(submissions).values(rows)
		}

		return { success: true, url: prDetails.url, number: prDetails.number }
	}
}

/**
 * @param {boolean} isBetaEnabled
 * @returns {ContributionStrategy}
 */
export function getContributionStrategy (isBetaEnabled) {
	if (isBetaEnabled) {
		return new DatabaseAndGitHubStrategy()
	}
	return new GitHubOnlyStrategy()
}
