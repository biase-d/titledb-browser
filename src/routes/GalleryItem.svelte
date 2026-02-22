<script>
    import Icon from '@iconify/svelte'
    import { slide } from 'svelte/transition'
    import { createImageSet } from '$lib/image'
    import { preferences } from '$lib/stores/preferences'
    import { getLocalizedName } from '$lib/i18n'

    let { titleData } = $props()

    let id = $derived(titleData.id)
    let iconUrl = $derived(titleData.iconUrl)
    let bannerUrl = $derived(titleData.bannerUrl)
    let names = $derived(titleData.names || [])
    let performance = $derived(titleData.performance || {})

    let docked = $derived(performance.docked || {})
    let handheld = $derived(performance.handheld || {})

    let imageSet = $derived(
        createImageSet(bannerUrl || iconUrl, {
            highRes: $preferences.highResImages,
            thumbnailWidth: 400,
        }),
    )

    let preferredRegion = $state('US')
    preferences.subscribe((p) => (preferredRegion = p.region))

    let titleName = $derived(getLocalizedName(names, preferredRegion))
</script>

<a
    href={`/title/${id}`}
    class="gallery-card"
    transition:slide|local
    data-sveltekit-preload-data="tap"
>
    <div class="banner-container">
        <img
            src={imageSet?.src || bannerUrl || iconUrl}
            srcset={imageSet?.srcset}
            alt={titleName}
            class="banner-img"
            loading="lazy"
        />
        <div class="overlay">
            <div class="card-content">
                <h3 class="card-title">{titleName}</h3>
                <div class="card-meta">
                    <span class="game-id">{id}</span>
                    {#if docked.target_fps || handheld.target_fps}
                        <div class="perf-mini">
                            {#if docked.target_fps}
                                <Icon icon="mdi:television" width="12" />
                            {/if}
                            {#if handheld.target_fps}
                                <Icon icon="mdi:nintendo-switch" width="12" />
                            {/if}
                            <span
                                >{docked.target_fps === 'Unlocked' ||
                                handheld.target_fps === 'Unlocked'
                                    ? '60'
                                    : docked.target_fps || handheld.target_fps} FPS</span
                            >
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
</a>

<style>
    .gallery-card {
        display: block;
        text-decoration: none;
        color: white;
        border-radius: var(--radius-lg);
        overflow: hidden;
        background-color: var(--input-bg);
        border: 1px solid var(--border-color);
        aspect-ratio: 16 / 9;
        transition:
            transform 0.3s ease,
            border-color 0.3s ease,
            box-shadow 0.3s ease;
        position: relative;
    }

    .gallery-card:hover {
        transform: translateY(-4px) scale(1.02);
        border-color: var(--primary-color);
        box-shadow: var(--shadow-xl);
        z-index: 10;
    }

    .banner-container {
        width: 100%;
        height: 100%;
        position: relative;
    }

    .banner-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.5s ease;
    }

    .gallery-card:hover .banner-img {
        transform: scale(1.1);
    }

    .overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.9) 0%,
            rgba(0, 0, 0, 0.4) 40%,
            transparent 100%
        );
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        padding: 1.25rem;
        opacity: 0.9;
        transition: opacity 0.3s ease;
    }

    .gallery-card:hover .overlay {
        opacity: 1;
    }

    .card-title {
        margin: 0 0 0.5rem;
        font-size: 1.1rem;
        font-weight: 800;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .card-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.75rem;
    }

    .game-id {
        font-family: var(--font-mono);
        opacity: 0.8;
    }

    .perf-mini {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        background: rgba(255, 255, 255, 0.1);
        padding: 2px 8px;
        border-radius: 99px;
        backdrop-filter: blur(4px);
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .perf-mini :global(svg) {
        color: var(--primary-color);
    }

    @media (max-width: 640px) {
        .card-title {
            font-size: 1rem;
        }
    }
</style>
