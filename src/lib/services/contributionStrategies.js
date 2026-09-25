import * as githubRepo from '$lib/repositories/githubRepository'
import { submissions } from '$lib/db/schema'
import { upsertUserAndGetKarma } from '$lib/repositories/userRepository'
import logger from '$lib/services/loggerService'

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

/**
 * How a contribution is submitted: a GitHub PR for review, and a row in
 * public.submissions at the same time so the change is visible on the site
 * straight away rather than only after the PR is merged and the next sync runs
 *
 * Contributors with karma over the threshold land as 'approved'; everyone else
 * as 'pending', which the title page renders with a "Pending Review" badge. The
 * sync pipeline promotes pending rows once their PR is merged
 *
 * This replaced a PR-only flow that left contributors staring at an unchanged
 * page, wondering whether the submission had worked
 */
export class DatabaseAndGitHubStrategy {
	/**
	 * @param {ContributionDetails} details
	 * @param {SessionUser} user
	 * @param {any} dbConnection
	 * @returns {Promise<{success: boolean, url?: string, number?: number, error?: string}>}
	 */
	async submit (details, user, dbConnection) {
		// Was contrib-beta/ while this was opt-in. New branches use the plain
		// prefix; branches already open on GitHub keep the name they were made
		// with, and nothing matches on it
		const branchName = `contrib/${user.login}/${details.groupId}-${Date.now()}`

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

		// Path B: Persist in public.submissions, resolving status via karma.
		// A karma lookup that fails must not lose the submission either, so it
		// falls back to the cautious answer rather than throwing
		let karma = 0
		try {
			karma = await upsertUserAndGetKarma(dbConnection, { id: user.id, login: user.login })
		} catch (e) {
			logger.error(
				'Could not read contributor karma, treating the submission as pending',
				e instanceof Error ? e : new Error(String(e)),
				{ user: user.login }
			)
		}
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
			try {
				await dbConnection.insert(submissions).values(rows)
			} catch (e) {
				// The PR is the durable half: it exists, it is reviewable, and
				// the sync pipeline picks it up when it merges. Failing the
				// whole submission here would tell the contributor their work
				// was lost and invite them to send it again, opening a second
				// PR for the same change. They lose only the immediate
				// "Pending" badge, so say it succeeded and alert instead
				logger.error(
					'Contribution PR opened but could not be recorded in the database',
					e instanceof Error ? e : new Error(String(e)),
					{ prNumber: prDetails.number, groupId: details.groupId, user: user.login }
				)
			}
		}

		return { success: true, url: prDetails.url, number: prDetails.number }
	}
}

/**
 * The one strategy. Kept as a function so the call sites do not construct it
 * themselves, and so a second one could return from here if that day comes
 * @returns {DatabaseAndGitHubStrategy}
 */
export function getContributionStrategy () {
	return new DatabaseAndGitHubStrategy()
}
