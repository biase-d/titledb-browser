<script>
	import Icon from '@iconify/svelte';
	import { slide } from 'svelte/transition';
	import { getRegionLabel } from '$lib/regions';
    import { createImageSet } from '$lib/image';
    import { preferences } from '$lib/stores/preferences';
    import { getLocalizedName } from '$lib/i18n';

	let { titleData } = $props();

	const { id, names = [], regions = [], performance = {}, iconUrl } = titleData;
	const { docked = {}, handheld = {} } = performance;

    const imageSet = $derived(createImageSet(iconUrl));
    
    let preferredRegion = $state('US');
    preferences.subscribe(p => preferredRegion = p.region);
    
	const titleName = $derived(getLocalizedName(names, preferredRegion));

	const regionLabel = $derived(getRegionLabel(regions));
	const showRegionBadge = $derived(regionLabel && regionLabel !== 'Worldwide');

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
    <div class="icon-wrapper">
        <img 
            src={imageSet?.src || iconUrl} 
            srcset={imageSet?.srcset}
            alt="" 
            loading="lazy" 
            width="48" 
            height="48"
        />
    </div>

	<div class="list-item-info">
		<span class="title-name" lang={preferredRegion === 'JP' ? 'ja' : preferredRegion === 'KR' ? 'ko' : 'en'}>
            {titleName}
        </span>
		<div class="meta-row">
            {#if showRegionBadge}
				<span class="region-badge" title="Available in: {regionLabel}">
                    <Icon icon="mdi:earth" width="12" height="12" />
                    <span class="badge-text">{regionLabel}</span>
                </span>
			{/if}
			<span class="title-id">{id}</span>
		</div>
	</div>

	{#if docked.target_fps || handheld.target_fps}
		<div class="perf-tags" aria-hidden="true">
			{#if docked.target_fps}
				<span class="perf-tag docked" title={`Docked: ${docked.target_fps} FPS`}>
					<Icon icon="mdi:television" />
					{docked.target_fps === 'Unlocked' ? '60' : docked.target_fps}
				</span>
			{/if}
			{#if handheld.target_fps}
				<span class="perf-tag handheld" title={`Handheld: ${handheld.target_fps} FPS`}>
					<Icon icon="mdi:nintendo-switch" />
					{handheld.target_fps === 'Unlocked' ? '60' : handheld.target_fps}
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
			background-color 0.2s ease,
            transform 0.2s ease;
	}

	.list-item:hover,
	.list-item:focus-visible {
		border-color: var(--primary-color);
		background-color: color-mix(in srgb, var(--primary-color) 2%, transparent);
        transform: translateX(4px);
	}

	.list-item:focus-visible {
		outline: 2px solid var(--accent-color, blue);
		outline-offset: 2px;
	}

    .icon-wrapper img {
        width: 48px;
        height: 48px;
        border-radius: var(--radius-sm);
        object-fit: cover;
        background-color: var(--input-bg);
        display: block;
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
	}

	.meta-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
        flex-wrap: wrap;
	}

	.title-id {
		font-size: 0.75rem;
        font-family: var(--font-mono);
		color: var(--text-secondary);
        opacity: 0.8;
	}

	.region-badge {
		display: inline-flex;
        align-items: center;
        gap: 0.25rem;
		font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.02em;
		color: var(--text-secondary);
		background-color: var(--input-bg);
		padding: 2px 6px;
		border-radius: 4px;
		border: 1px solid var(--border-color);
        max-width: 140px;
	}
	
    .region-badge :global(svg) {
        flex-shrink: 0;
    }

    .badge-text {
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
			gap: 0.5rem;
			flex-shrink: 0;
		}
	}

	.perf-tag {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.85rem;
        font-weight: 600;
		color: var(--text-primary);
		background-color: var(--input-bg);
		padding: 0.35rem 0.6rem;
		border-radius: var(--radius-md);
		white-space: nowrap;
		border: 1px solid var(--border-color);
	}
    
    .perf-tag :global(svg) {
        color: var(--text-secondary);
    }
</style>