import { Octokit } from '@octokit/rest';
import { GITHUB_BOT_TOKEN } from '$env/static/private';

const octokit = new Octokit({ auth: GITHUB_BOT_TOKEN });

const REPO_OWNER = 'biase-d';
const REPO_NAME = 'nx-performance';
const DEFAULT_BRANCH = 'v3';

/**
 * Custom error to identify submission conflicts
 * Thrown when the file SHA sent does not match the current SHA on GitHub
 */
export class GitConflictError extends Error {
	constructor(message) {
		super(message);
		this.name = 'GitConflictError';
	}
}

/**
 * Service for interacting with the GitHub Repository
 */
export class GitHubService {
	/**
	 * Retrieves the SHA of a file in the repository
	 * @param {string} path - The full path to the file
	 * @returns {Promise<string|null>} The SHA or null if not found
	 */
	static async getFileSha(path) {
		try {
			const { data } = await octokit.repos.getContent({
				owner: REPO_OWNER,
				repo: REPO_NAME,
				path
			});

			if (Array.isArray(data) || !('sha' in data)) {
				return null;
			}
			return data.sha;
		} catch (error) {
			if (error.status === 404) return null;
			console.error(`[GitHubService] Error fetching SHA for path "${path}":`, error.message);
			return null;
		}
	}

	/**
	 * Retrieves and parses the JSON content of a file
	 * Used to fetch the *live* data from GitHub to merge with user input
	 * @param {string} path - The file path
	 * @returns {Promise<any|null>} The parsed JSON or null
	 */
	static async getJsonContent(path) {
		try {
			const { data } = await octokit.repos.getContent({
				owner: REPO_OWNER,
				repo: REPO_NAME,
				path
			});

			if (Array.isArray(data) || !data.content) return null;

			const content = Buffer.from(data.content, 'base64').toString('utf-8');
			return JSON.parse(content);
		} catch (error) {
			if (error.status === 404) return null;
			console.error(`[GitHubService] Error fetching content for "${path}":`, error.message);
			return null;
		}
	}

	/**
	 * Creates a new branch, commits files, and opens a draft PR
	 * @param {object} params
	 * @param {string} params.branchName
	 * @param {string} params.commitMessage
	 * @param {string} params.prTitle
	 * @param {string} params.prBody
	 * @param {Array<{path: string, content: string|null, encoding?: string}>} params.files - Files to create/update
	 * @returns {Promise<{url: string, number: number}|null>}
	 */
	static async createPullRequest({ branchName, commitMessage, prTitle, prBody, files }) {
		try {
			const { data: mainBranch } = await octokit.repos.getBranch({
				owner: REPO_OWNER,
				repo: REPO_NAME,
				branch: DEFAULT_BRANCH
			});
			const baseSha = mainBranch.commit.sha;

			await octokit.git.createRef({
				owner: REPO_OWNER,
				repo: REPO_NAME,
				ref: `refs/heads/${branchName}`,
				sha: baseSha
			});

			const tree = await Promise.all(
				files.map(async (file) => {
					if (file.content === null) {
						return {
							path: file.path,
							mode: '100644',
							type: 'blob',
							sha: null // Null SHA deletes the file in git tree operations
						};
					}

					const { data: blob } = await octokit.git.createBlob({
						owner: REPO_OWNER,
						repo: REPO_NAME,
						content: file.content,
						encoding: file.encoding || 'utf-8' // Use provided encoding or default to utf-8
					});

					return {
						path: file.path,
						mode: '100644',
						type: 'blob',
						sha: blob.sha
					};
				})
			);

			const { data: newTree } = await octokit.git.createTree({
				owner: REPO_OWNER,
				repo: REPO_NAME,
				base_tree: baseSha,
				tree
			});

			const { data: newCommit } = await octokit.git.createCommit({
				owner: REPO_OWNER,
				repo: REPO_NAME,
				message: commitMessage,
				tree: newTree.sha,
				parents: [baseSha]
			});

			await octokit.git.updateRef({
				owner: REPO_OWNER,
				repo: REPO_NAME,
				ref: `heads/${branchName}`,
				sha: newCommit.sha
			});

			const { data: pullRequest } = await octokit.pulls.create({
				owner: REPO_OWNER,
				repo: REPO_NAME,
				title: prTitle,
				head: branchName,
				base: DEFAULT_BRANCH,
				body: prBody,
				draft: true
			});

			return {
				url: pullRequest.html_url,
				number: pullRequest.number
			};

		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			if (error.status === 409 || error.status === 422) {
				console.warn(`[GitHubService] Git conflict (${error.status}) for branch ${branchName}.`);

				try {
					await octokit.git.deleteRef({ owner: REPO_OWNER, repo: REPO_NAME, ref: `heads/${branchName}` });
				} catch (e) { /* ignore cleanup error */ }

				throw new GitConflictError('The contribution data has changed since you loaded the page. Please refresh and try again.');
			}

			console.error('[GitHubService] Unexpected error:', err.message);

			try {
				await octokit.git.deleteRef({ owner: REPO_OWNER, repo: REPO_NAME, ref: `heads/${branchName}` });
			} catch (cleanupError) {
				const cErr = cleanupError instanceof Error ? cleanupError : new Error(String(cleanupError));
				console.error(`[GitHubService] Failed to cleanup branch ${branchName}:`, cErr.message);
			}

			return null;
		}
	}
}