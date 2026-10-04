<script>
	import StackBar from './StackBar.svelte'

	/**
	 * A column chart whose columns are piles of cartridges. Same job as ColumnChart:
	 * the number of games per label, with a column you can select to filter by
	 *
	 * @typedef {{ label: string, value: number }} Column
	 * @type {{ items: Column[], selected?: string | null, onselect?: (label: string) => void, caption?: string }}
	 */
	let { items, selected = null, onselect, caption = '' } = $props()

	const HEIGHT = 180

	let max = $derived(Math.max(1, ...items.map(i => i.value)))
	// Label every column when there is room, otherwise every few
	let step = $derived(items.length > 14 ? Math.ceil(items.length / 10) : 1)
</script>

{#if items.length === 0}
	<p class="empty">Nothing to show for this selection.</p>
{:else}
	<div class="chart" role="group" aria-label={caption || 'Chart'}>
		{#each items as item, i (item.label)}
			<svelte:element
				this={onselect ? 'button' : 'div'}
				class="col"
				class:selected={selected === item.label}
				type={onselect ? 'button' : undefined}
				aria-pressed={onselect ? selected === item.label : undefined}
				aria-label="{item.label}: {item.value.toLocaleString()}"
				title="{item.label}: {item.value.toLocaleString()}"
				onclick={() => onselect?.(item.label)}
			>
				<span class="value" aria-hidden="true">{item.value.toLocaleString()}</span>
				<span class="slot" style:height="{HEIGHT}px">
					<StackBar
						height={Math.max(14, (item.value / max) * HEIGHT)}
						dim={!!selected && selected !== item.label}
						delay={i * 70}
					/>
				</span>
				<span class="label" aria-hidden="true">{i % step === 0 ? item.label : ''}</span>
			</svelte:element>
		{/each}
	</div>
{/if}

<style>
	.chart {
		display: flex;
		align-items: flex-end;
		gap: 0.35rem;
		padding-top: 0.5rem;
	}

	.col {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		padding: 0;
		background: none;
		border: 0;
		font: inherit;
		color: inherit;
		cursor: default;
	}

	button.col { cursor: pointer; }

	/* The pile leans toward you, so its bottom edge sits a little below its box: room for it */
	.slot {
		width: min(100%, 2.75rem);
		display: flex;
		align-items: flex-end;
		margin-bottom: 0.55rem;
	}

	.value {
		font-size: 0.7rem;
		font-variant-numeric: tabular-nums;
		color: var(--text-secondary);
		opacity: 0;
		transition: opacity 0.2s;
	}

	.col:hover .value,
	.col:focus-visible .value,
	.col.selected .value { opacity: 1; }

	.col:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; border-radius: 6px; }

	.label {
		min-height: 1em;
		font-size: 0.7rem;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
	}

	.col.selected .label { color: var(--primary-color); font-weight: 700; }

	.empty {
		margin: 0;
		color: var(--text-secondary);
		font-size: 0.875rem;
	}
</style>
