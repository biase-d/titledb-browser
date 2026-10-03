import { describe, it, expect } from 'vitest'
import { createImageSet } from '../src/lib/image.js'

const art = 'https://img-eshop.cdn.nintendo.net/i/abc.jpg'

describe('createImageSet', () => {
	it('offers only the 1x file when high-resolution images are off, banners included', () => {
		const banner = createImageSet(art, { highRes: false, bannerWidth: 1000 })
		expect(banner?.srcset).toBe('')
		expect(banner?.src).toContain('w=1000')
		expect(createImageSet(art, { highRes: false, thumbnailWidth: 240 })?.srcset).toBe('')
	})

	it('adds a 2x file only when high-resolution images are on', () => {
		const set = createImageSet(art, { highRes: true, bannerWidth: 800 })
		expect(set?.srcset).toContain('w=1600')
	})
})
