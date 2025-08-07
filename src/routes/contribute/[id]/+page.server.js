import { getGameDetails } from '$lib/games/getGameDetails';
import { getFileSha, createOrUpdateFilesAndDraftPR, GitConflictError } from '$lib/github.js';
import { error, redirect, fail } from '@sveltejs/kit';
import { isEqual } from 'lodash-es';

/**
 * Checks if a graphics object is effectively empty
 * @param {any} graphics
 * @returns {boolean}
 */
function isGraphicsEmpty (graphics) {
	if (!graphics || Object.keys(graphics).length === 0) return true;

	const isModeDataEmpty = (modeData) => {
		if (!modeData) return true;
		const res = modeData.resolution;
		if (res && (res.fixedResolution || res.minResolution || res.maxResolution || res.multipleResolutions?.[0] || res.notes)) return false;

		const fps = modeData.framerate;
		if (fps && (fps.targetFps || fps.notes)) return false;

		const custom = modeData.custom;
		if (custom && Object.values(custom).some(c => c.value || c.notes)) return false;

		return true;
	}

	const shared = graphics.shared;
	if (shared && Object.values(shared).some(s => s.value || s.notes)) return false;

	return isModeDataEmpty(graphics.docked) && isModeDataEmpty(graphics.handheld);
}

/**
 * Checks if a performance profile is effectively empty
 * @param {any} profile
 * @returns {boolean}
 */
function isProfileEmpty(profile) {
	if (!profile || !profile.profiles) return true;
	const { docked, handheld } = profile.profiles;

	const isModeEmpty = (mode) => {
		if (!mode) return true;
		const hasContent = mode.resolution || mode.resolutions || mode.min_res || mode.max_res || mode.resolution_notes || mode.fps_notes || mode.target_fps;
		return !hasContent;
	};

	return isModeEmpty(docked) && isModeEmpty(handheld);
}


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
			const changeSummary = JSON.parse(formData.get('changeSummary') || '[]');
			const shas = JSON.parse(formData.get('shas'));

			const groupId = updatedGroupData[0]?.groupId || titleId.substring(0, 13) + '000';

			const validateFps = (fps) => {
				if (fps === null || fps === undefined || fps === '') return true;
				const num = Number(fps);
				return Number.isInteger(num) && num > 0 && num <= 240;
			};

			for (const profile of performanceData) {
				if (!validateFps(profile.profiles.docked?.target_fps) || !validateFps(profile.profiles.handheld?.target_fps)) {
					return fail(400, { error: 'Invalid FPS value in performance profiles. Must be a whole number between 1 and 240.' });
				}
			}

			if (graphicsData && (graphicsData.docked || graphicsData.handheld)) {
				if (!validateFps(graphicsData.docked?.framerate?.targetFps) || !validateFps(graphicsData.handheld?.framerate?.targetFps)) {
					return fail(400, { error: 'Invalid FPS value in graphics settings. Must be a whole number between 1 and 240.' });
				}
			}

			/** @type {{path: string, content: string | null, sha?: string}[]} */
			const filesToCommit = [];
			const allContributors = new Set([user.login]);

			const submittedPerformanceData = performanceData.filter(p => p.gameVersion && p.gameVersion.trim() !== '');

			const submittedProfilesMap = new Map(submittedPerformanceData.map(p => {
				const key = p.suffix ? `${p.gameVersion}$${p.suffix}` : p.gameVersion;
				return [key, p];
			}));
			const originalProfilesMap = new Map(originalPerformanceData.map(p => {
				const key = p.suffix ? `${p.gameVersion}$${p.suffix}` : p.gameVersion;
				return [key, p];
			}));

			for (const [key, submittedProfile] of submittedProfilesMap.entries()) {
				const originalProfile = originalProfilesMap.get(key);
				if (originalProfile?.contributor) allContributors.add(originalProfile.contributor);

				const fileContent = submittedProfile.profiles;

				const fileName = submittedProfile.suffix
					? `${submittedProfile.gameVersion}$${submittedProfile.suffix}.json`
					: `${submittedProfile.gameVersion}.json`;

				filesToCommit.push({
					path: `profiles/${groupId}/${fileName}`,
					content: JSON.stringify(fileContent, null, 2),
					sha: shas.performance?.[key]
				});
			}

			for (const [key, originalProfile] of originalProfilesMap.entries()) {
				if (!submittedProfilesMap.has(key)) {
					const fileName = originalProfile.suffix
						? `${originalProfile.gameVersion}$${originalProfile.suffix}.json`
						: `${originalProfile.gameVersion}.json`;
					filesToCommit.push({ path: `profiles/${groupId}/${fileName}`, content: null, sha: shas.performance?.[key] });
				}
			}

			if (!isGraphicsEmpty(graphicsData)) {
				const existingContributors = Array.isArray(originalGraphicsData?.contributor) ? originalGraphicsData.contributor : [];
				const newContributors = [...new Set([...existingContributors, user.login])];

				newContributors.forEach(c => allContributors.add(c));

				const fileContent = { ...graphicsData, contributor: newContributors };

				filesToCommit.push({
					path: `graphics/${groupId}.json`,
					content: JSON.stringify(fileContent, null, 2),
					sha: shas.graphics
				});
			} else if (originalGraphicsData && Object.keys(originalGraphicsData).length > 0) {
				// If user cleared all previously existing graphics data
				filesToCommit.push({ path: `graphics/${groupId}.json`, content: null, sha: shas.graphics });
			}

			const validYoutubeLinks = youtubeLinks.filter(link => link.url && link.url.trim() !== '');

			if (validYoutubeLinks.length > 0) {
				const originalLinksMap = new Map(originalYoutubeLinks.map(link => [link.url, link.submittedBy]));
				const youtubeFileContent = validYoutubeLinks.map(link => {
					const contributor = originalLinksMap.get(link.url) || user.login;
					if (contributor) allContributors.add(contributor);
					return { url: link.url, notes: link.notes, submittedBy: contributor };
				});

				filesToCommit.push({
					path: `videos/${groupId}.json`,
					content: JSON.stringify(youtubeFileContent, null, 2),
					sha: shas.youtube
				});
			} else if (originalYoutubeLinks.length > 0) {
				// If the user deleted all previously existing links
				filesToCommit.push({ path: `videos/${groupId}.json`, content: null, sha: shas.youtube });
			}

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