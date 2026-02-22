<script>
	import Icon from '@iconify/svelte'
	import { slide } from 'svelte/transition'
	import { createImageSet } from '$lib/image'
	import { getRegionLabel } from '$lib/regions'
	import { preferences } from '$lib/stores/preferences'
	import { getLocalizedName } from '$lib/i18n'
	import TextHighlight from '$lib/components/TextHighlight.svelte'

	let { titleData, query = '' } = $props()

	let id = $derived(titleData.id)
	let iconUrl = $derived(titleData.iconUrl)
	let names = $derived(titleData.names || [])
	let regions = $derived(titleData.regions || [])
	let publisher = $derived(titleData.publisher || 'N/A')
	let performance = $derived(titleData.performance || {})

	let docked = $derived(performance.docked || {})
	let handheld = $derived(performance.handheld || {})

	let imageSet = $derived(
		createImageSet(iconUrl || titleData.bannerUrl, {
			highRes: $preferences.highResImages,
			thumbnailWidth: 200,
		}),
	)

	let preferredRegion = $state('US')
	preferences.subscribe((p) => (preferredRegion = p.region))

	let titleName = $derived(getLocalizedName(names, preferredRegion))
	let regionLabel = $derived(getRegionLabel(regions))
	let showRegionBadge = $derived(regionLabel && regionLabel !== 'Worldwide')

	let performanceInfo = $derived(
		[
			docked.target_fps &&
				`Docked mode runs at ${docked.target_fps === 'Unlocked' ? '60' : docked.target_fps} FPS`,
			handheld.target_fps &&
				`Handheld mode runs at ${handheld.target_fps === 'Unlocked' ? '60' : handheld.target_fps} FPS`,
		]
			.filter(Boolean)
			.join('. '),
	)

	let ariaLabel = $derived(
		`View details for ${titleName} by ${publisher}.${performanceInfo ? ` ${performanceInfo}.` : ''}`,
	)
</script>

<a
	href={`/title/${id}`}
	class="game-card"
	transition:slide|local
	data-sveltekit-preload-data="tap"
	aria-label={ariaLabel}
>
	<div class="image-container">
		<img
			class="card-icon"
			class:fallback-icon={!iconUrl && titleData.bannerUrl}
			src={imageSet?.src || iconUrl || titleData.bannerUrl}
			srcset={imageSet?.srcset}
			sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 200px"
			alt={`Game icon for ${titleName}${publisher !== 'N/A' ? ` by ${publisher}` : ''}`}
			loading="lazy"
			width="200"
			height="200"
		/>

		{#if docked.target_fps || handheld.target_fps}
			<div class="card-perf-badge" aria-hidden="true">
				{#if docked.target_fps}
					<span
						title={`Docked: ${docked.target_fps === 'Unlocked' ? '60' : docked.target_fps} FPS`}
					>
						<Icon icon="mdi:television" />
						{docked.target_fps === 'Unlocked'
							? '60'
							: docked.target_fps}
					</span>
				{/if}
				{#if handheld.target_fps}
					<span
						title={`Handheld: ${handheld.target_fps === 'Unlocked' ? '60' : handheld.target_fps} FPS`}
					>
						<Icon icon="mdi:nintendo-switch" />
						{handheld.target_fps === 'Unlocked'
							? '60'
							: handheld.target_fps}
					</span>
				{/if}
			</div>
		{/if}
	</div>

	<div class="card-info">
		<p
			class="card-title"
			title={titleName}
			lang={preferredRegion === 'JP'
				? 'ja'
				: preferredRegion === 'KR'
					? 'ko'
					: 'en'}
		>
			<TextHighlight text={titleName} {query} />
		</p>

		<div class="card-meta">
			<div class="meta-main">
				<p class="card-publisher">{publisher}</p>
				<span class="card-id">{id}</span>
			</div>
			{#if showRegionBadge}
				<span class="region-badge" title={regionLabel}
					>{regionLabel}</span
				>
			{/if}
		</div>
	</div>
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
		/* Hardware acceleration for the card itself */
		transform: translateZ(0);
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease,
			border-color 0.2s ease;
		text-decoration: none;
		color: inherit;
	}

	.game-card:hover,
	.game-card:focus-visible {
		transform: translateY(-4px);
		box-shadow: var(--shadow-lg);
		border-color: var(--primary-color);
	}

	.game-card:focus-visible {
		outline: 2px solid var(--accent-color, blue);
		outline-offset: 2px;
	}

	.image-container {
		position: relative;
		width: 100%;
		aspect-ratio: 1 / 1;
		overflow: hidden;
		border-bottom: 1px solid var(--border-color);
		background-color: var(--input-bg);
		/* Fix for Safari overflow clipping during transform */
		-webkit-mask-image: -webkit-radial-gradient(white, black);
		mask-image: -webkit-radial-gradient(white, black);
	}

	.card-icon {
		width: 100%;
		height: 100%;
		object-fit: cover;

		/* SMOOTHING FIXES */
		transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
		will-change: transform;
		/* Forces GPU layer to prevent repainting/shimmering */
		transform: translateZ(0);
		backface-visibility: hidden;
		-webkit-font-smoothing: subpixel-antialiased;
	}

	.game-card:hover .card-icon {
		transform: scale(1.05) translateZ(0);
	}

	.card-info {
		flex-grow: 1;
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		z-index: 1; /* Ensure text stays sharp above image layer */
		background-color: var(--surface-color);
	}

	.card-title {
		margin: 0;
		font-weight: 700;
		font-size: 0.95rem;
		line-height: 1.3;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		color: var(--text-primary);
	}

	.card-meta {
		margin-top: auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}

	.meta-main {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.card-publisher {
		margin: 0;
		font-size: 0.75rem;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.card-id {
		font-size: 0.65rem;
		font-family: var(--font-mono);
		color: var(--text-secondary);
		opacity: 0.6;
	}

	.region-badge {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		color: var(--text-secondary);
		background-color: var(--input-bg);
		padding: 2px 6px;
		border-radius: 4px;
		border: 1px solid var(--border-color);
		white-space: nowrap;
		max-width: 80px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.game-card:hover .card-title,
	.game-card:focus-visible .card-title {
		color: var(--primary-color);
	}

	:global(.has-theme) .region-badge {
		color: var(--primary-color);
		background-color: color-mix(
			in srgb,
			var(--primary-color) 10%,
			transparent
		);
		border-color: color-mix(in srgb, var(--primary-color) 25%, transparent);
	}

	.card-perf-badge {
		position: absolute;
		bottom: 8px;
		right: 8px;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 4px 8px;
		font-size: 0.75rem;
		font-weight: 600;
		background-color: rgba(0, 0, 0, 0.7);
		color: white;
		border-radius: 6px;
		backdrop-filter: blur(4px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
		z-index: 2;
	}

	:global(.has-theme) .card-perf-badge {
		background-color: color-mix(
			in srgb,
			var(--primary-color) 40%,
			rgba(0, 0, 0, 0.4)
		);
		border-color: color-mix(
			in srgb,
			var(--primary-color) 20%,
			rgba(255, 255, 255, 0.1)
		);
	}

	.card-perf-badge span {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}
</style>
