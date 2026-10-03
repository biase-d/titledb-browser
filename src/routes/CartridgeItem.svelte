<script>
  import { onMount } from 'svelte'
  import { goto, preloadData } from '$app/navigation'
  import Icon from '@iconify/svelte'
  import { createImageSet, proxyImage } from '$lib/image'
  import { getRegionLabel, getRegionLabelShort } from '$lib/regions'
  import { get } from 'svelte/store'
  import { preferences, isReducedMotion } from '$lib/stores/preferences'
  import { page } from '$app/state'
  import { activeScenes, lightFor } from '$lib/seasons'
  import { getLocalizedName } from '$lib/i18n'
  import { isBot } from '$lib/utils/bot'

  /**
   * A game card drawn as the physical cartridge: 21 x 31 x 3.4 mm, so a card is
   * 100 wide, 147.6 tall and 16.2 thick in the units below, whatever size the
   * column gives it. Everything inside is sized in container width (cqw), which
   * is how it scales with the screen without a media query per size
   *
   * Drawn two ways. Where WebGL is available, one shared canvas paints a
   * low-poly 3D cartridge over this element (see $lib/webgl/cartridgeStage); the
   * element stays in the page as the real link, with the label and the text.
   * Everywhere else - crawlers, no JS, reduced motion, no WebGL, or a lost
   * context - it is the CSS 3D card below. One canvas per card would not work:
   * browsers cap a page at about sixteen WebGL contexts
   */

  /**
   * hero: one large cartridge that is not a link (the details page): it can be
   * dragged round, rides in its own pose, and responds more to scrolling
   * dockTo/docked: where a hero flies to (a bubble on a phone) and whether it is there
   * glActive: whether the card is being drawn in 3D, for the page to know
   * onglactive: told when the card starts or stops being drawn in 3D (for a page that lays itself out differently)
   * handleRef: the card's handle on the stage, for something that needs to turn it
   * onactivate: a tap or Enter on a hero (as opposed to a drag)
   * ghost: a see-through, unlabelled stand-in that invites someone to add data
   * href: where the card leads, when not the title page
   * css: draw it in CSS even where WebGL is available, for somewhere the canvas cannot reach (a modal)
   * pose: ride in a given pose ('hero' for a three-quarter view) without being a hero
   * shown: false to keep it from being drawn (a slide that is not the one showing)
   * clipTo: an element it must stay inside (a carousel that scrolls its slides)
   * layout: 'snap' for a card inside something that scrolls on its own
   * @type {{ titleData: any, query?: string, index?: number, hero?: boolean, ghost?: boolean, href?: string, css?: boolean, pose?: string, shown?: boolean, clipTo?: HTMLElement | undefined, layout?: 'glide' | 'snap', dockTo?: HTMLElement | undefined, docked?: boolean, glActive?: boolean, handleRef?: any, onactivate?: () => void, onglactive?: (on: boolean) => void }}
   */
  let { titleData, index = 0, hero = false, ghost = false, href: linkTo = undefined, css = false, pose = undefined, shown = true, clipTo = undefined, layout = undefined, dockTo = undefined, docked: isDocked = false, glActive = $bindable(false), handleRef = $bindable(null), onactivate = undefined, onglactive = undefined } = $props()

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
   * and reduced-motion users keep: the CSS card face-up and still. Only a real
   * browser that has not asked for less motion goes 'back' (turned away), then
   * 'front' when it scrolls into view
   * @type {'static' | 'back' | 'front'}
   */
  let side = $state('static')
  let settled = $state(false)
  /** True once the shared WebGL canvas is drawing this card */
  let gl = $state(false)

  /** @type {HTMLElement | undefined} */
  let cell = $state()
  /** @type {HTMLElement | undefined} */
  let cart = $state()
  /** @type {any} */
  let handle = null
  /** @type {any} */
  let stageModule = null
  /** @type {any} */
  let stageRef = null

  let cartridgeData = $derived({
    id,
    title: titleName,
    publisher,
    regionBadge: regionBadge || '',
    dockedFps: dockedFps || null,
    handheldFps: handheldFps || null,
    // Half the size unless high-resolution images are on in Settings
    artUrl: ghost ? null : (proxyImage(iconUrl || titleData.bannerUrl, $preferences.highResImages ? 512 : 256) || null),
    ghost,
    ghostCopy: titleData.ghostCopy
  })

  // Names and numbers can change under a card that stays (a region switch)
  let lastKey = ''
  $effect(() => {
    const key = JSON.stringify(cartridgeData)
    if (gl && handle && key !== lastKey) handle.update(cartridgeData)
    lastKey = key
  })

  $effect(() => {
    glActive = gl
    onglactive?.(gl)
  })
  $effect(() => { handleRef = gl ? handle : null })

  // Not drawn while it is not the one showing, and kept inside what clips it
  $effect(() => {
    if (gl && handle) {
      handle.setClip(clipTo ?? null)
      handle.setHidden(!shown)
    }
  })

  // A hero flies to its dock when told to, and back
  $effect(() => {
    // `gl` is read so this runs again once the card is in 3D
    if (hero && gl && handle) handle.setDock(dockTo ?? null, isDocked)
  })

  /** Settings can change while the page is open: style and motion follow them */
  $effect(() => {
    const light = lightFor(activeScenes($preferences.seasonal, page.url.searchParams))
    const options = { style: $preferences.cartridgeStyle, reduced: isReducedMotion($preferences), light }
    stageRef?.setOptions(options)
    // The grid cards only: a hero has its own tilt when inspected
    if (!hero) stageRef?.setGridTilt($preferences.gridTilt && !options.reduced)
  })

  /** The CSS card's own entrance: turned away, then round to the front */
  function startCss () {
    if (!cell) return () => {}
    if (typeof IntersectionObserver === 'undefined' || isReducedMotion(get(preferences))) {
      settled = true
      return () => {}
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
        // then stay off for good. The turn is 650ms plus up to 7 x 28ms of stagger
        settleTimer = setTimeout(() => { settled = true }, 1000)
        observer.disconnect()
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.15 })
    observer.observe(cell)
    return () => {
      observer.disconnect()
      clearTimeout(settleTimer)
    }
  }

  onMount(() => {
    // A crawler gets the plain CSS card. Someone who asked for less motion still
    // gets the 3D card, face-up and still
    if (!cell || isBot()) {
      settled = true
      return
    }
    // Asked for the CSS card: that is the whole job
    if (css) return startCss()

    let cancelled = false
    let cleanup = () => {}

    ;(async () => {
      try {
        stageModule = await import('$lib/webgl/cartridgeStage')
        const stage = await stageModule.getStage()
        if (cancelled || !cell) return

        if (stage) {
          stageRef = stage
          const prefs = get(preferences)
          stage.setOptions({
            style: prefs.cartridgeStyle,
            reduced: isReducedMotion(prefs),
            light: lightFor(activeScenes(prefs.seasonal, page.url.searchParams))
          })
          const h = stage.register(cell, cartridgeData, hero ? { style: 'hero', scrollAmp: 2.4, layout: 'snap', ghost } : { style: pose, layout })
          await h.loaded
          if (cancelled) { h.dispose(); return }
          handle = h
          gl = true

          stage.onLost(() => {
            gl = false
            handle = null
            cleanup = startCss()
          })

          const observer = new IntersectionObserver((entries) => {
            if (entries.some(e => e.isIntersecting)) {
              h.reveal((index % 8) * 28)
              observer.disconnect()
            }
          }, { rootMargin: '0px 0px -8% 0px', threshold: 0.15 })
          observer.observe(cell)
          cleanup = () => observer.disconnect()
          return
        }
      } catch {
        // The module or the context could not be had: the CSS card will do
      }
      if (!cancelled) cleanup = startCss()
    })()

    return () => {
      cancelled = true
      cleanup()
      if (handle) {
        handle.dispose()
        handle = null
        stageModule?.releaseStage()
      }
    }
  })

  /** Hover tilt: fine pointers only. A finger gets a still card, so scrolling never moves it */
  /** @param {PointerEvent} e */
  function tilt (e) {
    if (dragFrom || e.pointerType !== 'mouse' || !cell || isReducedMotion(get(preferences))) return
    const r = cell.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    if (gl && handle) {
      handle.setHover(true)
      handle.setTilt(x, y)
      return
    }
    if (!settled || !cart) return
    cart.style.setProperty('--ry', `${(x * 22).toFixed(1)}deg`)
    cart.style.setProperty('--rx', `${(-y * 18).toFixed(1)}deg`)
    cart.style.setProperty('--gx', `${((x + 0.5) * 100).toFixed(0)}%`)
    cart.style.setProperty('--gy', `${((y + 0.5) * 100).toFixed(0)}%`)
  }

  let inserting = false

  /**
   * Opening a game: the cartridge stays where it is and slides down into an
   * invisible slot at its own bottom edge, then the details page opens. Only for
   * a plain click on the WebGL card. A modified click (new tab, new window), a
   * second click mid-animation, reduced motion, and the CSS card are all the
   * ordinary link
   * @param {MouseEvent} e
   */
  async function open (e) {
    if (hero || !gl || !handle || inserting || e.defaultPrevented || e.button !== 0 ||
      e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || isReducedMotion(get(preferences))) return
    const stage = stageRef
    if (!stage) return

    // Synchronously: a preventDefault after an await is too late
    e.preventDefault()
    inserting = true
    const href = linkTo ?? `/title/${id}`
    // Start fetching the page now, so it is ready by the time the card is in
    preloadData(href).catch(() => {})
    try {
      await handle.insert()
      await goto(href)
    } finally {
      stage.endInsert()
      inserting = false
      setTimeout(() => stageModule?.releaseStage(), 700)
    }
  }

  /** Dragging a hero round. Horizontal drags spin it; a vertical one is left to scroll the page */
  let dragFrom = /** @type {{ x: number, y: number } | null} */ (null)
  /** Where and when a press began, to tell a tap from a drag */
  let pressed = /** @type {{ x: number, y: number, at: number } | null} */ (null)

  /** @param {PointerEvent} e */
  function dragStart (e) {
    if (!hero) return
    pressed = { x: e.clientX, y: e.clientY, at: Date.now() }
    if (!gl || !handle || isReducedMotion(get(preferences))) return
    dragFrom = { x: e.clientX, y: e.clientY }
    try { cell?.setPointerCapture(e.pointerId) } catch { /* a pointer that has already gone: the drag still works */ }
    handle.beginDrag()
  }

  /** @param {PointerEvent} e */
  function dragMove (e) {
    if (!dragFrom || !handle) return
    handle.dragBy(e.clientX - dragFrom.x, e.clientY - dragFrom.y)
    dragFrom = { x: e.clientX, y: e.clientY }
  }

  /** @param {PointerEvent} e */
  function dragEnd (e) {
    // A press that barely moved and was quick is a tap: open the card up
    if (hero && pressed && e.type === 'pointerup' &&
      Math.hypot(e.clientX - pressed.x, e.clientY - pressed.y) < 8 && Date.now() - pressed.at < 500) {
      onactivate?.()
    }
    pressed = null
    if (!dragFrom) return
    dragFrom = null
    try { cell?.releasePointerCapture(e.pointerId) } catch { /* as above */ }
    handle?.endDrag()
  }

  /** @param {KeyboardEvent} e */
  function keyActivate (e) {
    if (hero && onactivate && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onactivate()
    }
  }

  function untilt () {
    if (gl && handle) handle.setHover(false)
    cart?.style.removeProperty('--ry')
    cart?.style.removeProperty('--rx')
  }
</script>

<svelte:element
  this={hero ? 'div' : 'a'}
  bind:this={cell}
  href={hero ? undefined : (linkTo ?? `/title/${id}`)}
  class="cell"
  class:hero
  class:ghost
  data-sveltekit-preload-data={hero ? undefined : 'tap'}
  role={hero ? (onactivate ? 'button' : 'img') : undefined}
  tabindex={hero && onactivate ? 0 : undefined}
  aria-label={hero ? (onactivate ? `Inspect the ${titleName} cartridge` : `${titleName} cartridge`) : ariaLabel}
  style:--i={index % 8}
  onpointermove={(e) => { dragMove(e); tilt(e) }}
  onpointerleave={untilt}
  onpointerdown={dragStart}
  onkeydown={keyActivate}
  onpointerup={dragEnd}
  onpointercancel={dragEnd}
  onclick={open}
>
  <div class="scene">
    {#if !gl}
    <div
      bind:this={cart}
      class="cart"
      class:back={side === 'back'}
      class:turning={side === 'front' && !settled}
      class:settled
    >
      <!-- Front, as on the real card: black shell, a label with a red header band
           (here carrying our numbers, grey when there are none), and the art with the
           title and a code over a blur of it. The mark is below it -->
      <div class="face front">
        <div class="label">
          <div class="band" class:empty={!dockedFps && !handheldFps}>
            {#if dockedFps}
              <span class="mode" title={`Docked: ${dockedFps} FPS`}><small>Docked</small><b>{dockedFps}<i>FPS</i></b></span>
            {/if}
            {#if dockedFps && handheldFps}<span class="rule"></span>{/if}
            {#if handheldFps}
              <span class="mode" title={`Handheld: ${handheldFps} FPS`}><small>Handheld</small><b>{handheldFps}<i>FPS</i></b></span>
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
            <p class="code">{id}{regionBadge ? ` · ${regionBadge}` : ''}</p>
          </div>
        </div>
        <div class="mark" aria-hidden="true"></div>
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
    {/if}
  </div>
</svelte:element>

<style>
  /* One cartridge is 21 x 31 x 3.4 mm. In cqw (1cqw = 1% of the card's width):
     width 100, height 147.6, depth 13 (drawn at 80% of the real 16.2) */
  .cell {
    --w: 100cqw;
    --d: 13cqw;
    --shell: #19191c;
    --shell-light: #2a2a2f;
    --shell-dark: #0b0b0d;
    display: block;
    width: 100%;
    max-width: var(--cart-max, 11rem);
    margin-inline: auto;
    container-type: inline-size;
    text-decoration: none;
    color: inherit;
    -webkit-tap-highlight-color: transparent;
  }

  /* A hero is dragged sideways to spin; up and down still scrolls the page */
  .cell.hero {
    touch-action: pan-y;
    cursor: grab;
    user-select: none;
  }

  .cell.hero:active { cursor: grabbing; }

  /* A stand-in is see-through in the CSS card too */
  .cell.ghost .face { opacity: 0.55; }

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
    transform: translateY(8%) rotateY(48deg) scale(0.95);
    opacity: 0;
  }

  .cart.turning {
    transition: transform 650ms cubic-bezier(0.22, 1, 0.36, 1), opacity 450ms ease-out;
    transition-delay: calc(var(--i) * 28ms);
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
    border-radius: 7cqw;
    background:
      radial-gradient(120% 70% at 20% 0%, rgba(255, 255, 255, 0.10), transparent 60%),
      linear-gradient(160deg, var(--shell-light), var(--shell) 55%, var(--shell-dark));
    box-shadow: inset 0 -2cqw 3cqw rgba(0, 0, 0, 0.35);
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

  /* --- front: the label window is 82.6 wide and 117.1 tall, under a 28.4 band --- */
  .label {
    position: absolute;
    /* Measured from a photograph of a real card */
    top: 12.4cqw;
    left: 8.7cqw;
    width: 82.6cqw;
    height: 117.1cqw;
    display: flex;
    flex-direction: column;
    border-radius: 1.6cqw;
    overflow: hidden;
    background: #2a2c33;
    box-shadow: 0 0 0 1cqw #050506;
  }

  .band {
    flex: none;
    height: 28.4cqw;
    display: flex;
    align-items: center;
    justify-content: space-evenly;
    background: linear-gradient(180deg, #f0192b, #d80f20);
    color: #fff;
  }

  .band.empty { background: linear-gradient(180deg, #6d6d74, #55555c); }

  .band .mode {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.4cqw;
    line-height: 1;
  }

  .band small {
    font-size: 4.2cqw;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    opacity: 0.78;
  }

  .band b {
    font-size: 13cqw;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  .band i {
    margin-left: 1.4cqw;
    font-size: 4.6cqw;
    font-style: normal;
    font-weight: 700;
    opacity: 0.85;
  }

  .band .rule {
    width: 0.4cqw;
    height: 18cqw;
    background: rgba(255, 255, 255, 0.28);
  }

  .band .no-data {
    font-size: 5.6cqw;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    opacity: 0.8;
  }

  .art {
    flex: 1;
    min-height: 0;
    background: #2a2c33;
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

  /* The code and region over the foot of the art: no blur and no title, since
     the cover carries the name. A faint shade keeps it readable */
  .info {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 6cqw 3.5cqw 1.8cqw;
    box-sizing: border-box;
    color: #fff;
    background: linear-gradient(180deg, rgba(8, 9, 12, 0), rgba(8, 9, 12, 0.6));
  }

  .code {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 3.7cqw;
    letter-spacing: 0.02em;
    color: rgba(255, 255, 255, 0.9);
    text-shadow: 0 0 2px rgba(0, 0, 0, 0.7);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* The down-pointing mark under the label */
  .mark {
    position: absolute;
    left: 50%;
    bottom: 4.1cqw;
    width: 16.2cqw;
    height: 7.4cqw;
    translate: -50% 0;
    background: rgba(255, 255, 255, 0.18);
    clip-path: polygon(0 0, 100% 0, 50% 100%);
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
