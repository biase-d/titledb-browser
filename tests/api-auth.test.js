import { describe, it, expect } from 'vitest'
import { isGatedPath, generateToken, hashToken, looksLikeToken, parseBearer, sameDigest, isSameOrigin, createRateLimiter, TOKEN_PREFIX } from '../src/lib/server/apiAuth.js'

describe('tokens', () => {
	it('makes a token of the expected shape, whose hash is the only thing to keep', () => {
		const { token, hash, display } = generateToken()
		expect(token.startsWith(TOKEN_PREFIX)).toBe(true)
		expect(looksLikeToken(token)).toBe(true)
		expect(hash).toBe(hashToken(token))
		expect(hash).toMatch(/^[0-9a-f]{64}$/)
		expect(display.startsWith(TOKEN_PREFIX)).toBe(true)
		expect(token.startsWith(display)).toBe(true)
		expect(display.length).toBeLessThan(token.length)
	})

	it('makes a different token each time', () => {
		expect(generateToken().token).not.toBe(generateToken().token)
	})

	it('rejects strings that are not tokens', () => {
		expect(looksLikeToken('spk_short')).toBe(false)
		expect(looksLikeToken('nope')).toBe(false)
		expect(looksLikeToken(undefined)).toBe(false)
		expect(looksLikeToken(`spk_${'a'.repeat(43)}`)).toBe(true)
	})

	it('compares digests', () => {
		const a = hashToken('x')
		expect(sameDigest(a, hashToken('x'))).toBe(true)
		expect(sameDigest(a, hashToken('y'))).toBe(false)
		expect(sameDigest(a, 'short')).toBe(false)
	})
})

describe('parseBearer', () => {
	it('reads a bearer token in any case, and nothing else', () => {
		expect(parseBearer('Bearer abc')).toBe('abc')
		expect(parseBearer('bearer abc')).toBe('abc')
		expect(parseBearer('Basic abc')).toBeNull()
		expect(parseBearer('Bearer')).toBeNull()
		expect(parseBearer(null)).toBeNull()
		expect(parseBearer('Bearer a b')).toBeNull()
	})
})

describe('isSameOrigin', () => {
	const url = new URL('https://example.com/api/v1/games')
	const req = (headers) => new Request(url, { headers })

	it('trusts what a browser says about where the request came from', () => {
		expect(isSameOrigin(req({ 'sec-fetch-site': 'same-origin' }), url)).toBe(true)
		expect(isSameOrigin(req({ 'sec-fetch-site': 'cross-site' }), url)).toBe(false)
		expect(isSameOrigin(req({ 'sec-fetch-site': 'none' }), url)).toBe(false)
	})

	it('falls back to Origin and then Referer', () => {
		expect(isSameOrigin(req({ origin: 'https://example.com' }), url)).toBe(true)
		expect(isSameOrigin(req({ origin: 'https://evil.example' }), url)).toBe(false)
		expect(isSameOrigin(req({ referer: 'https://example.com/title/1' }), url)).toBe(true)
		expect(isSameOrigin(req({ referer: 'https://example.com.evil.test/x' }), url)).toBe(false)
		expect(isSameOrigin(req({}), url)).toBe(false)
	})
})

describe('createRateLimiter', () => {
	it('allows up to the limit in a window, then says when to come back, then starts again', () => {
		let t = 1000
		const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, now: () => t })
		expect(limiter.hit('a').ok).toBe(true)
		expect(limiter.hit('a').ok).toBe(true)
		const third = limiter.hit('a')
		expect(third.ok).toBe(true)
		expect(third.remaining).toBe(0)
		const fourth = limiter.hit('a')
		expect(fourth.ok).toBe(false)
		expect(fourth.retryAfter).toBeGreaterThan(0)
		expect(fourth.retryAfter).toBeLessThanOrEqual(60)
		expect(limiter.hit('b').ok).toBe(true)
		t += 60_001
		expect(limiter.hit('a').ok).toBe(true)
	})
})

describe('isGatedPath', () => {
	it('gates the data endpoints and leaves the rest open', () => {
		expect(isGatedPath('/api/v1/games')).toBe(true)
		expect(isGatedPath('/api/v1/games/0100000000010000')).toBe(true)
		expect(isGatedPath('/api/v1/games/search')).toBe(true)
		expect(isGatedPath('/api/v1/stats')).toBe(true)
		expect(isGatedPath('/api/v1/status')).toBe(false)
		expect(isGatedPath('/api/health')).toBe(false)
		expect(isGatedPath('/api/version')).toBe(false)
		expect(isGatedPath('/api/v1/proxy/image')).toBe(false)
		expect(isGatedPath('/api/og/0100000000010000.jpg')).toBe(false)
		expect(isGatedPath('/api/v1/gamesx')).toBe(false)
	})
})

import { UsageBuffer, dayOf } from '../src/lib/server/apiUsage.js'

describe('UsageBuffer', () => {
	const t = Date.UTC(2026, 9, 4, 12, 0, 0)

	it('counts requests per user per day, and keeps only the start of a User-Agent', () => {
		const b = new UsageBuffer()
		b.add({ subject: 'token:1', label: 'someone: my bot', userAgent: 'x'.repeat(400), now: t })
		b.add({ subject: 'token:1', now: t + 1000 })
		b.add({ subject: 'ip:1.2.3.4', now: t })
		b.add({ subject: 'token:1', now: t + 24 * 3600 * 1000 })
		expect(b.size).toBe(3)
		const rows = b.drain()
		const first = rows.find(r => r.subject === 'token:1' && r.day === dayOf(t))
		expect(first?.requests).toBe(2)
		expect(first?.label).toBe('someone: my bot')
		expect(first?.userAgent.length).toBe(160)
		expect(rows.find(r => r.subject === 'token:1' && r.day === dayOf(t + 24 * 3600 * 1000))?.requests).toBe(1)
	})

	it('counts the requests that were turned away separately', () => {
		const b = new UsageBuffer()
		b.add({ subject: 'ip:9', now: t })
		b.add({ subject: 'ip:9', limited: true, now: t })
		const [row] = b.drain()
		expect(row.requests).toBe(2)
		expect(row.limited).toBe(1)
	})

	it('is empty once drained', () => {
		const b = new UsageBuffer()
		b.add({ subject: 'a', now: t })
		expect(b.drain().length).toBe(1)
		expect(b.size).toBe(0)
		expect(b.drain()).toEqual([])
	})
})
