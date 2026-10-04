import { get } from 'svelte/store'
import { preferences, isReducedMotion } from '$lib/stores/preferences'

/**
 * Lets an element settle into place as it scrolls into view: it rises a few
 * pixels and fades in, once
 *
 * Done so that nothing is hidden unless this script has run and the element is
 * still below the fold: the server's markup, a crawler, a print, and anything
 * already on screen when the page loads are all left exactly as they are. Not
 * done at all when animation is reduced
 *
 * @param {HTMLElement} node
 * @param {{ delay?: number }} [options] ms to wait once it is in view
 */
export function reveal (node, options = {}) {
	if (typeof IntersectionObserver === 'undefined' || isReducedMotion(get(preferences))) return

	const rect = node.getBoundingClientRect()
	// Already in view (or above it): leave it alone
	if (rect.top < window.innerHeight * 0.92) return

	node.classList.add('reveal-hidden')

	const observer = new IntersectionObserver(([entry]) => {
		if (!entry.isIntersecting) return
		observer.disconnect()
		const show = () => {
			node.classList.add('reveal-shown')
			// Once it has settled the classes are no use, and a lingering transform
			// would trap fixed and sticky descendants
			setTimeout(() => node.classList.remove('reveal-hidden', 'reveal-shown'), 700)
		}
		if (options.delay) setTimeout(show, options.delay)
		else show()
	}, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
	observer.observe(node)

	return {
		destroy () {
			observer.disconnect()
		}
	}
}
