import { getGameDetails } from '$lib/games/getGameDetails';
import { getFileSha, createOrUpdateFilesAndDraftPR, GitConflictError } from '$lib/github.js';
import { error, redirect, fail } from '@sveltejs/kit';
import stringify from 'json-stable-stringify';
import { pruneEmptyValues, areSetsEqual, generateChangeSummary, isProfileEmpty } from '$lib/utils.js';

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
			const originalGraphicsData = JSON.parse(formData.get('originalGraphicsData') || '{}');
			const originalYoutubeLinks = JSON.parse(formData.get('originalYoutubeLinks') || '[]');
			const shas = JSON.parse(formData.get('shas'));

			const changeSummary = generateChangeSummary(
				{ originalPerformance: originalPerformanceData, originalGraphics: originalGraphicsData, originalYoutubeLinks, originalGroup: originalGroupData },
				{ performanceProfiles: performanceData, graphicsData, youtubeLinks, updatedGroup: updatedGroupData }
			);

			const groupId = updatedGroupData[0]?.groupId || titleId.substring(0, 13) + '000';
			
			/** @type {{path: string, content: string | null, sha?: string}[]} */
			const filesToCommit = [];
			const allContributors = new Set([user.login]);

			const submittedProfilesMap = new Map(performanceData.map(p => [p.gameVersion + (p.suffix || ''), p]));
			const originalProfilesMap = new Map(originalPerformanceData.map(p => [p.gameVersion + (p.suffix || ''), p]));

			for (const [key, submittedProfile] of submittedProfilesMap.entries()) {
				const originalProfile = originalProfilesMap.get(key);
				if (originalProfile?.contributor) {
					originalProfile.contributor.forEach(c => allContributors.add(c));
				}
				const fileContent = pruneEmptyValues(submittedProfile.profiles);
				const fileName = submittedProfile.suffix ? `${submittedProfile.gameVersion}$${submittedProfile.suffix}.json` : `${submittedProfile.gameVersion}.json`;
				
				const wasEmpty = originalProfile ? isProfileEmpty(originalProfile) : true;
				const isEmpty = isProfileEmpty(submittedProfile);
				const contentChanged = stringify(fileContent) !== stringify(pruneEmptyValues(originalProfile?.profiles));

				// Only commit a file if its content has actually changed
				// Preserves empty placeholders if they remain empty
				if (contentChanged) {
					if (!isEmpty) {
						// Profile has new content or was updated
						filesToCommit.push({ path: `profiles/${groupId}/${fileName}`, content: stringify(fileContent, { space: 2 }), sha: shas.performance?.[key] });
					} else if (!wasEmpty && isEmpty) {
						// Profile was intentionally cleared
						filesToCommit.push({ path: `profiles/${groupId}/${fileName}`, content: null, sha: shas.performance?.[key] });
					}
				}
			}
			for (const [key, originalProfile] of originalProfilesMap.entries()) {
				if (!submittedProfilesMap.has(key)) { // Profile was deleted
					const fileName = originalProfile.suffix ? `${originalProfile.gameVersion}$${originalProfile.suffix}.json` : `${originalProfile.gameVersion}.json`;
					filesToCommit.push({ path: `profiles/${groupId}/${fileName}`, content: null, sha: shas.performance?.[key] });
				}
			}

			if (changeSummary.some(s => s.includes('graphics'))) {
				const prunedGraphicsData = pruneEmptyValues(graphicsData);
				if (prunedGraphicsData) {
					const originalTopLevelContributors = Array.isArray(originalGraphicsData?.contributor) ? originalGraphicsData.contributor : (typeof originalGraphicsData?.contributor === 'string' ? [originalGraphicsData.contributor] : []);
					const legacyInFileContributors = Array.isArray(originalGraphicsData?.settings?.contributor) ? originalGraphicsData.settings.contributor : (typeof originalGraphicsData?.settings?.contributor === 'string' ? [originalGraphicsData.settings.contributor] : []);
					let combinedOriginal = [...originalTopLevelContributors, ...legacyInFileContributors];
					if (stringify(pruneEmptyValues({ ...prunedGraphicsData, contributor: undefined })) !== stringify(pruneEmptyValues({ ...originalGraphicsData?.settings, contributor: undefined }))) {
						combinedOriginal.push(user.login);
					}
					const newContributors = [...new Set(combinedOriginal)];
					newContributors.forEach(c => allContributors.add(c));
					const fileContent = { contributor: newContributors, ...prunedGraphicsData };
					filesToCommit.push({ path: `graphics/${groupId}.json`, content: stringify(fileContent, { space: 2 }), sha: shas.graphics });
				} else {
					filesToCommit.push({ path: `graphics/${groupId}.json`, content: null, sha: shas.graphics });
				}
			}

			if (changeSummary.some(s => s.includes('YouTube'))) {
				const validYoutubeLinks = youtubeLinks.filter(link => link.url && link.url.trim() !== '');
				if (validYoutubeLinks.length > 0) {
					const originalLinksMap = new Map(originalYoutubeLinks.map(link => [link.url, link.submittedBy]));
					const youtubeFileContent = validYoutubeLinks.map(link => {
						const contributor = originalLinksMap.get(link.url) || user.login;
						if (contributor) allContributors.add(contributor);
						return { url: link.url, notes: link.notes, submittedBy: contributor };
					});
					filesToCommit.push({ path: `videos/${groupId}.json`, content: stringify(youtubeFileContent, { space: 2 }), sha: shas.youtube });
				} else {
					filesToCommit.push({ path: `videos/${groupId}.json`, content: null, sha: shas.youtube });
				}
			}
			
			if (changeSummary.some(s => s.includes('grouping'))) {
				filesToCommit.push({ path: `groups/${groupId}.json`, content: stringify(updatedGroupData.map(g => g.id), { space: 2 }), sha: shas.group });
			}

			if (filesToCommit.length === 0 && !changeSummary.some(s => s.includes('schema'))) {
				return fail(400, { error: 'No changes detected.' });
			}

			const branchName = `contrib/${user.login}/${groupId}-${Date.now()}`;
			const prTitle = `[Contribution] ${gameName} (${groupId})`;
			const prBody = [ `Contribution submitted by @${user.login} for **${gameName}**.`, '', `*   **Title ID:** \`${titleId}\``, `*   **Group ID:** \`${groupId}\``, '', '### Summary of Changes', ...changeSummary.map(c => `*   ${c}`) ].join('\n');
			const commitMessage = [`feat(${groupId}): Update data for ${gameName}`, '', ...[...allContributors].map(c => `Co-authored-by: ${c} <${c}@users.noreply.github.com>`)].join('\n');

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