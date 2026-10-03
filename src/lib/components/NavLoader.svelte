<script>
	import { navigating } from '$app/stores'

	/**
	 * While a page is loading, a small cartridge turns in the corner. Plain CSS 3D,
	 * so a page that has no cartridges does not have to fetch a WebGL library just
	 * to wait. It only appears if the wait is long enough to notice, so quick
	 * navigations never flash it
	 */

	let visible = $state(false)

	$effect(() => {
		if (!$navigating) { visible = false; return }
		const timer = setTimeout(() => { visible = true }, 350)
		return () => clearTimeout(timer)
	})
</script>

{#if visible}
	<div class="loader" role="status" aria-label="Loading">
		<div class="card">
			<span class="face front"><i class="band"></i><i class="art"></i></span>
			<span class="face back"><i class="pins"></i></span>
		</div>
	</div>
{/if}

<style>
	.loader {
		position: fixed;
		right: 1.25rem;
		bottom: calc(1.25rem + env(safe-area-inset-bottom, 0px));
		z-index: 120;
		perspective: 300px;
		pointer-events: none;
		animation: arrive 0.25s ease-out both;
	}

	@keyframes arrive {
		from { opacity: 0; transform: translateY(12px); }
		to { opacity: 1; transform: none; }
	}

	.card {
		position: relative;
		width: 1.6rem;
		height: 2.36rem;
		transform-style: preserve-3d;
		animation: turn 1.8s linear infinite;
	}

	@keyframes turn {
		to { transform: rotateY(360deg); }
	}

	.face {
		position: absolute;
		inset: 0;
		border-radius: 0.3rem;
		background: #111113;
		backface-visibility: hidden;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.back { transform: rotateY(180deg); }

	.band {
		position: absolute;
		left: 0.2rem;
		right: 0.2rem;
		top: 0.3rem;
		height: 0.55rem;
		border-radius: 0.1rem 0.1rem 0 0;
		background: var(--primary-color);
	}

	.art {
		position: absolute;
		left: 0.2rem;
		right: 0.2rem;
		top: 0.85rem;
		bottom: 0.55rem;
		border-radius: 0 0 0.1rem 0.1rem;
		background: linear-gradient(160deg, #6b6f7b, #3b3e47);
	}

	.pins {
		position: absolute;
		left: 0.3rem;
		right: 0.3rem;
		bottom: 0.3rem;
		height: 1.1rem;
		background: repeating-linear-gradient(90deg, #5fd16b 0 0.2rem, transparent 0.2rem 0.34rem);
		border-radius: 0.1rem;
	}

	/* With motion reduced it does not turn; it only sits there, so it still says "loading" */
	:global(.reduce-motion) .card { animation: none; }
</style>
