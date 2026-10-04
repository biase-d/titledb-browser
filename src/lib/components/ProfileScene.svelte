<script>
	import Icon from '@iconify/svelte'
	import { get } from 'svelte/store'
	import { onMount } from 'svelte'
	import { preferences, isReducedMotion } from '$lib/stores/preferences'

	/**
	 * The scene behind a profile, one for each badge: it plays around the profile's
	 * container, with creatures that walk along the top edge of the stats, drift
	 * through, or pop up from it, over a sky and weather of that badge's own colour
	 * A higher badge is a richer scene, not just a different one
	 *
	 * It is two layers. The backdrop sits behind the profile's content. The actors
	 * sit above it, standing on a ledge: `ledge` is how far down the container's top
	 * edge is, in px, so they stand on the stats whatever size the panel is
	 *
	 * Nothing about it is needed: under reduced motion it is a still backdrop, and
	 * on a phone the walkers stay home and only the sky and weather remain
	 *
	 * @type {{ badge: { threshold: number, color: string, icon: string, name: string } | null, ledge?: number }}
	 */
	let { badge, ledge = 0 } = $props()

	let reduced = $state(false)
	onMount(() => {
		const update = () => { reduced = isReducedMotion(get(preferences)) }
		update()
		const unsubscribe = preferences.subscribe(update)
		return unsubscribe
	})

	/**
	 * What each badge brings. weather: the particles drifting through. actors:
	 *  walk   - back and forth along the ledge
	 *  float  - drifts across at a height, bobbing
	 *  fly    - crosses the whole panel in a lazy arc
	 *  sprout - stands on the ledge at a place, pops up, wiggles, sinks and does it again
	 *  drop   - falls from the top onto the ledge and spins away
	 *  clash  - two of them meet in the middle with a burst
	 * @type {Record<number, { sky: string, weather: string, actors: Array<{ icon: string, kind: string, size?: number, at?: number, top?: number, dur?: number, delay?: number, color?: string }> }>}
	 */
	const SCENES = {
		1: {
			sky: 'linear-gradient(180deg, color-mix(in srgb, var(--c) 30%, #1a1208), color-mix(in srgb, var(--c) 14%, #0b0906))',
			weather: 'spore',
			actors: [
				{ icon: 'mdi:mushroom', kind: 'sprout', size: 1.6, at: 10, delay: 0 },
				{ icon: 'mdi:mushroom-outline', kind: 'sprout', size: 1.2, at: 24, delay: 1.4 },
				{ icon: 'mdi:mushroom', kind: 'sprout', size: 2, at: 52, delay: 2.6 },
				{ icon: 'mdi:mushroom', kind: 'sprout', size: 1.4, at: 78, delay: 0.8 },
				{ icon: 'mdi:mushroom', kind: 'walk', size: 1.7, dur: 26, color: '#fbbf24' }
			]
		},
		5: {
			sky: 'linear-gradient(180deg, color-mix(in srgb, var(--c) 28%, #06140c), color-mix(in srgb, var(--c) 12%, #040a06))',
			weather: 'bubble',
			actors: [
				{ icon: 'mdi:grass', kind: 'sprout', size: 1.8, at: 8, delay: 0 },
				{ icon: 'mdi:grass', kind: 'sprout', size: 2.2, at: 38, delay: 1.2 },
				{ icon: 'mdi:grass', kind: 'sprout', size: 1.6, at: 66, delay: 2.2 },
				{ icon: 'mdi:shark', kind: 'walk', size: 2.6, dur: 22 },
				{ icon: 'mdi:bug', kind: 'float', size: 1.1, top: 22, dur: 16, delay: 2, color: '#a7f3d0' },
				{ icon: 'mdi:bug', kind: 'float', size: 0.9, top: 40, dur: 21, delay: 9, color: '#a7f3d0' }
			]
		},
		15: {
			sky: 'linear-gradient(180deg, color-mix(in srgb, var(--c) 26%, #1f1405), color-mix(in srgb, var(--c) 10%, #0a0602))',
			weather: 'bubble',
			actors: [
				{ icon: 'mdi:jellyfish', kind: 'float', size: 2.6, top: 14, dur: 30, delay: 0 },
				{ icon: 'mdi:jellyfish-outline', kind: 'float', size: 1.8, top: 38, dur: 38, delay: 12 },
				{ icon: 'mdi:jellyfish', kind: 'float', size: 3.2, top: 26, dur: 46, delay: 22 },
				{ icon: 'mdi:seaweed', kind: 'sprout', size: 2, at: 14, delay: 0 },
				{ icon: 'mdi:seaweed', kind: 'sprout', size: 2.4, at: 70, delay: 1.5 }
			]
		},
		30: {
			sky: 'linear-gradient(180deg, color-mix(in srgb, var(--c) 24%, #14060c), color-mix(in srgb, var(--c) 10%, #07030a))',
			weather: 'ember',
			actors: [
				{ icon: 'mdi:ghost', kind: 'float', size: 2.4, top: 16, dur: 28, delay: 0 },
				{ icon: 'mdi:ghost-outline', kind: 'float', size: 1.7, top: 34, dur: 36, delay: 11 },
				{ icon: 'mdi:ghost', kind: 'float', size: 2.9, top: 24, dur: 44, delay: 21 },
				{ icon: 'mdi:bat', kind: 'fly', size: 1.4, top: 10, dur: 18, delay: 4, color: '#111' },
				{ icon: 'mdi:ghost', kind: 'walk', size: 1.9, dur: 30, color: '#fff' }
			]
		},
		50: {
			sky: 'linear-gradient(180deg, color-mix(in srgb, var(--c) 30%, #12100e), color-mix(in srgb, var(--c) 12%, #080706))',
			weather: 'dust',
			actors: [
				{ icon: 'mdi:terrain', kind: 'sprout', size: 2.4, at: 12, delay: 0 },
				{ icon: 'mdi:terrain', kind: 'sprout', size: 1.8, at: 46, delay: 1.7 },
				{ icon: 'mdi:terrain', kind: 'sprout', size: 2.6, at: 80, delay: 3 },
				{ icon: 'mdi:arm-flex', kind: 'walk', size: 2.6, dur: 20 },
				{ icon: 'mdi:arm-flex-outline', kind: 'walk', size: 1.6, dur: 31, delay: -10 }
			]
		},
		100: {
			sky: 'linear-gradient(180deg, color-mix(in srgb, var(--c) 34%, #0a0820), color-mix(in srgb, var(--c) 14%, #05040f))',
			weather: 'spark',
			actors: [
				{ icon: 'mdi:sword', kind: 'clash', size: 2.8, delay: 0 },
				{ icon: 'mdi:sword-cross', kind: 'sprout', size: 2.2, at: 14, delay: 0.6 },
				{ icon: 'mdi:sword-cross', kind: 'sprout', size: 2.2, at: 84, delay: 2.2 },
				{ icon: 'mdi:lightning-bolt', kind: 'float', size: 1.4, top: 20, dur: 14, delay: 3, color: '#fde047' }
			]
		},
		200: {
			sky: 'linear-gradient(180deg, color-mix(in srgb, var(--c) 30%, #1c1503), color-mix(in srgb, var(--c) 12%, #0b0801))',
			weather: 'coin',
			actors: [
				{ icon: 'mdi:crown', kind: 'drop', size: 3, at: 50, delay: 0 },
				{ icon: 'mdi:crown-outline', kind: 'sprout', size: 1.6, at: 12, delay: 1.5 },
				{ icon: 'mdi:crown-outline', kind: 'sprout', size: 1.6, at: 86, delay: 3 },
				{ icon: 'mdi:star-four-points', kind: 'float', size: 1.2, top: 18, dur: 12, delay: 2, color: '#fff7c2' }
			]
		},
		300: {
			sky: 'linear-gradient(180deg, color-mix(in srgb, var(--c) 36%, #130a2a), color-mix(in srgb, var(--c) 16%, #090516))',
			weather: 'cloud',
			actors: [
				{ icon: 'mdi:bird', kind: 'fly', size: 3.4, top: 12, dur: 22, delay: 0 },
				{ icon: 'mdi:bird', kind: 'fly', size: 2, top: 30, dur: 30, delay: 11 },
				{ icon: 'mdi:cloud', kind: 'float', size: 3.6, top: 8, dur: 70, delay: 5, color: 'rgba(255,255,255,0.35)' },
				{ icon: 'mdi:cloud', kind: 'float', size: 2.4, top: 40, dur: 90, delay: 40, color: 'rgba(255,255,255,0.25)' }
			]
		},
		400: {
			sky: 'linear-gradient(180deg, color-mix(in srgb, var(--c) 18%, #1b2330), color-mix(in srgb, var(--c) 8%, #0c1119))',
			weather: 'feather',
			actors: [
				{ icon: 'mdi:shield-star', kind: 'float', size: 2.8, top: 14, dur: 40, delay: 0 },
				{ icon: 'mdi:circle-outline', kind: 'sprout', size: 2.2, at: 18, delay: 0, color: '#fde68a' },
				{ icon: 'mdi:circle-outline', kind: 'sprout', size: 2.2, at: 74, delay: 2, color: '#fde68a' },
				{ icon: 'mdi:weather-cloudy', kind: 'float', size: 3, top: 36, dur: 80, delay: 30, color: 'rgba(255,255,255,0.3)' }
			]
		},
		500: {
			sky: 'linear-gradient(180deg, color-mix(in srgb, var(--c) 30%, #201a04), color-mix(in srgb, var(--c) 12%, #0c0902))',
			weather: 'confetti',
			actors: [
				{ icon: 'mdi:hand-back-right', kind: 'walk', size: 2.8, dur: 18 },
				{ icon: 'mdi:palette', kind: 'sprout', size: 2, at: 16, delay: 0 },
				{ icon: 'mdi:brush', kind: 'sprout', size: 2, at: 60, delay: 1.5 },
				{ icon: 'mdi:star-four-points', kind: 'float', size: 1.4, top: 16, dur: 10, delay: 1, color: '#fff7c2' },
				{ icon: 'mdi:star-four-points', kind: 'float', size: 1, top: 30, dur: 13, delay: 6, color: '#ffe6a0' }
			]
		}
	}

	const scene = $derived(badge ? SCENES[badge.threshold] : null)

	/** Particles with a spread that never changes between renders @param {number} n */
	const spread = (n) => Array.from({ length: n }, (_, k) => ({
		left: (k * 37 + 9) % 100,
		delay: -((k * 1.9) % 16),
		dur: 9 + (k % 6) * 2.4,
		size: 0.35 + ((k * 13) % 8) / 10,
		sway: 10 + (k % 5) * 7,
		hue: k % 5
	}))
	const particles = spread(26)
</script>

{#if badge && scene}
	<div class="scene t{badge.threshold}" class:still={reduced} style="--c: {badge.color}; --ledge: {ledge}px" aria-hidden="true">
		<!-- Behind the profile's content: the sky, a soft light, and the weather -->
		<div class="sky" style="background: {scene.sky}"></div>
		<div class="glow"></div>
		{#each particles as p, n (n)}
			<i class="p {scene.weather} h{p.hue}" style="left: {p.left}%; --sz: {p.size}rem; --sway: {p.sway}px; animation-duration: {p.dur}s; animation-delay: {p.delay}s"></i>
		{/each}
	</div>

	<!-- Above it, standing on the top edge of the stats -->
	<div class="actors" class:still={reduced} style="--c: {badge.color}; --ledge: {ledge}px" aria-hidden="true">
		{#each scene.actors as a, n (n)}
			{#if a.kind === 'clash'}
				<span class="actor clash l" style="--sz: {a.size}rem; animation-delay: {a.delay ?? 0}s"><Icon icon={a.icon} /></span>
				<span class="actor clash r" style="--sz: {a.size}rem; animation-delay: {a.delay ?? 0}s"><Icon icon={a.icon} /></span>
				<i class="burst" style="animation-delay: {a.delay ?? 0}s"></i>
			{:else}
				<span
					class="actor {a.kind}"
					style="--sz: {a.size ?? 2}rem; --at: {a.at ?? 0}%; --top: {a.top ?? 20}%; --dur: {a.dur ?? 8}s; animation-delay: {a.delay ?? 0}s; {a.color ? `color: ${a.color};` : ''}"
				><span class="body"><Icon icon={a.icon} /></span></span>
			{/if}
		{/each}
	</div>
{/if}

<style>
	/* ---- The backdrop, behind the profile's content ---- */
	.scene { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; border-radius: inherit; }
	.sky { position: absolute; inset: 0; opacity: 0.9; }
	.glow { position: absolute; inset: 0; background: radial-gradient(60% 90% at 85% 10%, color-mix(in srgb, var(--c) 40%, transparent), transparent 70%); }

	/* ---- Weather ---- */
	.p { position: absolute; top: -1rem; width: var(--sz); height: var(--sz); opacity: 0; animation: fall linear infinite; }
	.p.bubble, .p.spore, .p.spark, .p.ember { top: auto; bottom: -1rem; animation-name: rise; }
	.p.bubble { border-radius: 50%; border: 1.5px solid rgba(255, 255, 255, 0.5); background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.35), transparent 60%); }
	.p.spore { border-radius: 50%; background: color-mix(in srgb, var(--c) 70%, #fff); filter: blur(0.5px); }
	.p.spark { border-radius: 50%; background: #fff; box-shadow: 0 0 8px 2px #fde047; width: calc(var(--sz) * 0.5); height: calc(var(--sz) * 0.5); }
	.p.ember { border-radius: 50%; background: #ff7a45; box-shadow: 0 0 8px 2px rgba(255, 122, 69, 0.8); width: calc(var(--sz) * 0.55); height: calc(var(--sz) * 0.55); }
	.p.dust { border-radius: 50%; background: rgba(255, 255, 255, 0.45); width: calc(var(--sz) * 0.5); height: calc(var(--sz) * 0.5); }
	.p.coin { border-radius: 50%; background: radial-gradient(circle at 30% 25%, #fff3a6, #f5c518 55%, #b8860b); box-shadow: inset 0 0 0 2px #d9a60c; animation-name: fall-spin; }
	.p.feather { width: calc(var(--sz) * 0.5); height: var(--sz); border-radius: 50% 50% 50% 0; background: rgba(255, 255, 255, 0.85); animation-name: fall-sway; }
	.p.cloud { top: auto; bottom: -1rem; border-radius: 99px; width: calc(var(--sz) * 5); height: calc(var(--sz) * 1.3); background: rgba(255, 255, 255, 0.12); filter: blur(5px); animation-name: drift-up; }
	.p.confetti { width: calc(var(--sz) * 0.7); height: var(--sz); animation-name: fall-spin; }
	.p.confetti.h0 { background: #f87171; } .p.confetti.h1 { background: #fbbf24; } .p.confetti.h2 { background: #34d399; } .p.confetti.h3 { background: #60a5fa; } .p.confetti.h4 { background: #c084fc; }

	@keyframes rise { 0% { translate: 0 0; opacity: 0; } 10% { opacity: 0.9; } 100% { translate: var(--sway) -26rem; opacity: 0; } }
	@keyframes fall { 0% { translate: 0 0; opacity: 0; } 10% { opacity: 0.9; } 100% { translate: var(--sway) 26rem; opacity: 0; } }
	@keyframes fall-spin { 0% { translate: 0 0; rotate: 0deg; opacity: 0; } 10% { opacity: 0.95; } 100% { translate: var(--sway) 26rem; rotate: 720deg; opacity: 0; } }
	@keyframes fall-sway { 0% { translate: 0 0; rotate: 0deg; opacity: 0; } 10% { opacity: 0.9; } 50% { translate: var(--sway) 12rem; rotate: 40deg; } 100% { translate: calc(var(--sway) * -1) 26rem; rotate: -20deg; opacity: 0; } }
	@keyframes drift-up { 0% { translate: -4rem 0; opacity: 0; } 20% { opacity: 1; } 100% { translate: 8rem -14rem; opacity: 0; } }

	/* ---- Actors, standing on the top edge of the stats ---- */
	.actors { position: absolute; inset: 0; z-index: 3; overflow: hidden; pointer-events: none; border-radius: inherit; }
	.actor { position: absolute; font-size: var(--sz); line-height: 1; color: color-mix(in srgb, var(--c) 40%, #fff); filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.45)); }
	.actor :global(svg) { display: block; }

	/* Walks to and fro along the ledge, turning at each end */
	.actor.walk { left: 0; top: calc(var(--ledge) - var(--sz) * 0.92); animation: walk-x var(--dur) linear infinite alternate, turn calc(var(--dur) * 2) step-end infinite; }
	.actor.walk .body { display: block; animation: hop 0.7s ease-in-out infinite; }
	@keyframes walk-x { from { left: 3%; } to { left: 91%; } }
	@keyframes turn { 0% { scale: 1 1; } 50% { scale: -1 1; } 100% { scale: 1 1; } }
	@keyframes hop { 50% { translate: 0 -0.35rem; } }

	/* Drifts through at a height */
	.actor.float { left: -8%; top: var(--top); animation: drift var(--dur) linear infinite; }
	.actor.float .body { display: block; animation: bob 4.5s ease-in-out infinite; }
	@keyframes drift { from { left: -8%; } to { left: 106%; } }
	@keyframes bob { 50% { translate: 0 -0.8rem; rotate: 6deg; } }

	.actor.fly { left: -8%; top: var(--top); animation: fly var(--dur) linear infinite; }
	.actor.fly .body { display: block; animation: flap 0.5s ease-in-out infinite; transform-origin: 50% 50%; }
	@keyframes fly { 0% { left: -8%; translate: 0 0; } 30% { translate: 0 -2rem; } 60% { translate: 0 1rem; } 100% { left: 106%; translate: 0 -1rem; } }
	@keyframes flap { 50% { scale: 1 0.7; } }

	/* Pops up from the ledge, wiggles, sinks, and again */
	.actor.sprout { left: var(--at); top: calc(var(--ledge) - var(--sz) * 0.88); transform-origin: 50% 100%; animation: sprout 8s ease-in-out infinite; }
	@keyframes sprout { 0% { scale: 0.1 0.1; opacity: 0; } 8% { scale: 1.15 1.15; opacity: 1; } 12% { scale: 1 1; } 40% { rotate: -6deg; } 55% { rotate: 6deg; } 70% { rotate: 0deg; scale: 1 1; opacity: 1; } 82% { scale: 0.1 0.1; opacity: 0; } 100% { scale: 0.1 0.1; opacity: 0; } }

	/* Falls onto the ledge, spins and fades */
	.actor.drop { left: var(--at); top: -3rem; translate: -50% 0; animation: drop 9s cubic-bezier(0.3, 0, 0.5, 1) infinite; }
	@keyframes drop { 0% { top: -3rem; rotate: -20deg; opacity: 0; } 8% { opacity: 1; } 30% { top: calc(var(--ledge) - var(--sz) * 0.9); rotate: 8deg; } 34% { translate: -50% -0.6rem; } 38% { translate: -50% 0; } 60% { rotate: 360deg; } 80% { opacity: 1; } 100% { top: calc(var(--ledge) - var(--sz) * 0.9); rotate: 360deg; opacity: 0; } }

	/* Two meet in the middle with a burst */
	.actor.clash { top: calc(var(--ledge) - var(--sz) * 1.5); font-size: var(--sz); }
	.actor.clash.l { left: 20%; transform-origin: 100% 100%; animation: clash-l 5s ease-in-out infinite; }
	.actor.clash.r { left: 68%; transform-origin: 0 100%; animation: clash-r 5s ease-in-out infinite; }
	@keyframes clash-l { 0%, 100% { translate: 0 0; rotate: -30deg; } 40% { translate: 8vw 0; rotate: 20deg; } 46% { translate: 7vw 0; rotate: 35deg; } 60% { translate: 0 0; rotate: -30deg; } }
	@keyframes clash-r { 0%, 100% { translate: 0 0; rotate: 30deg; scale: -1 1; } 40% { translate: -8vw 0; rotate: -20deg; scale: -1 1; } 46% { translate: -7vw 0; rotate: -35deg; scale: -1 1; } 60% { translate: 0 0; rotate: 30deg; scale: -1 1; } }
	.burst { position: absolute; left: 50%; top: calc(var(--ledge) - 2.2rem); width: 2.4rem; height: 2.4rem; translate: -50% -50%; border-radius: 50%; background: radial-gradient(circle, #fff, #fde047 40%, transparent 70%); opacity: 0; animation: burst 5s ease-out infinite; }
	@keyframes burst { 0%, 42% { opacity: 0; scale: 0.2; } 44% { opacity: 1; scale: 1.2; } 60% { opacity: 0; scale: 2.2; } 100% { opacity: 0; } }

	/* ---- Narrow panels, and reduced motion: the weather and the walkers stay home ---- */
	@media (max-width: 640px) {
		.actor.walk, .actor.sprout, .actor.clash, .actor.drop { display: none; }
	}
	.still *, .still { animation: none !important; }
	.still .p, .still .actor.float, .still .actor.fly, .still .burst { display: none; }
	.still .actor.sprout { scale: 1 1; opacity: 1; }
	.still .actor.walk { left: 12%; }
	.still .actor.drop { top: calc(var(--ledge) - var(--sz) * 0.9); }
	@media (prefers-reduced-motion: reduce) {
		.scene *, .actors * { animation: none !important; }
		.scene .p, .actors .actor.float, .actors .actor.fly, .actors .burst { display: none; }
	}
	:global(.reduce-motion) .scene *, :global(.reduce-motion) .actors * { animation: none !important; }
	:global(.reduce-motion) .scene .p, :global(.reduce-motion) .actors .actor.float, :global(.reduce-motion) .actors .actor.fly, :global(.reduce-motion) .actors .burst { display: none; }
</style>
