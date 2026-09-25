import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('$lib/repositories/githubRepository', () => ({
	createPullRequest: vi.fn()
}))
vi.mock('$lib/repositories/userRepository', () => ({
	upsertUserAndGetKarma: vi.fn()
}))

const githubRepo = await import('$lib/repositories/githubRepository')
const userRepo = await import('$lib/repositories/userRepository')
const { submitContribution } = await import('../src/lib/services/ContributionService.js')

/**
 * The database + GitHub flow, which every contribution now takes. A submission
 * has to land in two places: a PR for review, and a row that makes it visible
 * on the site immediately
 */
describe('Contribution flow', () => {
	let db
	let inserted

	const user = { id: '42', login: 'someone' }
	const details = {
		groupId: '0100ABC',
		prTitle: 'Add data',
		prBody: 'body',
		commitMessage: 'msg',
		files: [{ path: 'a.json', content: '{}' }],
		rawPerformance: [{ target_fps: 60 }],
		rawGraphics: { settings: {}, contributor: ['someone'] },
		rawYoutube: [{ url: 'https://youtu.be/x' }]
	}

	beforeEach(() => {
		vi.clearAllMocks()
		inserted = []
		db = { insert: () => ({ values: (rows) => { inserted.push(...rows); return Promise.resolve() } }) }
		vi.mocked(githubRepo.createPullRequest).mockResolvedValue({ url: 'https://pr/1', number: 1 })
		vi.mocked(userRepo.upsertUserAndGetKarma).mockResolvedValue(0)
	})

	it('opens a PR and records the submission', async () => {
		const result = await submitContribution(details, user, db)

		expect(result).toEqual({ success: true, url: 'https://pr/1', number: 1 })
		expect(githubRepo.createPullRequest).toHaveBeenCalledTimes(1)
		expect(inserted).toHaveLength(3)
		expect(inserted.map(r => r.type).sort()).toEqual(['graphics', 'performance', 'youtube'])
	})

	it('no longer names branches beta', async () => {
		await submitContribution(details, user, db)

		const { branchName } = vi.mocked(githubRepo.createPullRequest).mock.calls[0][0]
		expect(branchName).toMatch(/^contrib\/someone\/0100ABC-\d+$/)
		expect(branchName).not.toContain('beta')
	})

	it('holds an ordinary contribution as pending', async () => {
		vi.mocked(userRepo.upsertUserAndGetKarma).mockResolvedValue(3)

		await submitContribution(details, user, db)

		expect(inserted.every(r => r.status === 'pending')).toBe(true)
	})

	it('approves a trusted contributor immediately', async () => {
		vi.mocked(userRepo.upsertUserAndGetKarma).mockResolvedValue(50)

		await submitContribution(details, user, db)

		expect(inserted.every(r => r.status === 'approved')).toBe(true)
	})

	it('ties every row to the PR, so the sync can promote them on merge', async () => {
		await submitContribution(details, user, db)

		expect(inserted.every(r => r.githubPrNumber === 1)).toBe(true)
		expect(inserted.every(r => r.groupId === '0100ABC')).toBe(true)
		expect(inserted.every(r => r.userId === '42')).toBe(true)
	})

	it('writes nothing when the PR could not be opened', async () => {
		vi.mocked(githubRepo.createPullRequest).mockResolvedValue(null)

		const result = await submitContribution(details, user, db)

		expect(result.success).toBe(false)
		// Otherwise the site would show a pending change with no PR behind it,
		// and nothing would ever promote or reject it
		expect(inserted).toHaveLength(0)
	})

	it('still succeeds when the PR opened but the database write failed', async () => {
		db = { insert: () => ({ values: () => Promise.reject(new Error('deadlock')) }) }

		const result = await submitContribution(details, user, db)

		// The PR exists and the sync picks it up on merge. Reporting failure
		// would invite a resubmit and a second PR for the same change
		expect(result.success).toBe(true)
		expect(result.url).toBe('https://pr/1')
	})

	it('treats the submission as pending when karma cannot be read', async () => {
		vi.mocked(userRepo.upsertUserAndGetKarma).mockRejectedValue(new Error('timeout'))

		const result = await submitContribution(details, user, db)

		expect(result.success).toBe(true)
		expect(inserted.every(r => r.status === 'pending')).toBe(true)
	})

	it('records only the parts that were actually filled in', async () => {
		await submitContribution({ ...details, rawGraphics: null, rawYoutube: [] }, user, db)

		expect(inserted.map(r => r.type)).toEqual(['performance'])
	})
})
