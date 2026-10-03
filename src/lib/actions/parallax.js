import { get } from 'svelte/store'
import { preferences, isReducedMotion } from '$lib/stores/preferences'

/**
 * Moves an element a fraction of the way the page scrolls, so it drifts slower
 * than what is around it. Done with a transform in an animation frame, and only
 * while the element is near the screen. Not done at all when animation is reduced
 *
 * @param {HTMLElement} node
 * @param {number} [rate] 0.1 means it moves a tenth as far as the page does
 */
export function parallax (node, rate = 0.12) {
	if (typeof window === 'undefined' || isReducedMotion(get(preferences))) return

	let frame = 0
	let visible = true

	const apply = () => {
		frame = 0
		if (!visible) return
		node.style.transform = `translate3d(0, ${(window.scrollY * rate).toFixed(1)}px, 0)`
	}

	const onScroll = () => {
		if (!frame && visible) frame = requestAnimationFrame(apply)
	}

	const observer = typeof IntersectionObserver === 'undefined'
		? null
		: new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) onScroll() }, { rootMargin: '200px' })
	observer?.observe(node)

	window.addEventListener('scroll', onScroll, { passive: true })
	onScroll()

	return {
		destroy () {
			cancelAnimationFrame(frame)
			observer?.disconnect()
			window.removeEventListener('scroll', onScroll)
			node.style.transform = ''
		}
	}
}
