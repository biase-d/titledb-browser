<script>
	import Icon from '@iconify/svelte'
	import { slide } from 'svelte/transition'
	import { getRegionLabel } from '$lib/regions'
	import { createImageSet } from '$lib/image'
	import { preferences } from '$lib/stores/preferences'
	import { getLocalizedName } from '$lib/i18n'
	import TextHighlight from '$lib/components/TextHighlight.svelte'

	let { titleData, query = '' } = $props()

	let id = $derived(titleData.id)
	let names = $derived(titleData.names || [])
	let regions = $derived(titleData.regions || [])
	let performance = $derived(titleData.performance || {})
	let iconUrl = $derived(titleData.iconUrl)

	let docked = $derived(performance.docked || {})
	let handheld = $derived(performance.handheld || {})

	let imageSet = $derived(
		createImageSet(iconUrl || titleData.bannerUrl, {
			highRes: $preferences.highResImages,
			thumbnailWidth: 64,
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
				`docked at ${docked.target_fps === 'Unlocked' ? '60' : docked.target_fps} FPS`,
			handheld.target_fps &&
				`handheld at ${handheld.target_fps === 'Unlocked' ? '60' : handheld.target_fps} FPS`,
		]
			.filter(Boolean)
			.join(', '),
	)

	let ariaLabel = $derived(
		`View details for ${titleName}.${performanceInfo ? ` Performance: ${performanceInfo}.` : ''}`,
	)
</script>

<a
	href={`/title/${id}`}
	class="list-item"
	transition:slide|local
	data-sveltekit-preload-data="tap"
	aria-label={ariaLabel}
>
	<div class="icon-wrapper">
		<img
			src={imageSet?.src || iconUrl || titleData.bannerUrl}
			srcset={imageSet?.srcset}
			alt={`Game icon for ${titleName}${titleData.publisher && titleData.publisher !== 'N/A' ? ` by ${titleData.publisher}` : ''}`}
			class:fallback-icon={!iconUrl && titleData.bannerUrl}
			loading="lazy"
			width="48"
			height="48"
		/>
	</div>

	<div class="list-item-info">
		<span
			class="title-name"
			lang={preferredRegion === 'JP'
				? 'ja'
				: preferredRegion === 'KR'
					? 'ko'
					: 'en'}
		>
			<TextHighlight text={titleName} {query} />
		</span>
		<div class="meta-row">
			{#if showRegionBadge}
				<span class="region-badge" title="Available in: {regionLabel}">
					<Icon icon="mdi:earth" width="12" height="12" />
					<span class="badge-text">{regionLabel}</span>
				</span>
			{/if}
			<span class="title-id">{id}</span>

			{#if docked.target_fps || handheld.target_fps}
				<div class="perf-inline" aria-hidden="true">
					{#if docked.target_fps}
						<span
							class="perf-inline-tag docked"
							title={`Docked: ${docked.target_fps === 'Unlocked' ? '60' : docked.target_fps} FPS`}
						>
							<Icon icon="mdi:television" />
							<span
								>{docked.target_fps === 'Unlocked'
									? '60'
									: docked.target_fps}</span
							>
						</span>
					{/if}
					{#if handheld.target_fps}
						<span
							class="perf-inline-tag handheld"
							title={`Handheld: ${handheld.target_fps === 'Unlocked' ? '60' : handheld.target_fps} FPS`}
						>
							<Icon icon="mdi:nintendo-switch" />
							<span
								>{handheld.target_fps === 'Unlocked'
									? '60'
									: handheld.target_fps}</span
							>
						</span>
					{/if}
				</div>
			{/if}
		</div>
	</div>
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
			background-color 0.2s ease,
			transform 0.2s ease;
	}

	@media (max-width: 640px) {
		.list-item {
			gap: 0.75rem;
		}
	}

	.list-item:hover .title-name,
	.list-item:focus-visible .title-name {
		color: var(--primary-color);
	}

	.list-item:hover,
	.list-item:focus-visible {
		border-color: var(--primary-color);
		background-color: color-mix(
			in srgb,
			var(--primary-color) 4%,
			var(--surface-color)
		);
		transform: translateX(4px);
	}

	.list-item:focus-visible {
		outline: 2px solid var(--accent-color, blue);
		outline-offset: 2px;
	}

	.icon-wrapper {
		flex-shrink: 0;
		width: 48px;
		height: 48px;
	}

	.icon-wrapper img {
		width: 100%;
		height: 100%;
		border-radius: var(--radius-sm);
		object-fit: cover;
		background-color: var(--input-bg);
		display: block;
		border: 1px solid var(--border-color);
	}

	.list-item-info {
		flex-grow: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.title-name {
		display: block;
		font-weight: 600;
		font-size: 1rem;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		line-height: 1.2;
		transition: color 0.2s ease;
	}

	.meta-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
		margin-top: 2px;
	}

	.title-id {
		font-size: 0.75rem;
		font-family: var(--font-mono);
		color: var(--text-secondary);
		opacity: 0.7;
	}

	.region-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.02em;
		color: color-mix(
			in srgb,
			var(--primary-color, var(--text-secondary)) 80%,
			black
		);
		background-color: color-mix(
			in srgb,
			var(--primary-color, transparent) 8%,
			var(--input-bg)
		);
		padding: 2px 6px;
		border-radius: 4px;
		border: 1px solid
			color-mix(
				in srgb,
				var(--primary-color, transparent) 20%,
				var(--border-color)
			);
		max-width: 140px;
		flex-shrink: 0;
	}

	.region-badge :global(svg) {
		flex-shrink: 0;
		color: var(--primary-color, var(--text-secondary));
	}

	.badge-text {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
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

	.perf-inline {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-left: auto;
	}

	@media (max-width: 640px) {
		.meta-row {
			gap: 0.5rem 0.75rem;
		}

		.perf-inline {
			margin-left: 0;
			width: 100%;
			margin-top: 4px;
		}
	}

	.perf-inline-tag {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--text-primary);
		opacity: 0.9;
	}

	.perf-inline-tag :global(svg) {
		color: var(--primary-color);
		width: 14px;
		height: 14px;
	}

	.perf-tag {
		display: none;
	}

	.perf-tag :global(svg) {
		color: var(--text-secondary);
		transition: color 0.2s ease;
	}

	.list-item:hover .perf-tag :global(svg) {
		color: var(--primary-color);
	}
</style>
