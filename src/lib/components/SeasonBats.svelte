<script>
	import SeasonSymbols from '$lib/components/SeasonSymbols.svelte'
	import { useSeason } from '$lib/useSeason.svelte.js'

	/**
	 * Halloween's bats, in a layer of their own above everything in the hero: the
	 * title, the buttons and the cartridge (which is drawn on a canvas above the
	 * page), and beneath the site's header. Put beside the hero, in a wrapper that
	 * is positioned and the same size; it reaches a little above and below it
	 *
	 * They come in a few at a time as the season fills in, and are not there at all
	 * when motion is reduced, since a still bat is only a smudge
	 */
	const season = useSeason()
	let up = $derived(season.kind === 'halloween' && !season.reduced)
	let i = $derived(season.intensity)

	// top: % of the layer. from: which side it starts on
	const bats = [
		{ at: 0.6, top: 22, dur: 17, delay: -2, scale: 0.7, from: 'l' },
		{ at: 0.65, top: 48, dur: 23, delay: -11, scale: 0.5, from: 'r' },
		{ at: 0.8, top: 12, dur: 29, delay: -17, scale: 0.9, from: 'l' },
		{ at: 0.88, top: 62, dur: 21, delay: -6, scale: 0.45, from: 'r' },
		{ at: 0.95, top: 34, dur: 33, delay: -22, scale: 0.65, from: 'l' }
	]
</script>

<SeasonSymbols />

{#if up}
	<div class="bats" aria-hidden="true">
		{#each bats as b, n (n)}
			{#if i >= b.at}
				<svg class="bat {b.from}" viewBox="0 0 100 90" style="top: {b.top}%; --s: {b.scale}; animation-duration: {b.dur}s; animation-delay: {b.delay}s"><use href="#prop-bat" /></svg>
			{/if}
		{/each}
	</div>
{/if}

<style>
	/* Above the cartridge's canvas (40), below the header (50) */
	.bats {
		position: absolute;
		inset: -1.5rem 0;
		z-index: 45;
		pointer-events: none;
	}

	.bat {
		position: absolute;
		width: calc(5rem * var(--s));
		animation: fly-r linear infinite;
		filter: drop-shadow(0 0 6px rgba(0, 0, 0, 0.45));
	}
	.bat.r { animation-name: fly-l; }
	.bat :global(.bob) { animation: flap 0.34s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 50%; }

	/* Across the whole width, rising and dipping as it goes. Left, not a translate,
	   so the distance follows the width of the hero */
	@keyframes fly-r {
		0% { left: -8%; translate: 0 0; rotate: 4deg; }
		25% { left: 22%; translate: 0 -2.8rem; rotate: -6deg; }
		50% { left: 52%; translate: 0 1.2rem; rotate: 5deg; }
		75% { left: 80%; translate: 0 -2rem; rotate: -4deg; }
		100% { left: 108%; translate: 0 0; rotate: 3deg; }
	}
	@keyframes fly-l {
		0% { left: 108%; translate: 0 0; rotate: -4deg; scale: -1 1; }
		25% { left: 78%; translate: 0 2.4rem; rotate: 6deg; scale: -1 1; }
		50% { left: 46%; translate: 0 -1.4rem; rotate: -5deg; scale: -1 1; }
		75% { left: 20%; translate: 0 2rem; rotate: 4deg; scale: -1 1; }
		100% { left: -8%; translate: 0 0; rotate: -3deg; scale: -1 1; }
	}
	@keyframes flap { 50% { transform: scaleY(0.55); } }
</style>
