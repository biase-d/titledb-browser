<script>
    import { browser } from '$app/environment'
    import Icon from '@iconify/svelte'
    import { getRegionLabel } from '$lib/regions'
    import { proxyImage } from '$lib/image'
    import { preferences } from '$lib/stores/preferences'
    import { getLocalizedName } from '$lib/i18n'
    import TextHighlight from '$lib/components/TextHighlight.svelte'
    import { extractTheme } from '$lib/utils/theme'

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

    // --- Theme Extraction State ---
    /** @type {HTMLElement | undefined} */
    let cardElement = $state()
    let dynamicTheme = $state(null)
    let hasExtracted = false

    // Lazy load the theme only when the compact item approaches the viewport
    $effect(() => {
        if (!browser || !cardElement || hasExtracted) return

        const observer = new IntersectionObserver((entries) => {
            if (entries.isIntersecting) {
                hasExtracted = true
                observer.disconnect()
                
                // Use a tiny 50px thumbnail for ultra-fast extraction
                if (iconUrl) {
                    const targetUrl = proxyImage(iconUrl, 50)
                    if (targetUrl) {
                        extractTheme(targetUrl).then(theme => {
                            dynamicTheme = theme
                        })
                    }
                }
            }
        }, { rootMargin: '200px' })

        observer.observe(cardElement)
        return () => observer.disconnect()
    })
</script>

<a 
    bind:this={cardElement}
    href={`/title/${id}`} 
    class="compact-item" 
    style:--card-primary={dynamicTheme?.primary || 'var(--primary-color)'}
    data-sveltekit-preload-data="tap"
>
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
        min-height: 48px;
        transition: 
            border-color 0.3s ease, 
            background-color 0.3s ease,
            transform 0.2s ease;
    }

    .compact-item:hover,
    .compact-item:focus-visible {
        border-color: var(--card-primary);
        /* Creates a subtle color wash over the row based on the game's theme */
        background-color: color-mix(
            in srgb,
            var(--card-primary) 6%,
            var(--surface-color)
        );
        transform: translateX(4px);
    }

    .compact-item:focus-visible {
        outline: 2px solid var(--card-primary);
        outline-offset: 2px;
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
        transition: color 0.2s ease;
    }

    .compact-item:hover .compact-name,
    .compact-item:focus-visible .compact-name {
        color: var(--card-primary);
    }

    .compact-region {
        font-size: 0.65rem;
        font-weight: 700;
        text-transform: uppercase;
        padding: 1px 5px;
        border-radius: 4px;
        white-space: nowrap;
        transition: all 0.3s ease;
        
        /* Dynamic Theme Colors */
        color: color-mix(in srgb, var(--card-primary) 85%, black);
        background-color: color-mix(
            in srgb,
            var(--card-primary) 12%,
            transparent
        );
    }

    .compact-item:hover .compact-region {
        background-color: color-mix(
            in srgb,
            var(--card-primary) 20%,
            transparent
        );
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