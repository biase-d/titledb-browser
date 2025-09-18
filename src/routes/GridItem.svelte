<script>
	import Icon from '@iconify/svelte';
	import { slide } from 'svelte/transition';
	import { createImageSet } from '$lib/image';

	let { titleData } = $props();

	const {
		id,
		iconUrl,
		names = [],
		publisher = 'N/A',
		performance = {}
	} = titleData;

	const { docked = {}, handheld = {} } = performance;

	const imageSet = $derived(createImageSet(iconUrl));

	const titleName = $derived(names[0] || 'Unknown Title');
	const performanceInfo = $derived(
		[
			docked.target_fps && `Docked mode runs at ${docked.target_fps} FPS`,
			handheld.target_fps && `Handheld mode runs at ${handheld.target_fps} FPS`
		]
			.filter(Boolean)
			.join('. ')
	);

	const ariaLabel = $derived(
		`View details for ${titleName} by ${publisher}.${performanceInfo ? ` ${performanceInfo}.` : ''}`
	);
</script>

<a
	href={`/title/${id}`}
	class="game-card"
	transition:slide|local
	data-sveltekit-preload-data="hover"
	aria-label={ariaLabel}
>
	<img
		class="card-icon"
		src={imageSet?.src || iconUrl}
		srcset={imageSet?.srcset}
		sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 200px"
		alt={`Game icon for ${titleName}`}
		loading="lazy"
		width="200"
		height="200"
	/>

	<div class="card-info">
		<p class="card-title">{titleName}</p>
		<p class="card-publisher">{publisher}</p>
	</div>

	{#if docked.target_fps || handheld.target_fps}
		<div class="card-perf-badge" aria-hidden="true">
			{#if docked.target_fps}
				<span title={`Docked: ${docked.target_fps} FPS`}>
					<Icon icon="mdi:television" />
					{docked.target_fps === 'Unlocked' ? '60' : docked.target_fps}
				</span>
			{/if}
			{#if handheld.target_fps}
				<span title={`Handheld: ${handheld.target_fps} FPS`}>
					<Icon icon="mdi:nintendo-switch" />
					{handheld.target_fps === 'Unlocked' ? '60' : handheld.target_fps}
				</span>
			{/if}
		</div>
	{/if}
</a>

<style>
	.game-card {
		position: relative;
		display: flex;
		flex-direction: column;
		background-color: var(--surface-color);
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-color);
		overflow: hidden;
		box-shadow: var(--shadow-sm);
		will-change: transform, box-shadow;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
		text-decoration: none;
		color: inherit;
	}

	.game-card:hover,
	.game-card:focus-visible {
		transform: translateY(-3px);
		box-shadow: var(--shadow-lg);
	}

	.game-card:focus-visible {
		outline: 2px solid var(--accent-color, blue);
		outline-offset: 2px;
	}

	.card-icon {
		width: 100%;
		aspect-ratio: 1 / 1;
		object-fit: cover;
		background-color: var(--input-bg);
		border-bottom: 1px solid var(--border-color);
	}

	.card-info {
		flex-grow: 1;
		padding: 0.75rem;
	}

	.card-title {
		margin: 0 0 0.25rem;
		font-weight: 700;
		font-size: 1rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--text-primary);
	}

	.card-publisher {
		margin: 0;
		font-size: 0.75rem;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.card-perf-badge {
		position: absolute;
		top: 8px;
		left: 8px;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 4px 8px;
		font-size: 0.75rem;
		font-weight: 500;
		background-color: rgba(20, 20, 20, 0.8);
		color: white;
		border-radius: 999px;
		backdrop-filter: blur(4px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
	}

	.card-perf-badge span {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}
</style>