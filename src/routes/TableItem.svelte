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
    let performance = $derived(titleData.performance || {})
    let iconUrl = $derived(titleData.iconUrl)

    let docked = $derived(performance.docked || {})
    let handheld = $derived(performance.handheld || {})

    let preferredRegion = $state('US')
    preferences.subscribe((p) => (preferredRegion = p.region))

    let titleName = $derived(getLocalizedName(names, preferredRegion))
    let regionLabel = $derived(getRegionLabel(regions))
</script>

<a href={`/title/${id}`} class="table-row" data-sveltekit-preload-data="tap">
    <div class="col col-icon">
        {#if iconUrl}
            <img src={iconUrl} alt="" loading="lazy" width="32" height="32" />
        {:else}
            <div class="no-icon-small">
                <Icon icon="mdi:image-off" width="16" height="16" />
            </div>
        {/if}
    </div>
    <div class="col col-name">
        <TextHighlight text={titleName} {query} />
    </div>
    <div class="col col-id">
        <code>{id}</code>
    </div>
    <div class="col col-region">
        <span class="region-pill">{regionLabel || 'N/A'}</span>
    </div>
    <div class="col col-fps">
        <div class="fps-group">
            <span class="fps-val {docked.target_fps ? 'has-val' : ''}">
                <Icon icon="mdi:television" width="14" />
                {docked.target_fps === 'Unlocked'
                    ? '60'
                    : docked.target_fps || '—'}
            </span>
            <span class="fps-val {handheld.target_fps ? 'has-val' : ''}">
                <Icon icon="mdi:nintendo-switch" width="14" />
                {handheld.target_fps === 'Unlocked'
                    ? '60'
                    : handheld.target_fps || '—'}
            </span>
        </div>
    </div>
</a>

<style>
    .table-row {
        display: grid;
        grid-template-columns: 48px 1fr 160px 120px 140px;
        align-items: center;
        padding: 0.5rem 1rem;
        background-color: var(--surface-color);
        border-bottom: 1px solid var(--border-color);
        text-decoration: none;
        color: inherit;
        transition: background-color 0.2s ease;
    }

    .table-row:hover {
        background-color: color-mix(
            in srgb,
            var(--primary-color) 4%,
            var(--surface-color)
        );
    }

    .col {
        padding: 0 0.5rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .col-icon {
        display: flex;
        justify-content: center;
    }

    .col-icon img {
        width: 32px;
        height: 32px;
        border-radius: 4px;
        object-fit: cover;
    }

    .no-icon-small {
        width: 32px;
        height: 32px;
        background: var(--input-bg);
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-secondary);
        opacity: 0.5;
    }

    .col-name {
        font-weight: 600;
        font-size: 0.95rem;
        color: var(--text-primary);
    }

    .col-id code {
        font-size: 0.75rem;
        color: var(--text-secondary);
        opacity: 0.7;
    }

    .region-pill {
        font-size: 0.7rem;
        font-weight: 700;
        color: var(--text-secondary);
        background: var(--input-bg);
        padding: 2px 8px;
        border-radius: 4px;
        border: 1px solid var(--border-color);
    }

    .fps-group {
        display: flex;
        gap: 0.75rem;
    }

    .fps-val {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.8rem;
        font-weight: 700;
        color: var(--text-secondary);
        opacity: 0.4;
    }

    .fps-val.has-val {
        color: var(--primary-color);
        opacity: 1;
    }

    @media (max-width: 900px) {
        .table-row {
            grid-template-columns: 40px 1fr 120px;
        }
        .col-id,
        .col-region {
            display: none;
        }
    }

    @media (max-width: 640px) {
        .table-row {
            grid-template-columns: 40px 1fr;
        }
        .col-fps {
            display: none;
        }
    }
</style>
