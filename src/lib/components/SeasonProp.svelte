<script>
	import { onMount } from 'svelte'
	import { page } from '$app/state'
	import { preferences, isReducedMotion } from '$lib/stores/preferences'
	import { activeScenes } from '$lib/seasons'
	import SeasonSymbols from '$lib/components/SeasonSymbols.svelte'

	/**
	 * A seasonal object standing next to a hero cartridge: a lit pumpkin for
	 * Halloween, a pile of leaves for autumn, a snowman for winter (its scarf takes
	 * the theme's accent colour). Put inside a positioned wrapper; it sits to the left of it
	 *
	 * It follows the same calendar as the scene behind the page (so it is put up
	 * gradually, a small one first and a second one once the month is fully
	 * dressed, and comes down with it), the same Settings switch, and the same
	 * ?season=halloween preview. It is not drawn on the server, so a crawler
	 * never sees it. Under reduced motion it is there but does not flicker
	 */
	let mounted = $state(false)
	let now = $state(new Date())

	onMount(() => {
		mounted = true
		const timer = setInterval(() => { now = new Date() }, 10 * 60 * 1000)
		return () => clearInterval(timer)
	})

	// The fullest scene that is up (none when the visitor has switched seasons off)
	let scene = $derived(mounted ? activeScenes($preferences.seasonal, page.url.searchParams, now)[0] : undefined)
	let intensity = $derived(scene?.intensity ?? 0)
	let kind = $derived(scene?.season.name ?? 'halloween')
	let reduced = $derived(mounted && isReducedMotion($preferences))
	// Nothing until the scene is a little way up, then it grows with it
	let scale = $derived(0.75 + 0.25 * intensity)

	/**
	 * What stands up, nearest the cartridge first, and how far up the scene has to
	 * be before each piece appears. So the row is built the way the scene is:
	 * the first piece, then its companions, one after another. `w` is its width
	 * against the first piece
	 * @type {Record<string, Array<{ id: string, at: number, w: number }>>}
	 */
	const SETS = {
		halloween: [
			{ id: 'pumpkin', at: 0.25, w: 1 },
			{ id: 'candy', at: 0.4, w: 0.45 },
			{ id: 'ghost', at: 0.55, w: 0.62 },
			{ id: 'pumpkin-small', at: 0.72, w: 0.5 },
			{ id: 'bat', at: 0.88, w: 0.4 }
		],
		autumn: [
			{ id: 'leaves', at: 0.25, w: 1 },
			{ id: 'acorn', at: 0.4, w: 0.34 },
			{ id: 'mushroom', at: 0.55, w: 0.5 },
			{ id: 'leaves-small', at: 0.72, w: 0.55 }
		],
		winter: [
			{ id: 'snowman', at: 0.25, w: 1 },
			{ id: 'present', at: 0.4, w: 0.5 },
			{ id: 'pine', at: 0.55, w: 0.6 },
			{ id: 'mound', at: 0.72, w: 0.55 }
		]
	}

	let pieces = $derived((SETS[/** @type {keyof typeof SETS} */ (kind)] ?? []).filter(piece => intensity >= piece.at))
</script>

{#if pieces.length}
	<div class="prop {kind}" class:still={reduced} style="--scale: {scale}" aria-hidden="true">
		{#each pieces as piece (piece.id)}
			<svg class="piece {piece.id}" style="width: {piece.w * 100}%" viewBox="0 0 100 90">
				<use href="#prop-{piece.id}" />
			</svg>
		{/each}
	</div>
{/if}

<SeasonSymbols />

<style>
	/* The row stands to the left of the wrapper, the first piece nearest it, the
	   rest further out. Where there is no room on that side the parent moves it
	   (--prop-right) or limits it (--prop-width, --prop-lift) */
	.prop {
		position: absolute;
		right: var(--prop-right, 100%);
		bottom: var(--prop-lift, 0);
		width: var(--prop-width, 62%);
		margin-right: 0.25rem;
		display: flex;
		flex-direction: row-reverse;
		align-items: flex-end;
		gap: 2%;
		pointer-events: none;
		z-index: 0;
		transform-origin: 100% 100%;
		scale: var(--scale);
		filter: drop-shadow(0 0 14px rgba(255, 150, 40, 0.35));
	}
	.prop.autumn { filter: drop-shadow(0 0 10px rgba(240, 170, 60, 0.25)); }
	.prop.winter { filter: drop-shadow(0 0 12px rgba(180, 215, 255, 0.4)); }

	.piece { flex: none; display: block; height: auto; animation: pk-in 0.9s cubic-bezier(0.22, 1, 0.36, 1) backwards; transform-origin: 50% 100%; }
	/* A bat hangs above the ground rather than standing on it */
	.piece.bat { align-self: flex-start; margin-bottom: 40%; }

	.prop :global(.face) { animation: pk-flicker 3.2s ease-in-out infinite; }
	.prop :global(.leaf) { animation: sway 5s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 100%; }
	.prop :global(.bob) { animation: bob 4s ease-in-out infinite; }
	.still :global(.face), .still :global(.leaf), .still :global(.bob) { animation: none; }

	@keyframes pk-in { from { opacity: 0; transform: translateY(10px) scale(0.6); } }
	@keyframes pk-flicker { 0%, 100% { opacity: 1; } 42% { opacity: 0.82; } 48% { opacity: 1; } 71% { opacity: 0.9; } }
	@keyframes sway { 50% { transform: rotate(4deg); } }
	@keyframes bob { 50% { transform: translateY(-4px); } }

	@media (prefers-reduced-motion: reduce) {
		.piece, .prop :global(.face), .prop :global(.leaf), .prop :global(.bob) { animation: none; }
	}
	:global(.reduce-motion) .piece, :global(.reduce-motion) .prop :global(.face), :global(.reduce-motion) .prop :global(.leaf), :global(.reduce-motion) .prop :global(.bob) { animation: none !important; }
</style>
