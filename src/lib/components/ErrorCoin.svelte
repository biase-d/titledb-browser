<script>
	/**
	 * A gold coin for the page that broke: it comes in spinning fast and slows,
	 * turn by turn, until it settles face-on. A few thin discs between the two faces
	 * give it an edge. Still when motion is reduced
	 */
	const EDGES = 7
</script>

<div class="coin-stage" aria-hidden="true">
	<div class="shadow"></div>
	<div class="coin">
		{#each Array(EDGES) as _, i}
			<span class="edge" style="transform: translateZ({(i - (EDGES - 1) / 2) * 1.6}px)"></span>
		{/each}
		<span class="face front"><i class="slot"></i></span>
		<span class="face back"><i class="slot"></i></span>
	</div>
</div>

<style>
	.coin-stage { position: relative; width: 5.5rem; height: 6.5rem; margin: 0 auto 0.5rem; perspective: 600px; }
	.coin { position: absolute; inset: 0 0 1rem; transform-style: preserve-3d; animation: settle 4.2s cubic-bezier(0.12, 0.6, 0.25, 1) both; }
	.edge, .face {
		position: absolute; inset: 0; border-radius: 50%;
		background: radial-gradient(circle at 32% 26%, #fff1a8, #f5c518 45%, #b8860b);
	}
	.edge { filter: brightness(0.75); }
	.face { backface-visibility: hidden; box-shadow: inset 0 0 0 0.3rem #d9a60c, inset 0 0 0 0.45rem rgba(255, 244, 170, 0.7); }
	.front { transform: translateZ(6px); }
	.back { transform: rotateY(180deg) translateZ(6px); }
	/* The slot down the middle of the face */
	.slot { position: absolute; left: 50%; top: 24%; width: 18%; height: 52%; translate: -50% 0; border-radius: 99px; background: linear-gradient(90deg, #c99408, #f7d74a 60%, #e8b80f); box-shadow: inset 0 0 0 2px rgba(120, 80, 0, 0.35); }

	.shadow { position: absolute; left: 50%; bottom: 0.2rem; width: 3.6rem; height: 0.7rem; translate: -50% 0; border-radius: 50%; background: radial-gradient(rgba(0, 0, 0, 0.3), transparent 70%); animation: shadow 4.2s cubic-bezier(0.12, 0.6, 0.25, 1) both; }

	/* Seven turns, the early ones fast, the last barely moving, ending face-on */
	@keyframes settle { from { transform: translateY(-0.4rem) rotateY(0); } to { transform: translateY(0) rotateY(2520deg); } }
	@keyframes shadow { from { scale: 0.6 1; opacity: 0.4; } to { scale: 1 1; opacity: 1; } }

	@media (prefers-reduced-motion: reduce) { .coin, .shadow { animation: none; } }
	:global(.reduce-motion) .coin-stage .coin, :global(.reduce-motion) .coin-stage .shadow { animation: none !important; }
</style>
