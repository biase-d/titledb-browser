import { describe, it, expect } from 'vitest'
import crypto from 'node:crypto'
import { verifyGitHubSignature } from '../src/lib/server/webhookSignature.js'

const secret = 'a-shared-secret'
const body = JSON.stringify({ action: 'closed', number: 7 })
const valid = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex')

describe('GitHub webhook signature', () => {
	it('accepts a signature made with the same secret', () => {
		expect(verifyGitHubSignature(body, valid, secret)).toBe(true)
	})

	it('rejects a signature made with a different secret', () => {
		const other = 'sha256=' + crypto.createHmac('sha256', 'wrong').update(body).digest('hex')
		expect(verifyGitHubSignature(body, other, secret)).toBe(false)
	})

	it('rejects when the body has been altered', () => {
		expect(verifyGitHubSignature(body + ' ', valid, secret)).toBe(false)
	})

	it('rejects a missing signature', () => {
		expect(verifyGitHubSignature(body, null, secret)).toBe(false)
	})

	it('rejects everything when no secret is configured', () => {
		expect(verifyGitHubSignature(body, valid, '')).toBe(false)
	})

	it('rejects a truncated signature without throwing', () => {
		expect(verifyGitHubSignature(body, valid.slice(0, 20), secret)).toBe(false)
	})

	it('rejects a signature of the right length but wrong content', () => {
		const tampered = valid.slice(0, -1) + (valid.endsWith('a') ? 'b' : 'a')
		expect(verifyGitHubSignature(body, tampered, secret)).toBe(false)
	})
})
