import { describe, it, expect, vi } from 'vitest'

vi.mock('$lib/services/loggerService', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

import { extractSquareIcon } from '$lib/server/iconBackfill'

const KEY = 'productImage({"shape":"square"})'
const page = (data) => `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script></html>`

describe('extractSquareIcon', () => {
	it("takes the page's own product, not the ones it recommends", () => {
		const html = page({
			a: { nsuid: '70010000101665', [KEY]: { url: 'https://assets.nintendo.com/image/upload/q_auto/f_auto/store/software/switch2/70010000101665/own' } },
			b: { nsuid: '70010000112477', [KEY]: { url: 'https://assets.nintendo.com/image/upload/q_auto/f_auto/store/software/switch2/70010000112477/other' } }
		})
		expect(extractSquareIcon(html)).toMatch(/\/own$/)
	})

	it('accepts the fetch-style url of older titles', () => {
		const url = 'https://assets.nintendo.com/image/fetch/q_auto/f_auto/https://atum-img-lp1.cdn.nintendo.net/i/c/abc_1024'
		expect(extractSquareIcon(page({ p: { nsuid: '1', [KEY]: { url } } }))).toBe(url)
	})

	it('refuses an image from anywhere but Nintendo', () => {
		expect(extractSquareIcon(page({ p: { nsuid: '1', [KEY]: { url: 'https://evil.example/x.jpg' } } }))).toBeNull()
	})

	it('returns null without page data or without a square image', () => {
		expect(extractSquareIcon('<html></html>')).toBeNull()
		expect(extractSquareIcon(page({ p: { nsuid: '1' } }))).toBeNull()
	})
})

import { extractStoreProduct } from '$lib/server/iconBackfill'
import { ensureIconStore } from '$lib/pipeline/schema-manager.js'

describe('extractStoreProduct', () => {
	it('carries the name and the consoles so a wrong-console page can be refused', () => {
		const html = page({
			p: {
				nsuid: '7', name: 'PRAGMATA', platform: { code: 'NINTENDO_SWITCH_2' }, platforms: [{ code: 'NINTENDO_SWITCH_2' }],
				[KEY]: { url: 'https://assets.nintendo.com/image/upload/x' }
			}
		})
		expect(extractStoreProduct(html)).toMatchObject({ nsuid: '7', name: 'PRAGMATA', consoles: ['NINTENDO_SWITCH_2', 'NINTENDO_SWITCH_2'] })
	})
})

describe('ensureIconStore', () => {
	it('only needs a function that runs one statement, as the site has through its pooled drizzle connection', async () => {
		const statements = []
		await ensureIconStore(async (statement) => {
			statements.push(statement)
			return statement.includes('schema_state') ? [{ active_schema: 'layer_b' }] : []
		})
		expect(statements).toHaveLength(3)
		expect(statements[0]).toContain('icon_lookups')
		expect(statements[2]).toContain('"layer_b"."games"')
	})
})
