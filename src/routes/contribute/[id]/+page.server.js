import { redirect, fail } from '@sveltejs/kit';
import { mainUrl, dataRepo } from '$lib/index.js';
import { Octokit } from '@octokit/rest';
import { GITHUB_BOT_TOKEN } from '$env/static/private';

export async function load({ params, locals, fetch }) {
	const session = await locals.auth();
	if (!session?.user) {
		throw redirect(303, '/');
	}

	const { id } = params;
	const mainIndexRes = await fetch(mainUrl);
	const mainIndex = await mainIndexRes.json();
	const name = mainIndex[id]?.[0] || id;

	let existingData = null;
	if (GITHUB_BOT_TOKEN) {
		try {
			const botOctokit = new Octokit({ auth: GITHUB_BOT_TOKEN });
			const [owner, repo] = dataRepo.split('/');
			const { data: fileData } = await botOctokit.repos.getContent({
				owner,
				repo,
				path: `data/${id}.json`
			});
			// @ts-ignore
			if (fileData.content) {
				existingData = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf-8'));
			}
		} catch (e) {
			// @ts-ignore
			if (e.status !== 404) {
				console.error("Failed to fetch existing contribution data:", e);
			}
		}
	}

	return { id, name, session, existingData };
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session?.user || !session.accessToken) {
			return fail(401, { error: 'Unauthorized. Please sign in again.' });
		}

		const formData = await request.formData();
		const titleId = formData.get('titleId');
		const gameName = formData.get('gameName');
		const performanceData = JSON.parse(formData.get('performanceData'));

		const userOctokit = new Octokit({ auth: session.accessToken });
		const [owner, repo] = dataRepo.split('/');
		const userLogin = session.user.login;

		const branchName = `${userLogin.replace(/[^a-zA-Z0-9-]/g, '')}:${titleId}`;
		const filePath = `data/${titleId}.json`;

		try {
			const { data: fork } = await userOctokit.repos.createFork({ owner, repo });
			const forkOwner = fork.owner.login;

			const { data: { object: { sha: latestSha } } } = await userOctokit.git.getRef({ owner, repo, ref: 'heads/main' });

			await userOctokit.git.createRef({
				owner: forkOwner, repo, ref: `refs/heads/${branchName}`, sha: latestSha
			});

			let existingFileSha;
			try {
				const { data: fileData } = await userOctokit.repos.getContent({ owner, repo, path: filePath, ref: 'main' });
				// @ts-ignore
				if (fileData.sha) existingFileSha = fileData.sha;
			} catch (e) { /* File doesn't exist, this is fine */ }

			const message = existingFileSha
			? `Update performance data for ${gameName} (${titleId})`
			: `Add performance data for ${gameName} (${titleId})`;

			await userOctokit.repos.createOrUpdateFileContents({
				owner: forkOwner, repo, path: filePath, message,
				content: Buffer.from(JSON.stringify(performanceData, null, 2)).toString('base64'),
				branch: branchName,
				sha: existingFileSha,
				committer: { name: userLogin, email: session.user.email },
				author: { name: userLogin, email: session.user.email }
			});

			const { data: pr } = await userOctokit.pulls.create({
				owner, repo,
				title: `${existingFileSha ? 'Update' : 'Add'} Performance Data for ${gameName}`,
				body: `Submitted by @${userLogin} via the Titledb Browser`,
				head: `${forkOwner}:${branchName}`,
				base: 'main'
			});

			return { success: true, prUrl: pr.html_url };

		} catch (error) {
			console.error('[GitHub PR ERROR]', error);
			return fail(500, { error: 'Failed to create Pull Request. The API returned an error.' });
		}
	}
};