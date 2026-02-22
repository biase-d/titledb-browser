/**
 * Proxies an image URL through our server for caching and resizing.
 * @param {string} src
 * @param {number} [width]
 * @param {number} [height]
 * @returns {string}
 */
export function proxyImage (src, width = 0, height = 0) {
	if (!src) return src

	// Proxy external images for caching and CORS
	if (src.includes('nintendo.net') || src.includes('githubusercontent.com')) {
		let url = `/api/v1/proxy/image?url=${encodeURIComponent(src)}`
		if (width > 0) url += `&w=${width}`
		if (height > 0) url += `&h=${height}`
		return url
	}

	return src
}

/**
 * Creates an image set with src and srcset for optimized loading.
 * @param {string} src
 * @param {Object} [options]
 * @param {boolean} [options.highRes]
 * @param {number} [options.thumbnailWidth]
 * @param {number} [options.bannerWidth]
 * @returns {{src: string, srcset: string} | null}
 */
export function createImageSet (src, options = {}) {
	if (!src) return null

	const {
		highRes = false,
		thumbnailWidth,
		bannerWidth
	} = options

	// Determine the base width for the current context (fallback to 300 if not specified)
	const baseWidth = thumbnailWidth || bannerWidth || 300

	// For icons/thumbnails, we want 1x and 2x (for Retina displays)
	const x1 = proxyImage(src, baseWidth)

	// Only generate srcset if it's likely to be beneficial (high res requested or large banner)
	if (highRes || baseWidth > 300) {
		const x2 = proxyImage(src, baseWidth * 2)
		return {
			src: x1,
			srcset: `${x1} ${baseWidth}w, ${x2} ${baseWidth * 2}w`
		}
	}

	return {
		src: x1,
		srcset: ''
	}
}
