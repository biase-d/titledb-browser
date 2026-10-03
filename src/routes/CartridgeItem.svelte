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
      <!-- Front, as on the real card: black shell, a label with a red header band
           (here carrying our numbers, grey when there are none), the art, and a
           strip with the title and a code. The mark and the ridges are below it -->
      <div class="face front">
        <div class="label">
          <div class="band" class:empty={!dockedFps && !handheldFps}>
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
          <div class="art">
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
          <div class="info">
            <p class="title" title={titleName}>{titleName}</p>
            <p class="code">{id}{regionBadge ? ` · ${regionBadge}` : ''}</p>
          </div>
        </div>
        <div class="mark" aria-hidden="true"></div>
        <div class="grip" aria-hidden="true"></div>
        <div class="sheen" aria-hidden="true"></div>
      </div>

      <!-- Back: the five contacts, and our details etched where the maker's are.
           Decorative: the link's own label says it all -->
      <div class="face rear" aria-hidden="true">
        <div class="etched">
          <p class="etched-title">{titleName}</p>
          <p class="etched-line">{publisher}</p>
          {#if regionLabel}<p class="etched-line" title={regionLabel}>{regionBadge}</p>{/if}
          {#if dockedFps}<p class="etched-line"><b>Docked</b> {dockedFps} FPS</p>{/if}
          {#if handheldFps}<p class="etched-line"><b>Handheld</b> {handheldFps} FPS</p>{/if}
        </div>
        <div class="slot">
          <i class="arrow"></i>
          {#each [0, 1, 2, 3, 4] as n (n)}
            <span class="finger" class:tall={n % 2 === 1}></span>
          {/each}
        </div>
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
    --shell: #19191c;
    --shell-light: #2a2a2f;
    --shell-dark: #0b0b0d;
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
    border-radius: 3cqw;
    /* The keyed corner is top-left on the real card */
    clip-path: polygon(0 10%, 18% 0, 100% 0, 100% 100%, 0 100%);
    background:
      radial-gradient(120% 70% at 20% 0%, rgba(255, 255, 255, 0.10), transparent 60%),
      linear-gradient(160deg, var(--shell-light), var(--shell) 55%, var(--shell-dark));
    box-shadow: inset 0 0 0 0.7cqw rgba(255, 255, 255, 0.07), inset 0 -2cqw 3cqw rgba(0, 0, 0, 0.35);
  }

  .front { transform: translateZ(calc(var(--d) / 2)); }
  .rear { transform: rotateY(180deg) translateZ(calc(var(--d) / 2)); }

  .edge {
    position: absolute;
    background: linear-gradient(90deg, #0c0c0e, #26262a);
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

  /* --- front: label 84 wide, 108 tall (band 17, art 66, strip 25) --- */
  .label {
    position: absolute;
    top: 8cqw;
    left: 8cqw;
    width: 84cqw;
    height: 108cqw;
    display: flex;
    flex-direction: column;
    border-radius: 1.6cqw;
    overflow: hidden;
    background: #f4f4f2;
    box-shadow: 0 0 0 1cqw #050506, 0 0 0 1.6cqw rgba(255, 255, 255, 0.06);
  }

  .band {
    flex: none;
    height: 17cqw;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5cqw;
    background: linear-gradient(180deg, #f0192b, #d80f20);
    color: #fff;
  }

  .band.empty { background: linear-gradient(180deg, #6d6d74, #55555c); }

  .band span {
    display: inline-flex;
    align-items: center;
    gap: 2cqw;
    font-size: 9.5cqw;
    font-weight: 800;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    text-shadow: 0 0.3cqw 0.6cqw rgba(0, 0, 0, 0.25);
  }

  .band .no-data {
    font-size: 6.4cqw;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    opacity: 0.9;
  }

  .art {
    flex: none;
    height: 66cqw;
    background: #ececea;
    overflow: hidden;
  }

  .art img {
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
    font-size: 22cqw;
    color: rgba(0, 0, 0, 0.25);
  }

  .info {
    flex: 1;
    min-height: 0;
    padding: 2.2cqw 3.5cqw 1.6cqw;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: #f4f4f2;
    color: #15161a;
  }

  .title {
    margin: 0;
    font-size: 6.4cqw;
    font-weight: 800;
    line-height: 1.15;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .code {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 3.7cqw;
    letter-spacing: 0.02em;
    color: #4b4d57;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* The down-pointing mark under the label */
  .mark {
    position: absolute;
    left: 50%;
    bottom: 16cqw;
    width: 11cqw;
    height: 7cqw;
    translate: -50% 0;
    background: rgba(255, 255, 255, 0.16);
    clip-path: polygon(0 0, 100% 0, 50% 100%);
  }

  /* The ridges along the bottom edge */
  .grip {
    position: absolute;
    left: 14cqw;
    right: 14cqw;
    bottom: 4.5cqw;
    height: 6cqw;
    background: repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.13) 0 1.6cqw, transparent 1.6cqw 4.4cqw);
    border-radius: 1cqw;
  }

  /* A moving highlight that follows the pointer */
  .sheen {
    position: absolute;
    inset: 0;
    opacity: 0;
    pointer-events: none;
    transition: opacity 200ms ease;
    background: radial-gradient(circle at var(--gx) var(--gy), rgba(255, 255, 255, 0.32), transparent 55%);
    mix-blend-mode: soft-light;
  }

  /* --- back: the details etched in light grey, and the contacts --- */
  .etched {
    position: absolute;
    top: 9cqw;
    left: 12cqw;
    right: 10cqw;
    color: rgba(255, 255, 255, 0.62);
    text-shadow: 0 -0.2cqw 0 rgba(0, 0, 0, 0.6), 0 0.2cqw 0 rgba(255, 255, 255, 0.05);
  }

  .etched p { margin: 0; }

  .etched-title {
    font-size: 7cqw;
    font-weight: 800;
    line-height: 1.2;
    color: rgba(255, 255, 255, 0.82);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .etched-line {
    margin-top: 1.4cqw;
    font-size: 5cqw;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .etched-line b { font-weight: 700; color: rgba(255, 255, 255, 0.8); margin-right: 1cqw; }

  /* Five fingers: gold traces, each ending in a green tab at the top, alternating
     in height as on the real card */
  .slot {
    position: absolute;
    left: 13cqw;
    right: 13cqw;
    bottom: 8cqw;
    height: 62cqw;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    padding: 0 2cqw;
    background: rgba(0, 0, 0, 0.55);
    border-radius: 2cqw;
    box-shadow: inset 0 0 0 0.6cqw rgba(255, 255, 255, 0.05);
  }

  .finger {
    position: relative;
    width: 10cqw;
    height: 88%;
    border-radius: 1cqw 1cqw 0 0;
    background:
      linear-gradient(90deg, transparent 38%, #b8893a 38% 62%, transparent 62%),
      #1b1b1e;
  }

  .finger.tall { height: 96%; }

  .finger::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 24%;
    border-radius: 1cqw 1cqw 0 0;
    background: linear-gradient(180deg, #5fd16b, #2f9a43);
  }

  .arrow {
    position: absolute;
    top: -6cqw;
    left: 2cqw;
    width: 4.5cqw;
    height: 3.2cqw;
    background: rgba(255, 255, 255, 0.3);
    clip-path: polygon(0 0, 100% 0, 50% 100%);
  }

  @media (prefers-reduced-motion: reduce) {
    .cart.turning,
    .cart.settled { transition: none; }
  }
</style>
