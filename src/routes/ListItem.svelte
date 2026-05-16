<script>
  import { browser } from '$app/environment'
  import Icon from '@iconify/svelte'
  import { slide } from 'svelte/transition'
  import { getRegionLabel } from '$lib/regions'
  import { createImageSet, proxyImage } from '$lib/image'
  import { preferences } from '$lib/stores/preferences'
  import { getLocalizedName } from '$lib/i18n'
  import TextHighlight from '$lib/components/TextHighlight.svelte'
  import { extractTheme } from '$lib/utils/theme'

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

  // --- Theme Extraction State ---
  /** @type {HTMLElement | undefined} */
  let cardElement = $state()
  let dynamicTheme = $state(null)
  let hasExtracted = false

  // Lazy load the theme only when the list item approaches the viewport
  $effect(() => {
    if (!browser || !cardElement || hasExtracted) return

    const observer = new IntersectionObserver((entries) => {
      if (entries.isIntersecting) {
        hasExtracted = true
        observer.disconnect()
        
        // Use a tiny 50px image purely for performance-friendly color extraction
        const targetUrl = proxyImage(iconUrl || titleData.bannerUrl, 50)
        
        if (targetUrl) {
          extractTheme(targetUrl).then(theme => {
            dynamicTheme = theme
          })
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
  class="list-item"
  style:--card-primary={dynamicTheme?.primary || 'var(--primary-color)'}
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
    /* Transition dynamically injected styles */
    transition:
      border-color 0.4s ease,
      background-color 0.4s ease,
      transform 0.2s ease,
      box-shadow 0.4s ease;
  }

  @media (max-width: 640px) {
    .list-item {
      gap: 0.75rem;
    }
  }

  .list-item:hover .title-name,
  .list-item:focus-visible .title-name {
    color: var(--card-primary);
  }

  .list-item:hover,
  .list-item:focus-visible {
    border-color: var(--card-primary);
    /* Creates a subtle color wash over the row based on the game's theme */
    background-color: color-mix(
      in srgb,
      var(--card-primary) 8%,
      var(--surface-color)
    );
    box-shadow: 0 4px 12px color-mix(in srgb, var(--card-primary) 10%, rgba(0,0,0,0.1));
    transform: translateX(4px);
  }

  .list-item:focus-visible {
    outline: 2px solid var(--card-primary);
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
    transition: color 0.3s ease;
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
    padding: 2px 6px;
    border-radius: 4px;
    max-width: 140px;
    flex-shrink: 0;
    transition: all 0.3s ease;
    
    /* Default state utilizing the dynamic theme */
    color: color-mix(in srgb, var(--card-primary) 80%, black);
    background-color: color-mix(in srgb, var(--card-primary) 8%, var(--input-bg));
    border: 1px solid color-mix(in srgb, var(--card-primary) 20%, var(--border-color));
  }

  .region-badge :global(svg) {
    flex-shrink: 0;
    color: var(--card-primary);
  }

  .badge-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Intensify the badge colors when the list item is hovered */
  .list-item:hover .region-badge {
    color: var(--card-primary);
    background-color: color-mix(in srgb, var(--card-primary) 15%, transparent);
    border-color: color-mix(in srgb, var(--card-primary) 40%, transparent);
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
    color: var(--card-primary);
    width: 14px;
    height: 14px;
    transition: color 0.4s ease;
  }
</style>