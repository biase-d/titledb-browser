import { getGameDetails } from '$lib/games/getGameDetails';
import { getFileSha, createOrUpdateFilesAndDraftPR, GitConflictError } from '$lib/github.js';
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
		shas.performance[key] = await getFileSha(path);
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

			const newGroupId = updatedGroupData[0]?.id || titleId.substring(0, 13) + '000';
            const oldGroupId = currentGroupId || titleId.substring(0, 13) + '000';
            const isGroupMove = newGroupId !== oldGroupId;

			/** @type {{path: string, content: string | null, sha?: string}[]} */
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
					const existingContributors = originalProfile?.contributor || [];
					const newContributors = [...new Set([...existingContributors, user.login])];
					newContributors.forEach(c => allContributors.add(c));
					
					const profiles = pruneEmptyValues(submittedProfile.profiles);
					const fileContent = isProfileEmpty(submittedProfile) 
						? { contributor: newContributors } 
						: { contributor: newContributors, ...profiles };
					
					const fileName = submittedProfile.suffix ? `${submittedProfile.gameVersion}$${submittedProfile.suffix}.json` : `${submittedProfile.gameVersion}.json`;
                    const filePath = `profiles/${newGroupId}/${fileName}`;
                    
                    let shaToUse;
                    if (isGroupMove) {
                        shaToUse = await getFileSha(filePath);
                    } else {
                        shaToUse = shas.performance?.[key];
                    }

					if (!isProfileEmpty(submittedProfile) || isNewEmptyPlaceholder) {
						filesToCommit.push({ path: filePath, content: stringify(fileContent, { space: 2 }), sha: shaToUse });
					} else if (originalProfile && !isProfileEmpty(originalProfile) && !isGroupMove) {
						filesToCommit.push({ path: filePath, content: null, sha: shaToUse });
					}
				}
			}
            
			for (const [key, originalProfile] of originalProfilesMap.entries()) {
                const fileName = originalProfile.suffix ? `${originalProfile.gameVersion}$${originalProfile.suffix}.json` : `${originalProfile.gameVersion}.json`;

                if (isGroupMove) {
                    const oldFilePath = `profiles/${oldGroupId}/${fileName}`;
                    const oldSha = await getFileSha(oldFilePath);
                    
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
                    const oldSha = await getFileSha(oldPath);
                    if (oldSha) filesToCommit.push({ path: oldPath, content: null, sha: oldSha });
                }

                const newPath = `graphics/${newGroupId}.json`;
                let newSha;
                if (isGroupMove) {
                    newSha = await getFileSha(newPath);
                } else {
                    newSha = shas.graphics;
                }

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
					filesToCommit.push({ path: newPath, content: stringify(fileContent, { space: 2 }), sha: newSha });
				} else if (!isGroupMove) {
					filesToCommit.push({ path: newPath, content: null, sha: newSha });
				}
			}

			if (changeSummary.some(s => s.includes('YouTube')) || isGroupMove) {
				const validYoutubeLinks = youtubeLinks.filter(link => link.url && link.url.trim() !== '');
                
                if (isGroupMove) {
                    const oldPath = `videos/${oldGroupId}.json`;
                    const oldSha = await getFileSha(oldPath);
                    if (oldSha) filesToCommit.push({ path: oldPath, content: null, sha: oldSha });
                }

                const newPath = `videos/${newGroupId}.json`;
                let newSha;
                if (isGroupMove) {
                    newSha = await getFileSha(newPath);
                } else {
                    newSha = shas.youtube;
                }

				if (validYoutubeLinks.length > 0) {
					const originalLinksMap = new Map(originalYoutubeLinks.map(link => [link.url, link.submittedBy]));
					const youtubeFileContent = validYoutubeLinks.map(link => {
						const contributor = originalLinksMap.get(link.url) || user.login;
						if (contributor) allContributors.add(contributor);
						return { url: link.url, notes: link.notes, submittedBy: contributor };
					});
					filesToCommit.push({ path: newPath, content: stringify(youtubeFileContent, { space: 2 }), sha: newSha });
				} else if (!isGroupMove) {
					filesToCommit.push({ path: newPath, content: null, sha: newSha });
				}
			}
			
			if (changeSummary.some(s => s.includes('grouping'))) {
				const targetGroupPath = `groups/${newGroupId}.json`;
				const freshSha = await getFileSha(targetGroupPath);

				filesToCommit.push({ path: targetGroupPath, content: stringify(updatedGroupData.map(g => g.id), { space: 2 }), sha: freshSha });
			}

			const isSchemaUpdateOnly = changeSummary.length > 0 && changeSummary.every(s => s.includes('schema'));
			if (changeSummary.length === 0) {
				return fail(400, { error: 'No changes were detected. Please add or modify some data before submitting.' });
			}
			
			if (changeSummary.every(s => s.includes('Added empty placeholder'))) {
				return fail(400, { error: 'No new information was provided. Please add performance, graphics, or video data to submit.' });
			}

			if (filesToCommit.length === 0 && !isSchemaUpdateOnly) {
				return fail(400, { error: 'No changes were detected that would result in a file modification.' });
			}

			const branchName = `contrib/${user.login}/${newGroupId}-${Date.now()}`;
			const prTitle = `[Contribution] ${gameName} (${newGroupId})`;
			const prBody = [ `Contribution submitted by @${user.login} for **${gameName}**.`, '', `*   **Title ID:** \`${titleId}\``, `*   **Group ID:** \`${newGroupId}\``, '', '### Summary of Changes', ...changeSummary.map(c => `*   ${c}`) ].join('\n');
			const commitMessage = [`feat(${newGroupId}): Update data for ${gameName}`, '', ...[...allContributors].map(c => `Co-authored-by: ${c} <${c}@users.noreply.github.com>`)].join('\n');

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