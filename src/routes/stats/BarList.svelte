<script>
	/**
	 * Horizontal bars as plain markup: readable without hovering, selectable from
	 * the keyboard, and nothing to register or size
	 *
	 * @typedef {Object} Item
	 * @property {string} label
	 * @property {number} value
	 * @property {string} [href] - Makes the label a link
	 * @property {string} [detail] - Replaces the value as the right-hand text
	 */

	/** @type {{ items: Item[], selected?: string | null, onselect?: (label: string) => void, unit?: string, color?: string }} */
	let { items, selected = null, onselect, unit = '', color = 'var(--primary-color)' } = $props()

	let max = $derived(Math.max(1, ...items.map(i => i.value)))
</script>

{#if items.length === 0}
	<p class="empty">Nothing to show for this selection.</p>
{:else}
	<ul class="bars" style:--bar-color={color}>
		{#each items as item (item.label)}
			<li class:dim={selected && selected !== item.label}>
				{#if item.href}
					<a class="label" href={item.href}>{item.label}</a>
				{:else if onselect}
					<button class="label" class:active={selected === item.label} onclick={() => onselect?.(item.label)} aria-pressed={selected === item.label}>{item.label}</button>
				{:else}
					<span class="label">{item.label}</span>
				{/if}
				<span class="track" aria-hidden="true"><span class="fill" style:width="{(item.value / max) * 100}%"></span></span>
				<span class="value">{item.detail ?? item.value.toLocaleString()}{unit}</span>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.bars {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	li {
		display: grid;
		grid-template-columns: minmax(5rem, 9rem) 1fr auto;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.875rem;
	}

	li.dim { opacity: 0.45; }

	.label {
		color: var(--text-primary);
		text-align: left;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		background: none;
		border: 0;
		padding: 0;
		font: inherit;
		text-decoration: none;
	}

	button.label, a.label { cursor: pointer; }
	button.label:hover, a.label:hover { color: var(--primary-color); }
	button.label.active { color: var(--primary-color); font-weight: 600; }

	.track {
		height: 0.5rem;
		border-radius: 999px;
		background: var(--input-bg);
		overflow: hidden;
	}

	.fill {
		display: block;
		height: 100%;
		border-radius: 999px;
		background: var(--bar-color);
	}

	.value {
		font-variant-numeric: tabular-nums;
		color: var(--text-secondary);
		min-width: 2.5rem;
		text-align: right;
	}

	.empty {
		margin: 0;
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	@media (max-width: 480px) {
		li { grid-template-columns: minmax(4rem, 7rem) 1fr auto; gap: 0.5rem; }
	}
</style>
