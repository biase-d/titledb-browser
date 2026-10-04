import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('$lib/storage/context', () => ({ getStorage: () => null }))
vi.mock('$lib/services/loggerService', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

import { getSourceImage, _clearSourceCacheForTesting } from '$lib/server/assetCache'
import { proxyImage } from '$lib/image'

describe('getSourceImage', () => {
	beforeEach(() => {
		_clearSourceCacheForTesting()
		vi.restoreAllMocks()
	})

	it('hits upstream once for concurrent and repeated requests', async () => {
		const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
			new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/jpeg' } })
		)
		const url = 'https://img-eshop.cdn.nintendo.net/a.jpg'
		const results = await Promise.all([getSourceImage(url), getSourceImage(url)])
		await getSourceImage(url)
		expect(fetchMock).toHaveBeenCalledTimes(1)
		expect(results[0].body.length).toBe(3)
	})

	it('carries the upstream status through on failure', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 404 }))
		await expect(getSourceImage('https://x.nintendo.net/missing.jpg')).rejects.toMatchObject({ status: 404 })
	})
})

describe('proxyImage', () => {
	it('does not nest an already proxied url', () => {
		const once = proxyImage('https://x.nintendo.net/a.jpg', 100)
		expect(proxyImage(once, 200)).toBe('/api/v1/proxy/image?url=https%3A%2F%2Fx.nintendo.net%2Fa.jpg&w=200')
	})
	it('proxies full-res when no size is given', () => {
		expect(proxyImage('https://x.nintendo.net/a.jpg')).toBe('/api/v1/proxy/image?url=https%3A%2F%2Fx.nintendo.net%2Fa.jpg')
	})
})

describe('getSourceImage retries', () => {
	it('retries a 503 and succeeds, without retrying a 404', async () => {
		_clearSourceCacheForTesting()
		const fetchMock = vi.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce(new Response('', { status: 503 }))
			.mockResolvedValueOnce(new Response(new Uint8Array([9]), { headers: { 'content-type': 'image/jpeg' } }))
		const result = await getSourceImage('https://x.nintendo.net/flaky.jpg')
		expect(result.body.length).toBe(1)
		expect(fetchMock).toHaveBeenCalledTimes(2)

		fetchMock.mockReset().mockResolvedValue(new Response('', { status: 404 }))
		await expect(getSourceImage('https://x.nintendo.net/gone.jpg')).rejects.toMatchObject({ status: 404 })
		expect(fetchMock).toHaveBeenCalledTimes(1)
	})
})
