import { getGameDetails } from '$lib/games/getGameDetails';
import { GitHubService, GitConflictError } from '$lib/services/GitHubService';
import { prepareFileUpdate, prepareGroupUpdate } from '$lib/services/ContributionService';
import { error, redirect, fail } from '@sveltejs/kit';
import stringify from 'json-stable-stringify';
import { pruneEmptyValues, generateChangeSummary, isProfileEmpty } from '$lib/utils.js';

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
		const suffix = profile.suffix ? `$${profile.suffix}` : '';
		const path = `profiles/${groupId}/${profile.gameVersion}${suffix}.json`;
		const key = profile.suffix ? `${profile.gameVersion}-${profile.suffix}` : profile.gameVersion;
		shas.performance[key] = await GitHubService.getFileSha(path);
	}

	shas.graphics = await GitHubService.getFileSha(`graphics/${groupId}.json`);
	shas.youtube = await GitHubService.getFileSha(`videos/${groupId}.json`);
	shas.group = await GitHubService.getFileSha(`groups/${groupId}.json`);

	return {
		id: titleId,
		name: names[0],
		groupId,
		allTitlesInGroup,
		existingPerformance: performanceHistory,
		existingGraphics: game.graphics,
		existingYoutubeLinks: youtubeLinks,
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
			const currentGroupId = formData.get('currentGroupId');

			const performanceData = JSON.parse(formData.get('performanceData'));
			const graphicsData = JSON.parse(formData.get('graphicsData'));
			const youtubeLinks = JSON.parse(formData.get('youtubeLinks'));
			const updatedGroupData = JSON.parse(formData.get('updatedGroupData'));
			const originalGroupData = JSON.parse(formData.get('originalGroupData'));
			const originalPerformanceData = JSON.parse(formData.get('originalPerformanceData'));
			const originalGraphicsData = JSON.parse(formData.get('originalGraphicsData') || '{}');
			const originalYoutubeLinks = JSON.parse(formData.get('originalYoutubeLinks') || '[]');

			const shas = JSON.parse(formData.get('shas') || '{}');

			const changeSummary = generateChangeSummary(
				{ originalPerformance: originalPerformanceData, originalGraphics: originalGraphicsData, originalYoutubeLinks, originalGroup: originalGroupData },
				{ performanceProfiles: performanceData, graphicsData, youtubeLinks, updatedGroup: updatedGroupData }
			);

			const submittedIds = updatedGroupData.map(g => g.id);
			let newGroupId = null;

			if (currentGroupId && submittedIds.includes(currentGroupId)) {
				newGroupId = currentGroupId;
			}

			if (!newGroupId) {
				for (const id of submittedIds) {
					if (id === currentGroupId) continue;
					const sha = await GitHubService.getFileSha(`groups/${id}.json`);
					if (sha) {
						newGroupId = id;
						break;
					}
				}
			}

			if (!newGroupId) {
				newGroupId = submittedIds[0] || titleId.substring(0, 13) + '000';
			}

			const oldGroupId = currentGroupId || titleId.substring(0, 13) + '000';
			const isGroupMove = newGroupId !== oldGroupId;

			const filesToCommit = [];
			const allContributors = new Set([user.login]);

			const submittedProfilesMap = new Map(performanceData.map(p => [p.gameVersion + (p.suffix || ''), p]));
			const originalProfilesMap = new Map(originalPerformanceData.map(p => [p.gameVersion + (p.suffix || ''), p]));

			for (const [key, submittedProfile] of submittedProfilesMap.entries()) {
				const originalProfile = originalProfilesMap.get(key);
				const contentChanged = stringify(pruneEmptyValues(submittedProfile.profiles)) !== stringify(pruneEmptyValues(originalProfile?.profiles));
				const isNewEmptyPlaceholder = !originalProfile && isProfileEmpty(submittedProfile);
				const needsWrite = contentChanged || isNewEmptyPlaceholder || isGroupMove;

				if (needsWrite) {
					const profiles = pruneEmptyValues(submittedProfile.profiles);
					const fileData = isProfileEmpty(submittedProfile) ? {} : profiles;

					const fileName = submittedProfile.suffix ? `${submittedProfile.gameVersion}$${submittedProfile.suffix}.json` : `${submittedProfile.gameVersion}.json`;
					const filePath = `profiles/${newGroupId}/${fileName}`;
					const update = await prepareFileUpdate(filePath, fileData, user.login, false);

					let finalSha = update.sha;
					if (!isGroupMove && shas.performance?.[key]) {
						finalSha = shas.performance[key];
					}

					if (!isProfileEmpty(submittedProfile) || isNewEmptyPlaceholder) {
						filesToCommit.push({ path: filePath, content: update.content, sha: finalSha });
					} else if (originalProfile && !isProfileEmpty(originalProfile) && !isGroupMove) {
						filesToCommit.push({ path: filePath, content: null, sha: finalSha });
					}
				}
			}

			for (const [key, originalProfile] of originalProfilesMap.entries()) {
				const fileName = originalProfile.suffix ? `${originalProfile.gameVersion}$${originalProfile.suffix}.json` : `${originalProfile.gameVersion}.json`;

				if (isGroupMove) {
					const oldFilePath = `profiles/${oldGroupId}/${fileName}`;
					const oldSha = await GitHubService.getFileSha(oldFilePath);
					if (oldSha) {
						filesToCommit.push({ path: oldFilePath, content: null, sha: oldSha });
					}
				} else if (!submittedProfilesMap.has(key)) {
					const filePath = `profiles/${newGroupId}/${fileName}`;
					const shaToUse = shas.performance?.[key];
					filesToCommit.push({ path: filePath, content: null, sha: shaToUse });
				}
			}

			if (changeSummary.some(s => s.includes('graphics')) || isGroupMove) {
				const prunedGraphicsData = pruneEmptyValues(graphicsData);

				if (isGroupMove) {
					const oldPath = `graphics/${oldGroupId}.json`;
					const oldSha = await GitHubService.getFileSha(oldPath);
					if (oldSha) filesToCommit.push({ path: oldPath, content: null, sha: oldSha });
				}

				const newPath = `graphics/${newGroupId}.json`;

				if (prunedGraphicsData) {
					const update = await prepareFileUpdate(newPath, prunedGraphicsData, user.login, true);

					let finalSha = update.sha;
					if (!isGroupMove && shas.graphics) finalSha = shas.graphics;

					filesToCommit.push({ path: newPath, content: update.content, sha: finalSha });
				} else if (!isGroupMove) {
					filesToCommit.push({ path: newPath, content: null, sha: shas.graphics });
				}
			}

			if (changeSummary.some(s => s.includes('YouTube')) || isGroupMove) {
				const validYoutubeLinks = youtubeLinks.filter(link => link.url && link.url.trim() !== '');

				if (isGroupMove) {
					const oldPath = `videos/${oldGroupId}.json`;
					const oldSha = await GitHubService.getFileSha(oldPath);
					if (oldSha) filesToCommit.push({ path: oldPath, content: null, sha: oldSha });
				}

				const newPath = `videos/${newGroupId}.json`;
				let shaToUse;
				if (isGroupMove) {
					shaToUse = await GitHubService.getFileSha(newPath);
				} else {
					shaToUse = shas.youtube;
				}

				if (validYoutubeLinks.length > 0) {
					const originalLinksMap = new Map(originalYoutubeLinks.map(link => [link.url, link.submittedBy]));
					const youtubeFileContent = validYoutubeLinks.map(link => {
						const contributor = link.submittedBy || originalLinksMap.get(link.url) || user.login;
						if (contributor) allContributors.add(contributor);
						return { url: link.url, notes: link.notes, submittedBy: contributor };
					});
					filesToCommit.push({ path: newPath, content: stringify(youtubeFileContent, { space: 2 }), sha: shaToUse });
				} else if (!isGroupMove) {
					filesToCommit.push({ path: newPath, content: null, sha: shaToUse });
				}
			}

			if (changeSummary.some(s => s.includes('grouping'))) {
				const targetGroupPath = `groups/${newGroupId}.json`;
				const update = await prepareGroupUpdate(targetGroupPath, submittedIds);
				filesToCommit.push({ path: targetGroupPath, content: update.content, sha: update.sha });

				for (const id of submittedIds) {
					if (id !== newGroupId) {
						const staleGroupPath = `groups/${id}.json`;
						const staleSha = await GitHubService.getFileSha(staleGroupPath);
						if (staleSha) {
							filesToCommit.push({ path: staleGroupPath, content: null, sha: staleSha });
						}
					}
				}
			}

			const isSchemaUpdateOnly = changeSummary.length > 0 && changeSummary.every(s => s.includes('schema'));
			if (changeSummary.length === 0) {
				return fail(400, { error: 'No changes were detected.' });
			}

			if (changeSummary.every(s => s.includes('Added empty placeholder'))) {
				return fail(400, { error: 'No new information was provided.' });
			}

			if (filesToCommit.length === 0 && !isSchemaUpdateOnly) {
				return fail(400, { error: 'No changes were detected that would result in a file modification.' });
			}

			const branchName = `contrib/${user.login}/${newGroupId}-${Date.now()}`;
			const prTitle = `[Contribution] ${gameName} (${newGroupId})`;
			const prBody = [`Contribution submitted by @${user.login} for **${gameName}**.`, '', `*   **Title ID:** \`${titleId}\``, `*   **Group ID:** \`${newGroupId}\``, '', '### Summary of Changes', ...changeSummary.map(c => `*   ${c}`)].join('\n');
			const commitMessage = [`feat(${newGroupId}): Update data for ${gameName}`, '', ...[...allContributors].map(c => `Co-authored-by: ${c} <${c}@users.noreply.github.com>`)].join('\n');

			const prUrl = await GitHubService.createPullRequest({
				branchName,
				commitMessage,
				prTitle,
				prBody,
				files: filesToCommit
			});

			if (prUrl) {
				return { success: true, prUrl };
			}
			return fail(500, { error: 'An unexpected error occurred.' });

		} catch (err) {
			if (err instanceof GitConflictError) {
				return fail(409, { error: 'The contribution data has changed since you loaded the page. Please refresh and try again to avoid overwriting recent changes.' });
			}
			console.error('Contribution submission failed:', err);
			return fail(500, { error: 'An unexpected error occurred.' });
		}
	}
};