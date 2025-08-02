import { Octokit } from '@octokit/rest';
import { GITHUB_BOT_TOKEN } from '$env/static/private';

const octokit = new Octokit({ auth: GITHUB_BOT_TOKEN })

const REPO_OWNER = 'biase-d'
const REPO_NAME = 'nx-performance'
const DEFAULT_BRANCH = 'v3'

/**
 * Custom error to identify submission conflicts
 */
export class GitConflictError extends Error {
	constructor(message) {
		super(message)
		this.name = 'GitConflictError';
	}
}

/**
 * Retrieves the SHA of a file in the repository
 * @param {string} path - The full path to the file from the repo root
 * @returns {Promise<string|null>} The SHA of the file, or null if not found
 */
export async function getFileSha(path) {
	try {
		const { data } = await octokit.repos.getContent({
			owner: REPO_OWNER,
			repo: REPO_NAME,
			path
		})

		// Ensure the response is for a file and has a SHA
		if (Array.isArray(data) || !('sha' in data)) {
			return null;
		}

		return data.sha;
	} catch (error) {
		// A 404 error is expected if the file doesn't exist, so we return null
		if (error.status === 404) {
			return null;
		}
		// For other errors, log them but still return null to prevent crashes
		console.error(`Error fetching SHA for path "${path}":`, error.message)
		return null;
	}
}

/**
 * Creates a new branch, commits multiple files, and opens a pull request
 * @param {string} branchName - The name for the new branch
 * @param {string} commitMessage - The message for the commit
 * @param {{path: string, content: string, sha?: string | null}[]} filesToCommit - Array of files to be created or updated
 * @param {string} prTitle - The title for the new pull request
 * @param {string} prBody - The body content for the new pull request
 * @returns {Promise<string|null>} The URL of the created pull request, or null on failure
 */
export async function createOrUpdateFilesAndDraftPR(branchName, commitMessage, filesToCommit, prTitle, prBody) {
	const owner = REPO_OWNER;
	const repo = REPO_NAME;

	try {
		// Get the SHA of the main branch
		const { data: mainBranch } = await octokit.repos.getBranch({
			owner,
			repo,
			branch: DEFAULT_BRANCH
		})
		const mainBranchSha = mainBranch.commit.sha;

		// Create a new branch from the main branch's SHA
		await octokit.git.createRef({
			owner,
			repo,
			ref: `refs/heads/${branchName}`,
			sha: mainBranchSha
		})

		// Create a tree with all file changes (creations, updates, and deletions)
		const tree = await Promise.all(
			filesToCommit.map(async (file) => {
				// Handle file deletion
				if (file.content === null) {
					return {
						path: file.path,
						mode: '100644',
						type: 'blob',
						sha: null // Setting sha to null deletes the file
					};
				}

				// Handle file creation/update
				const { data: blob } = await octokit.git.createBlob({
					owner,
					repo,
					content: file.content,
					encoding: 'utf-8'
				})
				return {
					path: file.path,
					mode: '100644',
					type: 'blob',
					sha: blob.sha
				};
			})
		)

		const { data: newTree } = await octokit.git.createTree({
			owner,
			repo,
			base_tree: mainBranchSha,
			tree
		})

		// Create a new commit pointing to the new tree
		const { data: newCommit } = await octokit.git.createCommit({
			owner,
			repo,
			message: commitMessage,
			tree: newTree.sha,
			parents: [mainBranchSha]
		})

		// Update the new branch to point to the new commit
		await octokit.git.updateRef({
			owner,
			repo,
			ref: `heads/${branchName}`,
			sha: newCommit.sha
		})

		// Create the pull request
		const { data: pullRequest } = await octokit.pulls.create({
			owner,
			repo,
			title: prTitle,
			head: branchName,
			base: DEFAULT_BRANCH,
			body: prBody,
			draft: true // Create as a draft PR
		})

		return pullRequest.html_url;
	} catch (error) {
		// If the error is a 409 or 422, it's likely a conflict (e.g., stale SHA)
		// We throw a custom error to handle this specifically in the form action
		if (error.status === 409 || error.status === 422) {
			console.warn(`Caught a git conflict error (${error.status}) for branch ${branchName}.`)
			throw new GitConflictError('A conflict occurred while creating the pull request. The base data may have changed')
		}

		console.error('An unexpected error occurred during pull request creation:', error.message)

		// Attempt to clean up the created branch if an error occurs mid-process
		try {
			await octokit.git.deleteRef({
				owner,
				repo,
				ref: `heads/${branchName}`
			})
			console.log(`Cleaned up branch: ${branchName}`)
		} catch (cleanupError) {
			console.error(`Failed to clean up branch ${branchName}:`, cleanupError.message)
		}

		return null;
	}
}