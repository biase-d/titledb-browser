import { redirect, fail } from '@sveltejs/kit';
import { mainUrl, dataRepo } from '$lib/index.js';
import { Octokit } from '@octokit/rest';
import { GITHUB_BOT_TOKEN } from '$env/static/private';

const { owner, repo } = dataRepo;
let prCreated = false

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
            const { data: fileData } = await botOctokit.repos.getContent({ owner, repo, path: `data/${id}.json` });
            // @ts-ignore
            if (fileData.content) {
                existingData = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf-8'));
            }
        } catch (e) {
            // @ts-ignore
            if (e.status !== 404) console.error("Failed to fetch existing data:", e);
        }
    }
    return { id, name, session, existingData };
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, locals }) => {
		const session = await locals.auth();
		// @ts-ignore
		if (!session?.user?.login || !session?.user?.id) {
			return fail(401, { error: 'Unauthorized. Your GitHub session is invalid.' });
		}

		if (!GITHUB_BOT_TOKEN) {
			console.error("CRITICAL: GITHUB_BOT_TOKEN is not configured.");
			return fail(500, { error: 'Server is not configured for contributions.' });
		}
		
		const formData = await request.formData();
		const titleId = formData.get('titleId');
		const gameName = formData.get('gameName');
		const performanceData = JSON.parse(formData.get('performanceData'));

		const botOctokit = new Octokit({ auth: GITHUB_BOT_TOKEN });
		const userLogin = session.user.login;
		const userName = session.user.name;
		// @ts-ignore
		const userId = session.user.id;
		
		const userNoreplyEmail = `${userId}+${userLogin}@users.noreply.github.com`;

		const branchName = `contrib/${userLogin.replace(/[^a-zA-Z0-9-]/g, '')}-${titleId}`;
		const filePath = `data/${titleId}.json`;
		
		try {
			const { data: { object: { sha: latestSha } } } = await botOctokit.git.getRef({ owner, repo, ref: 'heads/main' });
			
			await botOctokit.git.createRef({ owner, repo, ref: `refs/heads/${branchName}`, sha: latestSha });
			
			let existingFileSha;
			try {
				const { data: fileData } = await botOctokit.repos.getContent({ owner, repo, path: filePath, ref: 'main' });
				// @ts-ignore
				if (fileData.sha) existingFileSha = fileData.sha;
			} catch (e) { /* File doesn't exist */ }
			
			const title = `feat: ${existingFileSha ? 'Update' : 'Add'} data for ${gameName} (${titleId})`;
			const coAuthorTrailer = `Co-authored-by: ${userName} <${userNoreplyEmail}>`;

			const message = `${title}\n\n${coAuthorTrailer}`;

			await botOctokit.repos.createOrUpdateFileContents({
				owner, repo, path: filePath, message,
				content: Buffer.from(JSON.stringify(performanceData, null, 2)).toString('base64'),
				branch: branchName,
				sha: existingFileSha,
			});

			const { data: pr } = await botOctokit.pulls.create({
				owner, repo,
				title: `[Contribution] ${gameName}`,
				body: `@${userLogin} submitted ${gameName} data via the Titledb Browser`,
				head: branchName,
				base: 'main'
			});
			
      prCreated = true
			return { success: true, prUrl: pr.html_url };

		} catch (error) {
			console.error('[GitHub PR ERROR]', error);
			try {
        if (!prCreated) {
          await botOctokit.git.deleteRef({ owner, repo, ref: `heads/${branchName}` });
        }
			} catch (_) {}
			return fail(500, { error: 'Failed to create Pull Request.' });
		}
	}
};