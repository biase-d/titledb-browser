import * as gameRepo from '$lib/repositories/gameRepository'
import { Game } from '$lib/models/Game'
import { GitHubService } from '$lib/services/GitHubService'

/**
 * @type {import('./$types').PageServerLoad}
 */
export async function load ({ locals }) {
	const pulls = await GitHubService.getOpenPullRequests()

	/** @type {Array<{prNumber: number, groupId: string|null, title: string, prUrl: string, submittedAt: string, contributors: string[], changeSummary: string[], game?: any}>} */
	const prGroups = []
	const groupIdsToFetch = new Set()

	for (const pr of pulls) {
		const groupIdMatch = pr.body?.match(/\*\*Group ID:\*\*\s*`([A-F0-9]+)`/i)
		const groupId = groupIdMatch ? groupIdMatch[1] : null

		if (groupId) {
			groupIdsToFetch.add(groupId)
		}

		const summaryMatch = pr.body?.match(/### Summary of Changes\n([\s\S]*)/)
		/** @type {string[]} */
		let changeSummary = []
		if (summaryMatch) {
			changeSummary = summaryMatch[1]
				.split('\n')
				.map(/** @param {string} line */ line => line.trim())
				.filter(/** @param {string} line */ line => line.startsWith('*'))
				.map(/** @param {string} line */ line => line.replace(/^\*\s*/, ''))
		}

		prGroups.push({
			prNumber: pr.number,
			groupId,
			title: pr.title,
			prUrl: pr.html_url,
			submittedAt: pr.created_at,
			contributors: pr.user?.login ? [pr.user.login] : [],
			changeSummary,
			// Keep contributions object dummy since the frontend still expects it initially,
			// or we can remove it entirely if we refactor the Svelte side correctly.
		})
	}

	/** @type {any[]} */
	let games = []
	if (groupIdsToFetch.size > 0) {
		const rawGames = await gameRepo.getGamesForGroups(locals.db, Array.from(groupIdsToFetch))
		games = rawGames.map(g => new Game({ game: g }))
	}

	for (const group of prGroups) {
		if (group.groupId) {
			// @ts-ignore
			group.game = games.find(g => g.groupId === group.groupId) || null
		}
	}

	return {
		groups: prGroups.sort((a, b) => b.prNumber - a.prNumber)
	}
}
