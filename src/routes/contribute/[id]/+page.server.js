import { getGameDetails } from '$lib/games/getGameDetails';
import { getFileSha, createOrUpdateFilesAndDraftPR, GitConflictError } from '$lib/github.js';
import { error, redirect, fail } from '@sveltejs/kit';
import { isEqual } from 'lodash-es';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, parent }) => {
	const { session } = await parent();

	if (!session?.user?.login) {
		redirect(302, `/auth/signin?callbackUrl=/contribute/${params.id}`);
	}

	const titleId = params.id;
	const details = await getGameDetails(titleId);

	if (!details) {
		error(404, 'Game not found');
	}

	const { game, allTitlesInGroup, youtubeLinks } = details;
	const { groupId, names, performanceHistory } = game;

	const shas = {};
	shas.performance = {};
	for (const profile of performanceHistory) {
		const path = `profiles/${groupId}/${profile.gameVersion}.json`;
		shas.performance[profile.gameVersion] = await getFileSha(path);
	}

	shas.graphics = await getFileSha(`graphics/${groupId}.json`);
	shas.youtube = await getFileSha(`videos/${groupId}.json`);
	shas.group = await getFileSha(`groups/${groupId}.json`);

	return {
		id: titleId,
		name: names[0],
		groupId,
		allTitlesInGroup,
		existingPerformance: performanceHistory,
		existingGraphics: game.graphics,
		existingYoutubeLinks: youtubeLinks,
		originalYoutubeLinks: youtubeLinks,
		shas
	};
};

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, locals }) => {
		try {
			const session = await locals.getSession();
			const user = session?.user;
			if (!user?.login) {
				return fail(401, { error: 'Unauthorized' });
			}

			const formData = await request.formData();
			const titleId = formData.get('titleId');
			const gameName = formData.get('gameName');
			const performanceData = JSON.parse(formData.get('performanceData'));
			const graphicsData = JSON.parse(formData.get('graphicsData'));
			const youtubeLinks = JSON.parse(formData.get('youtubeLinks'));
			const updatedGroupData = JSON.parse(formData.get('updatedGroupData'));
			const originalGroupData = JSON.parse(formData.get('originalGroupData'));
			const originalPerformanceData = JSON.parse(formData.get('originalPerformanceData'));
			const originalYoutubeLinks = JSON.parse(formData.get('originalYoutubeLinks') || '[]');
			const changeSummary = JSON.parse(formData.get('changeSummary') || '[]');
			const shas = JSON.parse(formData.get('shas'));

			const groupId = updatedGroupData[0]?.groupId || titleId.substring(0, 13) + '000';

		/** @type {{path: string, content: string | null, sha?: string}[]} */
		const filesToCommit = [];
		const allContributors = new Set([user.login]);

		const submittedProfilesMap = new Map(performanceData.map(p => [p.gameVersion, p]));
		const originalProfilesMap = new Map(originalPerformanceData.map(p => [p.gameVersion, p]));

		// Process all submitted profiles (for creation or update)
		for (const [version, profile] of submittedProfilesMap.entries()) {
			if (!version) continue; // Skip entries without a version number

			if (profile.contributor) allContributors.add(profile.contributor);
			
			filesToCommit.push({
				path: `profiles/${groupId}/${version}.json`,
				// We always push the content, even if it's an "empty" profile
				// This preserves the version placeholder
				content: JSON.stringify(profile.profiles, null, 2),
				sha: shas.performance?.[version]
			});
		}

		// Process deletions (profiles that were in the original list but not the submitted one)
		for (const version of originalProfilesMap.keys()) {
			if (!submittedProfilesMap.has(version)) {
				filesToCommit.push({
					path: `profiles/${groupId}/${version}.json`,
					content: null // A null content signals deletion
				});
			}
		}

		// Graphics
		if (Object.keys(graphicsData).length > 0) {
			// If graphics data exists, the current user is the contributor.
			// Add original contributor for co-authorship if they exist.
			const originalContributor = graphicsData.contributor;
			if (originalContributor) allContributors.add(originalContributor);

			// Assign the current user as the primary contributor for the file.
			graphicsData.contributor = user.login;

			filesToCommit.push({
				path: `graphics/${groupId}.json`,
				content: JSON.stringify(graphicsData, null, 2),
				sha: shas.graphics
			});
		}

		// YouTube Links
		if (youtubeLinks.length > 0) {
			// Add original contributor for co-authorship if they exist.
			const originalContributor = originalYoutubeLinks[0]?.submittedBy;
			if (originalContributor) allContributors.add(originalContributor);

			// Re-structure the data with the current user as the primary contributor.
			const youtubeFileContent = youtubeLinks.map(link => ({
				url: link.url,
				notes: link.notes,
				submittedBy: user.login
			}));

			filesToCommit.push({
				path: `videos/${groupId}.json`,
				content: JSON.stringify(youtubeFileContent, null, 2),
				sha: shas.youtube
			});
		}

		// Grouping
		const originalIds = new Set(originalGroupData.map(g => g.id));
		const updatedIds = new Set(updatedGroupData.map(g => g.id));
		if (!isEqual(originalIds, updatedIds)) {
			filesToCommit.push({
				path: `groups/${groupId}.json`,
				content: JSON.stringify(updatedGroupData.map(g => g.id), null, 2),
				sha: shas.group
			});
		}

		if (filesToCommit.length === 0) return fail(400, { error: 'No changes detected.' });

		const branchName = `contrib/${user.login}/${groupId}-${Date.now()}`;
		const prTitle = `[Contribution] ${gameName} (${groupId})`;
		
		const prBodyParts = [
			`Contribution submitted by @${user.login} for **${gameName}**.`,
			'',
			`*   **Title ID:** \`${titleId}\``,
			`*   **Group ID:** \`${groupId}\``,
			''
		];

		if (changeSummary.length > 0) {
			prBodyParts.push('### Summary of Changes');
			prBodyParts.push(...changeSummary.map(c => `*   ${c}`));
		}
		const prBody = prBodyParts.join('\n');

		const commitMessageParts = [`feat(${groupId}): Update data for ${gameName}`];
		commitMessageParts.push('');
		for (const contributor of allContributors) {
			commitMessageParts.push(`Co-authored-by: ${contributor} <${contributor}@users.noreply.github.com>`);
		}
			const commitMessage = commitMessageParts.join('\n');

			const prUrl = await createOrUpdateFilesAndDraftPR(branchName, commitMessage, filesToCommit, prTitle, prBody);

			if (prUrl) {
				return { success: true, prUrl };
			}
			return fail(500, { error: 'An unexpected error occurred while creating the pull request.' });

		} catch (err) {
			if (err instanceof GitConflictError) {
				return fail(409, { error: 'The contribution data has changed since you loaded the page. Please refresh and try again to avoid overwriting recent changes.' });
			}
			console.error('Contribution submission failed:', err);
			return fail(500, { error: 'An unexpected error occurred.' });
		}
	}
};