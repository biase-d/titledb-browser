<script>
	/**
	 * A drifting mosaic of game artwork, behind the signed-out call to action
	 *
	 * Decorative only: aria-hidden, empty alt text, and no part of it is
	 * interactive, so it is invisible to a screen reader and to the keyboard.
	 * The page reads exactly the same with it and without it
	 *
	 * Columns drift at different speeds, which is what stops a grid of squares
	 * reading as a grid. Each column repeats its own images so the loop has no
	 * seam, and the repeat costs nothing - the browser has the file already
	 */
	import { proxyImage } from '$lib/image'

	/**
	 * @typedef {Object} Props
	 * @property {Array<{ id: string, iconUrl: string, iconLqip?: string|null }>} [artwork]
	 * @property {number} [columns]
	 */

	/** @type {Props} */
	let { artwork = [], columns = 4 } = $props()

	// Deal the artwork across columns so neighbours are never the same image
	let dealt = $derived.by(() => {
		/** @type {Array<Array<any>>} */
		const out = Array.from({ length: columns }, () => [])
		artwork.forEach((item, i) => out[i % columns].push(item))
		return out.filter(column => column.length > 0)
	})
</script>

{#if artwork.length > 0}
	<div class="backdrop" aria-hidden="true">
		<div class="mosaic">
			{#each dealt as column, columnIndex (columnIndex)}
				<div
					class="column"
					style:--drift="{38 + columnIndex * 9}s"
					style:--direction={columnIndex % 2 === 0 ? 'normal' : 'reverse'}
				>
					<!-- Twice, so the column can loop back to its start unseen -->
					{#each [...column, ...column] as item, i (`${item.id}-${i}`)}
						<img
							class="tile"
							class:lqip={!!item.iconLqip}
							style:--lqip={item.iconLqip ? `url("${item.iconLqip}")` : null}
							src={proxyImage(item.iconUrl, 200)}
							alt=""
							loading={i === 0 ? 'eager' : 'lazy'}
							decoding="async"
							width="200"
							height="200"
						/>
					{/each}
				</div>
			{/each}
		</div>
		<div class="veil"></div>
	</div>
{/if}

<style>
	.backdrop {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
		z-index: 0;
		border-radius: inherit;
	}

	.mosaic {
		display: flex;
		gap: 0.75rem;
		height: 100%;
		/* Tilted and oversized so the columns run off every edge rather than
		   ending in a visible row of squares */
		transform: rotate(-8deg) scale(1.35);
		transform-origin: center;
	}

	.column {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		flex: 1;
		animation: drift var(--drift) linear infinite;
		animation-direction: var(--direction);
	}

	.tile {
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: 12px;
		flex-shrink: 0;
		/* Dimmed at the source rather than only veiled. Box art is designed to
		   shout, and at full strength it won the page from the words it is
		   supposed to be sitting behind */
		opacity: 0.26;
		filter: saturate(0.75);
	}

	/* Half, because each column holds its images twice: at -50% the second copy
	   sits exactly where the first started, so the jump back is invisible */
	@keyframes drift {
		from { transform: translateY(0); }
		to { transform: translateY(-50%); }
	}

	/* Heaviest where the words are, lightest at the far edge, so the artwork is
	   texture on one side and never competes with text on the other */
	.veil {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(
				to right,
				var(--surface-color) 0%,
				color-mix(in srgb, var(--surface-color) 88%, transparent) 55%,
				color-mix(in srgb, var(--surface-color) 62%, transparent) 100%
			),
			linear-gradient(
				to bottom,
				var(--surface-color) 0%,
				transparent 30%,
				transparent 70%,
				var(--surface-color) 100%
			);
	}

	/* Motion is the decoration, not the content: without it the mosaic is still
	   a mosaic, so it simply stops */
	@media (prefers-reduced-motion: reduce) {
		.column {
			animation: none;
		}
	}
</style>
