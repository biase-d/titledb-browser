<script>
	import { onMount } from 'svelte'
	import { get } from 'svelte/store'
	import { preferences, isReducedMotion } from '$lib/stores/preferences'

	/**
	 * A number that counts up to its value the first time it scrolls into view
	 *
	 * The server renders the final number, so with no script (or a crawler, or
	 * reduced motion) that is what is there. Only in a browser that can animate,
	 * and only once it is actually on screen, does it start from nothing
	 *
	 * @type {{ value: number, suffix?: string, decimals?: number, duration?: number }}
	 */
	let { value, suffix = '', decimals = 0, duration = 900 } = $props()

	/** @type {HTMLElement | undefined} */
	let el = $state()
	/** The number being shown; null until it has been asked to animate */
	let shown = $state(/** @type {number | null} */ (null))

	let text = $derived(
		(shown ?? value).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix,
	)

	let first = true
	let frame = 0

	/** @param {number} from @param {number} to */
	function run (from, to) {
		cancelAnimationFrame(frame)
		const start = performance.now()
		const tick = (/** @type {number} */ now) => {
			const t = Math.min(1, (now - start) / duration)
			// Fast at first, settling into the number
			shown = from + (to - from) * (1 - Math.pow(1 - t, 3))
			if (t < 1) frame = requestAnimationFrame(tick)
			else shown = null
		}
		frame = requestAnimationFrame(tick)
	}

	onMount(() => {
		if (!el || typeof IntersectionObserver === 'undefined' || isReducedMotion(get(preferences))) return
		const observer = new IntersectionObserver(([entry]) => {
			if (!entry.isIntersecting) return
			observer.disconnect()
			run(0, value)
		}, { threshold: 0.4 })
		observer.observe(el)
		return () => {
			observer.disconnect()
			cancelAnimationFrame(frame)
		}
	})

	// A later change (a filter) counts from where it was to the new value
	let previous = value
	$effect(() => {
		const next = value
		if (first) { first = false; previous = next; return }
		if (next !== previous && !isReducedMotion(get(preferences))) run(previous, next)
		previous = next
	})
</script>

<span bind:this={el} class="count">{text}</span>

<style>
	.count { font-variant-numeric: tabular-nums; }
</style>
