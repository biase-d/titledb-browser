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
    let bannerUrl = $derived(titleData.bannerUrl)
    let publisher = $derived(titleData.publisher || 'N/A')
    let releaseDate = $derived(titleData.releaseDate)

    let docked = $derived(performance.docked || {})
    let handheld = $derived(performance.handheld || {})

    let imageSet = $derived(
        createImageSet(iconUrl || bannerUrl, {
            highRes: $preferences.highResImages,
            thumbnailWidth: 128,
        }),
    )

    let preferredRegion = $state('US')
    preferences.subscribe((p) => (preferredRegion = p.region))

    let titleName = $derived(getLocalizedName(names, preferredRegion))
    let regionLabel = $derived(getRegionLabel(regions))

    function formatDate (dateNum) {
        if (!dateNum) return 'N/A'
        const s = dateNum.toString()
        if (s.length !== 8) return s
        return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
    }
</script>

<a
    href={`/title/${id}`}
    class="detailed-item"
    transition:slide|local
    data-sveltekit-preload-data="tap"
>
    <div class="main-layout">
        <div class="icon-column">
            <img
                src={imageSet?.src || iconUrl}
                srcset={imageSet?.srcset}
                alt={titleName}
                class="detail-icon"
                loading="lazy"
                width="96"
                height="96"
            />
        </div>
        <div class="info-column">
            <div class="header-row">
                <h3 class="title-text">
                    <TextHighlight text={titleName} {query} />
                </h3>
                <span class="title-id-badge">{id}</span>
            </div>

            <div class="meta-grid">
                <div class="meta-item">
                    <span class="label">Publisher</span>
                    <span class="value">{publisher}</span>
                </div>
                <div class="meta-item">
                    <span class="label">Release Date</span>
                    <span class="value">{formatDate(releaseDate)}</span>
                </div>
                <div class="meta-item">
                    <span class="label">Regions</span>
                    <span class="value">{regionLabel || 'N/A'}</span>
                </div>
            </div>

            <div class="perf-overview">
                {#if docked.target_fps || handheld.target_fps}
                    <div class="perf-section">
                        {#if docked.target_fps}
                            <div class="perf-row">
                                <Icon icon="mdi:television" />
                                <span class="mode-label">Docked:</span>
                                <span class="mode-value"
                                    >{docked.target_fps === 'Unlocked'
                                        ? '60'
                                        : docked.target_fps} FPS</span
                                >
                                {#if docked.resolution_type}
                                    <span class="mode-res"
                                        >({docked.resolution_type})</span
                                    >
                                {/if}
                            </div>
                        {/if}
                        {#if handheld.target_fps}
                            <div class="perf-row">
                                <Icon icon="mdi:nintendo-switch" />
                                <span class="mode-label">Handheld:</span>
                                <span class="mode-value"
                                    >{handheld.target_fps === 'Unlocked'
                                        ? '60'
                                        : handheld.target_fps} FPS</span
                                >
                                {#if handheld.resolution_type}
                                    <span class="mode-res"
                                        >({handheld.resolution_type})</span
                                    >
                                {/if}
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>
        </div>
    </div>
</a>

<style>
    .detailed-item {
        display: block;
        text-decoration: none;
        color: inherit;
        background-color: var(--surface-color);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
        padding: 1.5rem;
        transition: all 0.2s ease;
    }

    .detailed-item:hover {
        border-color: var(--primary-color);
        background-color: color-mix(
            in srgb,
            var(--primary-color) 2%,
            var(--surface-color)
        );
        transform: scale(1.005);
    }

    .main-layout {
        display: flex;
        gap: 1.5rem;
    }

    .icon-column {
        flex-shrink: 0;
    }

    .detail-icon {
        width: 96px;
        height: 96px;
        border-radius: var(--radius-md);
        object-fit: cover;
        background-color: var(--input-bg);
        border: 1px solid var(--border-color);
    }

    .info-column {
        flex-grow: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .header-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
    }

    .title-text {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 800;
        color: var(--text-primary);
        line-height: 1.2;
    }

    .title-id-badge {
        font-family: var(--font-mono);
        font-size: 0.75rem;
        color: var(--text-secondary);
        background: var(--input-bg);
        padding: 2px 8px;
        border-radius: 4px;
        opacity: 0.8;
    }

    .meta-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 1rem;
        padding: 0.75rem;
        background: rgba(0, 0, 0, 0.02);
        border-radius: var(--radius-md);
    }

    .meta-item {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
    }

    .label {
        font-size: 0.7rem;
        text-transform: uppercase;
        font-weight: 700;
        color: var(--text-secondary);
        letter-spacing: 0.05em;
    }

    .value {
        font-size: 0.9rem;
        font-weight: 500;
        color: var(--text-primary);
    }

    .perf-overview {
        display: flex;
        flex-wrap: wrap;
        gap: 1.5rem;
    }

    .perf-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9rem;
        margin-bottom: 0.25rem;
    }

    .perf-row :global(svg) {
        color: var(--primary-color);
    }

    .mode-label {
        font-weight: 600;
        color: var(--text-secondary);
    }

    .mode-value {
        font-weight: 700;
        color: var(--text-primary);
    }

    .mode-res {
        font-size: 0.8rem;
        color: var(--text-secondary);
        opacity: 0.8;
    }

    @media (max-width: 640px) {
        .main-layout {
            flex-direction: column;
            gap: 1rem;
        }
        .icon-column {
            display: flex;
            justify-content: center;
        }
        .header-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
        }
    }
</style>
