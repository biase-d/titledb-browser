<script>
  import { onMount } from 'svelte'
  import Icon from '@iconify/svelte'
  import { createImageSet } from '$lib/image'
  import { getRegionLabel, getRegionLabelShort } from '$lib/regions'
  import { preferences } from '$lib/stores/preferences'
  import { getLocalizedName } from '$lib/i18n'
  import { isBot } from '$lib/utils/bot'

  /**
   * A game card drawn as the physical cartridge: 21 x 31 x 3.4 mm, so a card is
   * 100 wide, 147.6 tall and 16.2 thick in the units below, whatever size the
   * column gives it. Everything inside is sized in container width (cqw), which
   * is how it scales with the screen without a media query per size
   *
   * It is plain CSS 3D, not WebGL. A grid shows dozens of cards and browsers cap
   * a page at about sixteen WebGL contexts, so one canvas per card would start
   * dropping them; transforms cost nothing at this scale and the card stays a
   * real link with real text for crawlers and screen readers
   */

  /** @type {{ titleData: any, query?: string, index?: number }} */
  let { titleData, index = 0 } = $props()

  let id = $derived(titleData.id)
  let iconUrl = $derived(titleData.iconUrl)
  let names = $derived(titleData.names || [])
  let regions = $derived(titleData.regions || [])
  let publisher = $derived(titleData.publisher || 'N/A')
  let performance = $derived(titleData.performance || {})
  let docked = $derived(performance.docked || {})
  let handheld = $derived(performance.handheld || {})

  let preferredRegion = $state('US')
  preferences.subscribe((p) => (preferredRegion = p.region))

  let titleName = $derived(getLocalizedName(names, preferredRegion))
  let regionLabel = $derived(getRegionLabel(regions))
  let regionBadge = $derived(getRegionLabelShort(regions))

  let imageSet = $derived(
    createImageSet(iconUrl || titleData.bannerUrl, {
      highRes: $preferences.highResImages,
      thumbnailWidth: 240
    })
  )

  /** @param {any} mode */
  const fpsOf = (mode) => (mode?.target_fps === 'Unlocked' ? '60' : mode?.target_fps)
  let dockedFps = $derived(fpsOf(docked))
  let handheldFps = $derived(fpsOf(handheld))

  let ariaLabel = $derived(
    `View details for ${titleName} by ${publisher}.` +
      (dockedFps ? ` Docked mode runs at ${dockedFps} FPS.` : '') +
      (handheldFps ? ` Handheld mode runs at ${handheldFps} FPS.` : '')
  )

  let imageFailed = $state(false)
  /** @type {HTMLImageElement | undefined} */
  let imageElement = $state()
  $effect(() => {
    if (imageElement?.complete && imageElement.naturalWidth === 0 && imageElement.currentSrc) imageFailed = true
  })
  let hasArtwork = $derived(!imageFailed && !!(imageSet?.src || iconUrl || titleData.bannerUrl))

  /**
   * 'static' is what the server renders and what a crawler, a no-JS visitor
   * and reduced-motion users keep: the card face-up and still. Only a real
   * browser that has not asked for less motion goes 'back' (turned away), then
   * 'front' when it scrolls into view
   * @type {'static' | 'back' | 'front'}
   */
  let side = $state('static')
  let settled = $state(false)

  /** @type {HTMLElement | undefined} */
  let cell = $state()
  /** @type {HTMLElement | undefined} */
  let cart = $state()

  onMount(() => {
    if (!cell || isBot() || typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      settled = true
      return
    }

    side = 'back'
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let settleTimer
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) {
        // A frame at the back first, so the turn is seen and not skipped
        requestAnimationFrame(() => { side = 'front' })
        // Time-based rather than waiting for transitionend, which never comes if
        // the turn is interrupted or the tab is in the background; hover would
        // then stay off for good. The turn is 900ms plus up to 7 x 55ms of stagger
        settleTimer = setTimeout(() => { settled = true }, 1400)
        observer.disconnect()
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.15 })
    observer.observe(cell)
    return () => {
      observer.disconnect()
      clearTimeout(settleTimer)
    }
  })

  /** Hover tilt: fine pointers only. A finger gets a still card, so scrolling never moves it */
  /** @param {PointerEvent} e */
  function tilt (e) {
    if (!settled || e.pointerType !== 'mouse' || !cell || !cart) return
    const r = cell.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    cart.style.setProperty('--ry', `${(x * 22).toFixed(1)}deg`)
    cart.style.setProperty('--rx', `${(-y * 18).toFixed(1)}deg`)
    cart.style.setProperty('--gx', `${((x + 0.5) * 100).toFixed(0)}%`)
    cart.style.setProperty('--gy', `${((y + 0.5) * 100).toFixed(0)}%`)
  }

  function untilt () {
    cart?.style.removeProperty('--ry')
    cart?.style.removeProperty('--rx')
  }
</script>

<a
  bind:this={cell}
  href={`/title/${id}`}
  class="cell"
  data-sveltekit-preload-data="tap"
  aria-label={ariaLabel}
  style:--i={index % 8}
  onpointermove={tilt}
  onpointerleave={untilt}
>
  <div class="scene">
    <div
      bind:this={cart}
      class="cart"
      class:back={side === 'back'}
      class:turning={side === 'front' && !settled}
      class:settled
    >
      <!-- Front: the label, the title, and the numbers the card is here for -->
      <div class="face front">
        <div class="label">
          {#if hasArtwork}
            <img
              bind:this={imageElement}
              onerror={() => (imageFailed = true)}
              src={imageSet?.src || iconUrl || titleData.bannerUrl}
              srcset={imageSet?.srcset}
              sizes="(max-width: 560px) 45vw, 180px"
              alt=""
              loading="lazy"
              decoding="async"
              width="200"
              height="200"
            />
          {:else}
            <div class="no-art"><Icon icon="mdi:controller-classic-outline" /></div>
          {/if}
        </div>
        <p class="title" title={titleName}>{titleName}</p>
        <div class="stats">
          {#if dockedFps}
            <span title={`Docked: ${dockedFps} FPS`}><Icon icon="mdi:television" />{dockedFps}</span>
          {/if}
          {#if handheldFps}
            <span title={`Handheld: ${handheldFps} FPS`}><Icon icon="mdi:nintendo-switch" />{handheldFps}</span>
          {/if}
          {#if !dockedFps && !handheldFps}
            <span class="no-data">No data yet</span>
          {/if}
        </div>
        <div class="grip" aria-hidden="true"></div>
        <div class="sheen" aria-hidden="true"></div>
      </div>

      <!-- Back: the sticker and the contacts. Decorative: the link's own label says it all -->
      <div class="face rear" aria-hidden="true">
        <div class="sticker">
          <p class="sticker-title">{titleName}</p>
          <p class="sticker-line">{publisher}</p>
          {#if regionLabel}<p class="sticker-line region" title={regionLabel}>{regionBadge}</p>{/if}
          <dl>
            {#if dockedFps}<div><dt>Docked</dt><dd>{dockedFps} FPS</dd></div>{/if}
            {#if handheldFps}<div><dt>Handheld</dt><dd>{handheldFps} FPS</dd></div>{/if}
          </dl>
        </div>
        <div class="contacts"></div>
      </div>

      <div class="edge left" aria-hidden="true"></div>
      <div class="edge right" aria-hidden="true"></div>
      <div class="edge top" aria-hidden="true"></div>
      <div class="edge bottom" aria-hidden="true"></div>
    </div>
  </div>
</a>

<style>
  /* One cartridge is 21 x 31 x 3.4 mm. In cqw (1cqw = 1% of the card's width):
     width 100, height 147.6, depth 16.2 */
  .cell {
    --w: 100cqw;
    --d: 16.2cqw;
    --plastic: #2a2f3a;
    --plastic-light: #3a4150;
    display: block;
    width: 100%;
    max-width: 11rem;
    margin-inline: auto;
    container-type: inline-size;
    text-decoration: none;
    color: inherit;
    -webkit-tap-highlight-color: transparent;
  }

  .cell:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 6px;
    border-radius: 8px;
  }

  .scene {
    perspective: 900px;
    aspect-ratio: 21 / 31;
  }

  .cart {
    --rx: 0deg;
    --ry: 0deg;
    --gx: 50%;
    --gy: 30%;
    position: relative;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    transform: rotateX(var(--rx)) rotateY(var(--ry));
  }

  /* Turned to its back, before it scrolls into view */
  .cart.back {
    transform: rotateY(180deg);
  }

  .cart.turning {
    transition: transform 900ms cubic-bezier(0.22, 1, 0.36, 1);
    transition-delay: calc(var(--i) * 55ms);
  }

  /* Hover is for a mouse: a hover-capable pointer only, and only once settled */
  @media (hover: hover) and (pointer: fine) {
    .cart.settled {
      transition: transform 160ms ease-out;
    }

    .cell:hover .cart.settled,
    .cell:focus-visible .cart.settled {
      transform: translateY(-6px) rotateX(var(--rx)) rotateY(var(--ry)) scale(1.04);
    }

    .cell:hover .sheen,
    .cell:focus-visible .sheen {
      opacity: 1;
    }
  }

  .face {
    position: absolute;
    inset: 0;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    overflow: hidden;
    border-radius: 2.4cqw;
    /* The keyed corner of the real card */
    clip-path: polygon(0 0, 84% 0, 100% 9%, 100% 100%, 0 100%);
    background:
      linear-gradient(160deg, var(--plastic-light), var(--plastic) 55%, #1d2129);
    box-shadow: inset 0 0 0 0.6cqw rgba(255, 255, 255, 0.06);
  }

  .front { transform: translateZ(calc(var(--d) / 2)); }
  .rear { transform: rotateY(180deg) translateZ(calc(var(--d) / 2)); }

  .edge {
    position: absolute;
    background: linear-gradient(90deg, #14171d, #2a2f3a);
    backface-visibility: hidden;
  }

  .edge.left,
  .edge.right {
    top: 0;
    width: var(--d);
    height: 100%;
  }
  .edge.left { left: 0; transform: translateX(-50%) rotateY(-90deg); }
  .edge.right { right: 0; transform: translateX(50%) rotateY(90deg); }
  .edge.top,
  .edge.bottom {
    left: 0;
    width: 100%;
    height: var(--d);
  }
  .edge.top { top: 0; transform: translateY(-50%) rotateX(90deg); }
  .edge.bottom { bottom: 0; transform: translateY(50%) rotateX(-90deg); }

  /* --- front --- */
  .label {
    position: absolute;
    top: 8cqw;
    left: 8cqw;
    width: 84cqw;
    height: 84cqw;
    border-radius: 2cqw;
    overflow: hidden;
    background: #11141a;
    box-shadow: 0 0 0 0.6cqw rgba(0, 0, 0, 0.5);
  }

  .label img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .no-art {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    font-size: 24cqw;
    color: rgba(255, 255, 255, 0.35);
  }

  .title {
    position: absolute;
    top: 96cqw;
    left: 8cqw;
    width: 84cqw;
    margin: 0;
    font-size: 6.6cqw;
    font-weight: 700;
    line-height: 1.2;
    color: #f2f4f8;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .stats {
    position: absolute;
    top: 118cqw;
    left: 8cqw;
    display: flex;
    gap: 2.5cqw;
  }

  .stats span {
    display: inline-flex;
    align-items: center;
    gap: 1.6cqw;
    padding: 1.4cqw 3cqw;
    font-size: 6cqw;
    font-weight: 700;
    line-height: 1;
    color: #fff;
    background: color-mix(in srgb, var(--primary-color) 55%, #0b0d12);
    border-radius: 1.6cqw;
    font-variant-numeric: tabular-nums;
  }

  .stats .no-data {
    font-weight: 600;
    font-size: 5.2cqw;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.6);
  }

  /* The ridged grip along the bottom of the real card */
  .grip {
    position: absolute;
    left: 8cqw;
    right: 8cqw;
    bottom: 5cqw;
    height: 5cqw;
    background: repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.16) 0 0.8cqw, transparent 0.8cqw 2.4cqw);
    border-radius: 1cqw;
  }

  /* A moving highlight that follows the pointer */
  .sheen {
    position: absolute;
    inset: 0;
    opacity: 0;
    pointer-events: none;
    transition: opacity 200ms ease;
    background: radial-gradient(circle at var(--gx) var(--gy), rgba(255, 255, 255, 0.28), transparent 55%);
    mix-blend-mode: soft-light;
  }

  /* --- back --- */
  .sticker {
    position: absolute;
    top: 8cqw;
    left: 8cqw;
    width: 84cqw;
    padding: 5cqw;
    box-sizing: border-box;
    border-radius: 2cqw;
    background: #e9ebf0;
    color: #1a1d24;
  }

  .sticker p { margin: 0; }

  .sticker-title {
    font-size: 7cqw;
    font-weight: 800;
    line-height: 1.2;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .sticker-line {
    margin-top: 1.6cqw;
    font-size: 5.4cqw;
    color: #4a5060;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sticker-line.region {
    font-size: 4.6cqw;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .sticker dl {
    margin: 4cqw 0 0;
    padding-top: 3cqw;
    border-top: 0.5cqw solid #c4c8d2;
    display: grid;
    gap: 1.5cqw;
  }

  .sticker dl div {
    display: flex;
    justify-content: space-between;
    font-size: 5.4cqw;
  }

  .sticker dt { color: #4a5060; }
  .sticker dd { margin: 0; font-weight: 800; font-variant-numeric: tabular-nums; }

  /* The gold contacts */
  .contacts {
    position: absolute;
    left: 14cqw;
    right: 14cqw;
    bottom: 6cqw;
    height: 17cqw;
    background:
      repeating-linear-gradient(90deg, #d4af37 0 4.2cqw, #3b3320 4.2cqw 5.6cqw);
    border-radius: 1cqw;
    box-shadow: inset 0 0 0 0.8cqw rgba(0, 0, 0, 0.35);
  }

  @media (prefers-reduced-motion: reduce) {
    .cart.turning,
    .cart.settled { transition: none; }
  }
</style>
