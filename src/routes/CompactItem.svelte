<script>
    import Icon from '@iconify/svelte'
    import { getRegionLabel } from '$lib/regions'
    import { preferences } from '$lib/stores/preferences'
    import { getLocalizedName } from '$lib/i18n'
    import TextHighlight from '$lib/components/TextHighlight.svelte'

    let { titleData, query = '' } = $props()

    let id = $derived(titleData.id)
    let names = $derived(titleData.names || [])
    let regions = $derived(titleData.regions || [])
    let iconUrl = $derived(titleData.iconUrl)

    let preferredRegion = $state('US')
    preferences.subscribe((p) => (preferredRegion = p.region))

    let titleName = $derived(getLocalizedName(names, preferredRegion))
    let regionLabel = $derived(getRegionLabel(regions))
    let showRegionBadge = $derived(regionLabel && regionLabel !== 'Worldwide')
</script>

<a href={`/title/${id}`} class="compact-item" data-sveltekit-preload-data="tap">
    <div class="compact-icon">
        {#if iconUrl}
            <img src={iconUrl} alt="" loading="lazy" width="24" height="24" />
        {:else}
            <div class="no-icon-small">
                <Icon icon="mdi:image-off" width="14" height="14" />
            </div>
        {/if}
    </div>
    <span class="compact-name">
        <TextHighlight text={titleName} {query} />
    </span>
    {#if showRegionBadge}
        <span class="compact-region" title={regionLabel}>{regionLabel}</span>
    {/if}
    <span class="compact-id">{id}</span>
</a>

<style>
    .compact-item {
        display: flex;
        align-items: center;
        padding: 0.4rem 0.75rem;
        gap: 0.75rem;
        background-color: var(--surface-color);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-sm);
        text-decoration: none;
        color: inherit;
        transition: all 0.2s ease;
        min-height: 48px;
    }

    .compact-item:hover {
        border-color: var(--primary-color);
        background-color: color-mix(
            in srgb,
            var(--primary-color) 4%,
            var(--surface-color)
        );
    }

    .compact-icon {
        width: 24px;
        height: 24px;
        flex-shrink: 0;
    }

    .compact-icon img {
        width: 100%;
        height: 100%;
        border-radius: 4px;
        object-fit: cover;
    }

    .no-icon-small {
        width: 100%;
        height: 100%;
        background: var(--input-bg);
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-secondary);
        opacity: 0.5;
    }

    .compact-name {
        flex-grow: 1;
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .compact-region {
        font-size: 0.65rem;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--primary-color);
        background-color: color-mix(
            in srgb,
            var(--primary-color) 10%,
            transparent
        );
        padding: 1px 5px;
        border-radius: 4px;
        white-space: nowrap;
    }

    .compact-id {
        font-size: 0.7rem;
        font-family: var(--font-mono);
        color: var(--text-secondary);
        opacity: 0.5;
        white-space: nowrap;
    }

    @media (max-width: 640px) {
        .compact-id {
            display: none;
        }
    }
</style>
