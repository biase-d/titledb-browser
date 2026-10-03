import { describe, it, expect } from 'vitest'
import { countContributions, normalizeContributor, pullRequestKey, tallyContributors } from '../src/lib/contributions.js'

const pr = (n, groupId = 'G1') => ({ groupId, sourcePrUrl: `https://github.com/biase-d/nx-performance/pull/${n}` })

describe('pullRequestKey', () => {
	it('prefers the stored PR number, then the number in the URL', () => {
		expect(pullRequestKey({ groupId: 'G', prNumber: 7, sourcePrUrl: '.../pull/9' })).toBe('pr-7')
		expect(pullRequestKey(pr(9))).toBe('pr-9')
		expect(pullRequestKey({ groupId: 'G' })).toBeNull()
	})
})

describe('countContributions', () => {
	it('counts a PR once however many versions it touched', () => {
		expect(countContributions([pr(1), pr(1), pr(1)])).toBe(1)
	})

	it('does not count graphics or videos as extra when their group is covered by a PR', () => {
		expect(countContributions([pr(1, 'G1'), { groupId: 'G1' }])).toBe(1)
	})

	it('counts rows with no PR link once per group', () => {
		expect(countContributions([{ groupId: 'A' }, { groupId: 'A' }, { groupId: 'B' }])).toBe(2)
	})

	it('counts distinct PRs separately', () => {
		expect(countContributions([pr(1), pr(2, 'G2')])).toBe(2)
	})
})

describe('tallyContributors', () => {
	it('treats names that differ by case or whitespace as one person', () => {
		const people = tallyContributors([
			{ ...pr(1), contributors: ['Biase-D'] },
			{ ...pr(2, 'G2'), contributors: ['biase-d '] },
			{ ...pr(3, 'G3'), contributors: ['biase-d'] }
		])
		expect(people).toHaveLength(1)
		expect(people[0].contributions).toBe(3)
		// the most common spelling is shown
		expect(people[0].name).toBe('biase-d')
	})

	it('does not double count a person listed twice on one row', () => {
		const people = tallyContributors([{ ...pr(1), contributors: ['alice', 'Alice'] }])
		expect(people[0].contributions).toBe(1)
	})

	it('ignores empty and null names', () => {
		expect(tallyContributors([{ ...pr(1), contributors: [null, '', '  ', undefined] }])).toEqual([])
	})

	it('ranks by contributions', () => {
		const people = tallyContributors([
			{ ...pr(1), contributors: ['a', 'b'] },
			{ ...pr(2, 'G2'), contributors: ['b'] }
		])
		expect(people.map(p => p.name)).toEqual(['b', 'a'])
	})
})

describe('normalizeContributor', () => {
	it('lowercases and trims', () => {
		expect(normalizeContributor('  Alice ')).toBe('alice')
		expect(normalizeContributor(null)).toBe('')
	})
})
