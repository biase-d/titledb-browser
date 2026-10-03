/**
 * How contributions are counted. Shared by the profile pages and /stats so the
 * two cannot disagree about the same person
 *
 * Two things went wrong when each page counted for itself:
 *
 *  - Names were compared exactly, so `biase-d` and `Biase-D` (or a name with a
 *    stray trailing space in a data file) were counted as different people
 *  - A pull request that added a profile and graphics settings was counted as
 *    two contributions, because only profiles carry the PR link
 */

/**
 * The form a contributor name is compared in
 * @param {string | null | undefined} name
 * @returns {string}
 */
export function normalizeContributor (name) {
	return (name ?? '').trim().toLowerCase()
}

/**
 * @typedef {Object} ContributionRow
 * @property {string} groupId
 * @property {number | null} [prNumber]
 * @property {string | null} [sourcePrUrl]
 */

/**
 * The pull request a row came from, as a comparable key, or null when the row
 * does not say
 * @param {ContributionRow} row
 * @returns {string | null}
 */
export function pullRequestKey (row) {
	if (row.prNumber) return `pr-${row.prNumber}`
	const match = row.sourcePrUrl?.match(/\/pull\/(\d+)/i)
	return match ? `pr-${match[1]}` : null
}

/**
 * Counts one person's contributions: distinct pull requests
 *
 * A row with no PR link (graphics settings and videos never have one in the
 * synced data) is the same piece of work as a PR-linked row for the same
 * title group, and is only counted on its own when nothing else covers that
 * group
 * @param {ContributionRow[]} rows
 * @returns {number}
 */
export function countContributions (rows) {
	const keys = new Set()
	const groupsWithPr = new Set()
	/** @type {Set<string>} */
	const unlinkedGroups = new Set()

	for (const row of rows) {
		const key = pullRequestKey(row)
		if (key) {
			keys.add(key)
			groupsWithPr.add(row.groupId)
		} else {
			unlinkedGroups.add(row.groupId)
		}
	}

	for (const groupId of unlinkedGroups) {
		if (!groupsWithPr.has(groupId)) keys.add(`group-${groupId}`)
	}

	return keys.size
}

/**
 * Groups rows by contributor and counts each person's contributions
 *
 * @param {Array<ContributionRow & { contributors: Array<string | null | undefined> }>} rows
 * @returns {Array<{ name: string, contributions: number, groups: number }>} most active first
 */
export function tallyContributors (rows) {
	/** @type {Map<string, { spellings: Map<string, number>, rows: ContributionRow[] }>} */
	const people = new Map()

	for (const row of rows) {
		// One row can list the same person twice (a file entry and a git entry
		// that differ only by case), which must not count twice
		const seen = new Set()
		for (const raw of row.contributors ?? []) {
			const key = normalizeContributor(raw)
			if (!key || seen.has(key)) continue
			seen.add(key)

			let person = people.get(key)
			if (!person) {
				person = { spellings: new Map(), rows: [] }
				people.set(key, person)
			}
			const spelling = /** @type {string} */ (raw).trim()
			person.spellings.set(spelling, (person.spellings.get(spelling) ?? 0) + 1)
			person.rows.push(row)
		}
	}

	return [...people.values()]
		.map(({ spellings, rows: theirRows }) => ({
			// Show the spelling used most often
			name: [...spellings.entries()].sort((a, b) => b[1] - a[1])[0][0],
			contributions: countContributions(theirRows),
			groups: new Set(theirRows.map(r => r.groupId)).size
		}))
		.sort((a, b) => b.contributions - a.contributions || b.groups - a.groups || a.name.localeCompare(b.name))
}
