<script>
	import Icon from '@iconify/svelte';
	import { slide } from 'svelte/transition';

	let { titleData } = $props();

	const { id, names = [], performance = {} } = titleData;
	const { docked = {}, handheld = {} } = performance;

	const titleName = $derived(names[0] || 'Unknown Title');
	const performanceInfo = $derived(
		[
			docked.target_fps && `docked at ${docked.target_fps} FPS`,
			handheld.target_fps && `handheld at ${handheld.target_fps} FPS`
		]
			.filter(Boolean)
			.join(', ')
	);

	const ariaLabel = $derived(
		`View details for ${titleName}.${performanceInfo ? ` Performance: ${performanceInfo}.` : ''}`
	);
</script>

<a
	href={`/title/${id}`}
	class="list-item"
	transition:slide|local
	data-sveltekit-preload-data="hover"
	aria-label={ariaLabel}
>
	<div class="list-item-info">
		<span class="title-name">{titleName}</span>
		<span class="title-id">{id}</span>
	</div>

	{#if docked.target_fps || handheld.target_fps}
		<div class="perf-tags" aria-hidden="true">
			{#if docked.target_fps}
				<span class="perf-tag" title={`Docked: ${docked.target_fps} FPS`}>
					<Icon icon="mdi:television" />
					{docked.target_fps} FPS
				</span>
			{/if}
			{#if handheld.target_fps}
				<span class="perf-tag" title={`Handheld: ${handheld.target_fps} FPS`}>
					<Icon icon="mdi:nintendo-switch" />
					{handheld.target_fps} FPS
				</span>
			{/if}
		</div>
	{/if}
</a>

<style>
	.list-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1rem;
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		text-decoration: none;
		color: inherit;
		transition:
			border-color 0.2s ease,
			background-color 0.2s ease;
	}

	.list-item:hover,
	.list-item:focus-visible {
		border-color: var(--primary-color);
		background-color: color-mix(in srgb, var(--primary-color) 5%, transparent);
	}

	.list-item:focus-visible {
		outline: 2px solid var(--accent-color, blue);
		outline-offset: 2px;
	}

	.list-item-info {
		flex-grow: 1;
		min-width: 0;
	}

	.title-name {
		display: block;
		font-weight: 600;
		font-size: 1rem;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.title-id {
		display: block;
		margin-top: 0.1rem;
		font-size: 0.8rem;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.perf-tags {
		display: none;
	}

	@media (min-width: 640px) {
		.perf-tags {
			display: flex;
			align-items: center;
			gap: 0.75rem;
			flex-shrink: 0;
		}
	}

	.perf-tag {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.8rem;
		color: var(--text-secondary);
		background-color: var(--input-bg);
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm);
		white-space: nowrap;
		border: 1px solid var(--border-color);
	}
</style>