<script>
	/**
	 * A column chart in inline SVG. Used for the two time series, where the
	 * shape matters more than reading each value
	 *
	 * @typedef {Object} Column
	 * @property {string} label
	 * @property {number} value
	 */

	/** @type {{ items: Column[], selected?: string | null, onselect?: (label: string) => void, caption?: string }} */
	let { items, selected = null, onselect, caption = '' } = $props()

	const HEIGHT = 140
	const GAP = 4

	let max = $derived(Math.max(1, ...items.map(i => i.value)))
	let width = $derived(Math.max(items.length * 28, 336))
	let barWidth = $derived((width - GAP * (items.length - 1)) / Math.max(items.length, 1))
	// Label every column when there is room, otherwise every few
	let step = $derived(items.length > 14 ? Math.ceil(items.length / 10) : 1)
</script>

{#if items.length === 0}
	<p class="empty">Nothing to show for this selection.</p>
{:else}
	<figure>
		<svg viewBox="0 0 {width} {HEIGHT + 22}" role="img" aria-label={caption || 'Column chart'}>
			{#each items as item, i (item.label)}
				{@const h = item.value === 0 ? 0 : Math.max(2, (item.value / max) * HEIGHT)}
				{@const x = i * (barWidth + GAP)}
				{#snippet column()}
					<title>{item.label}: {item.value.toLocaleString()}</title>
					<rect x={x} y="0" width={barWidth} height={HEIGHT} fill="transparent" />
					<rect class="bar" x={x} y={HEIGHT - h} width={barWidth} height={h} rx="3" />
					{#if i % step === 0}
						<text x={x + barWidth / 2} y={HEIGHT + 15} text-anchor="middle">{item.label}</text>
					{/if}
				{/snippet}
				{#if onselect}
					<g
						class="col selectable"
						class:dim={selected && selected !== item.label}
						role="button"
						tabindex="0"
						aria-pressed={selected === item.label}
						aria-label="{item.label}: {item.value}"
						onclick={() => onselect(item.label)}
						onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onselect(item.label)}
					>
						{@render column()}
					</g>
				{:else}
					<g class="col">{@render column()}</g>
				{/if}
			{/each}
		</svg>
	</figure>
{/if}

<style>
	figure { margin: 0; }

	svg {
		display: block;
		width: 100%;
		height: auto;
		max-height: 14rem;
		overflow: visible;
	}

	.bar { fill: var(--primary-color); opacity: 0.85; }
	.col.selectable { cursor: pointer; }
	.col.selectable:hover .bar, .col:focus-visible .bar { opacity: 1; }
	.col:focus-visible { outline: none; }
	.col.dim .bar { opacity: 0.3; }

	text {
		font-size: 9px;
		fill: var(--text-secondary);
	}

	.empty {
		margin: 0;
		color: var(--text-secondary);
		font-size: 0.875rem;
	}
</style>
