<script>
	import Icon from '@iconify/svelte'
	import { get } from 'svelte/store'
	import { preferences, isReducedMotion } from '$lib/stores/preferences'

	/**
	 * A badge as a coin: it spins in once when it scrolls into view, a light
	 * crosses it, and it turns over on hover to show what it was earned at
	 * Motion is switched off by the motion setting and by reduced motion
	 *
	 * @type {{ badge: { threshold: number, name: string, color: string, icon: string }, size?: string, earned?: boolean }}
	 */
	let { badge, size = '2.25rem', earned = true } = $props()

	/** @type {HTMLElement | undefined} */
	let el = $state()
	// 'ready' hides the coin until it can spin in; 'go' plays it. Both are only
	// set by script, so with none (or a crawler, or reduced motion) the coin is simply there
	let phase = $state('')

	$effect(() => {
		if (!el || typeof IntersectionObserver === 'undefined' || isReducedMotion(get(preferences))) return
		phase = 'ready'
		const io = new IntersectionObserver(([entry]) => {
			if (!entry.isIntersecting) return
			io.disconnect()
			phase = 'go'
		}, { threshold: 0.6 })
		io.observe(el)
		return () => io.disconnect()
	})
</script>

<span
	class="coin-wrap"
	class:locked={!earned}
	class:ready={phase === 'ready'}
	class:go={phase === 'go'}
	bind:this={el}
	style="--badge-color: {badge.color}; --size: {size}"
	title="{badge.name}, {badge.threshold} contribution{badge.threshold === 1 ? '' : 's'}"
>
	<span class="coin">
		<span class="face front"><Icon icon={badge.icon} /><i class="shine"></i></span>
		<span class="face back" aria-hidden="true">{badge.threshold}</span>
	</span>
</span>

<style>
	.coin-wrap { display: inline-block; width: var(--size); height: var(--size); perspective: 220px; color: #fff; }
	.coin { position: relative; display: block; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform 0.7s cubic-bezier(0.22, 1, 0.36, 1); }
	.coin-wrap:hover .coin { transform: rotateY(180deg); }

	.face {
		position: absolute; inset: 0; display: grid; place-items: center; overflow: hidden;
		border-radius: 50%; backface-visibility: hidden; font-size: calc(var(--size) * 0.48);
		background: radial-gradient(circle at 30% 24%, color-mix(in srgb, var(--badge-color) 45%, white), var(--badge-color) 58%, color-mix(in srgb, var(--badge-color) 72%, black));
		box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.4), inset 0 -3px 5px rgba(0, 0, 0, 0.25), 0 3px 8px rgba(0, 0, 0, 0.22);
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
	}
	.back { transform: rotateY(180deg); font-size: calc(var(--size) * 0.34); font-weight: 800; font-variant-numeric: tabular-nums; }
	.locked .face { filter: grayscale(1) brightness(0.7); opacity: 0.45; }

	.shine {
		position: absolute; inset: -20% auto -20% -60%; width: 40%;
		background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.65), transparent);
		transform: skewX(-18deg); opacity: 0;
	}

	/* Spins in as it arrives, then a light crosses it */
	.ready .coin { transform: rotateY(-540deg) scale(0.6); opacity: 0; }
	.go .coin { animation: coin-in 1s cubic-bezier(0.22, 1, 0.36, 1) backwards; }
	.go .shine { animation: coin-shine 0.9s 0.8s ease-out both; }

	@keyframes coin-in { from { transform: rotateY(-540deg) scale(0.6); opacity: 0; } 60% { opacity: 1; } to { transform: rotateY(0) scale(1); opacity: 1; } }
	@keyframes coin-shine { 0% { left: -60%; opacity: 1; } 100% { left: 130%; opacity: 1; } }

	:global(.reduce-motion) .coin-wrap .coin { transform: none !important; opacity: 1 !important; animation: none !important; }
	:global(.reduce-motion) .coin-wrap .shine { animation: none !important; }
</style>
