<script>
    import { browser } from '$app/environment'
    import Icon from '@iconify/svelte'
    import { slide } from 'svelte/transition'
    import { createImageSet, proxyImage } from '$lib/image'
    import { preferences } from '$lib/stores/preferences'
    import { getLocalizedName } from '$lib/i18n'
    import { extractTheme } from '$lib/utils/theme'

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

    // --- Theme Extraction State ---
    /** @type {HTMLElement | undefined} */
    let cardElement = $state()
    let dynamicTheme = $state(null)
    let hasExtracted = false

    // Lazy load the theme only when the card enters the viewport
    $effect(() => {
        if (!browser || !cardElement || hasExtracted) return

        const observer = new IntersectionObserver((entries) => {
            if (entries.isIntersecting) {
                hasExtracted = true
                observer.disconnect()
                
                // Use a tiny 50px thumbnail for ultra-fast extraction without lagging the page
                const targetUrl = proxyImage(bannerUrl || iconUrl, 50)
                if (targetUrl) {
                    extractTheme(targetUrl).then(theme => {
                        dynamicTheme = theme
                    })
                }
            }
        }, { 
            // Trigger extraction slightly before it becomes visible
            rootMargin: '200px' 
        })

        observer.observe(cardElement)
        return () => observer.disconnect()
    })
</script>

<a
    bind:this={cardElement}
    href={`/title/${id}`}
    class="gallery-card"
    style:--card-primary={dynamicTheme?.primary || 'var(--primary-color)'}
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
                            <span>
                                {docked.target_fps === 'Unlocked' || handheld.target_fps === 'Unlocked'
                                    ? '60'
                                    : docked.target_fps || handheld.target_fps} FPS
                            </span>
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
        /* Force white text globally for this card so it ignores Light Mode text variables */
        color: #ffffff; 
        border-radius: var(--radius-lg);
        overflow: hidden;
        background-color: var(--input-bg);
        border: 1px solid var(--border-color);
        aspect-ratio: 16 / 9;
        transition: transform 0.3s ease, border-color 0.4s ease, box-shadow 0.4s ease;
        position: relative;
    }

    .gallery-card:hover {
        transform: translateY(-4px) scale(1.02);
        border-color: var(--card-primary);
        box-shadow: 0 12px 30px color-mix(in srgb, var(--card-primary) 25%, rgba(0,0,0,0.3));
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
            color-mix(in srgb, var(--card-primary) 15%, rgba(0, 0, 0, 0.95)) 0%,
            color-mix(in srgb, var(--card-primary) 5%, rgba(0, 0, 0, 0.4)) 45%,
            transparent 100%
        );
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        padding: 1.25rem;
        opacity: 0.9;
        transition: opacity 0.3s ease, background 0.4s ease;
    }

    .gallery-card:hover .overlay {
        opacity: 1;
        background: linear-gradient(
            to top,
            color-mix(in srgb, var(--card-primary) 25%, rgba(0, 0, 0, 0.95)) 0%,
            color-mix(in srgb, var(--card-primary) 10%, rgba(0, 0, 0, 0.6)) 55%,
            transparent 100%
        );
    }

    .card-title {
        margin: 0 0 0.5rem;
        font-size: 1.1rem;
        font-weight: 800;
        /* Ensure text is strictly white to contrast the dark overlay */
        color: #ffffff;
        /* Heavily deepened the shadow so it pops against bright images */
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.9);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .card-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.9);
    }

    .game-id {
        font-family: var(--font-mono);
        opacity: 0.9;
        text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
    }

    .perf-mini {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        background: color-mix(in srgb, var(--card-primary) 15%, rgba(0,0,0,0.4));
        padding: 2px 8px;
        border-radius: 99px;
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        border: 1px solid color-mix(in srgb, var(--card-primary) 30%, rgba(255,255,255,0.1));
        transition: all 0.4s ease;
        color: #ffffff; /* Force white text */
    }

    .perf-mini :global(svg) {
        color: var(--card-primary);
        transition: color 0.4s ease;
    }

    @media (max-width: 640px) {
        .card-title {
            font-size: 1rem;
        }
    }
</style>