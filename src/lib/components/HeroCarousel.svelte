<script>
    import { browser } from '$app/environment'
    import { onMount, onDestroy } from 'svelte'
    import { fade } from 'svelte/transition'
    import Icon from '@iconify/svelte'
    import { createImageSet } from '$lib/image'
    import { getLocalizedName } from '$lib/i18n'
    import { preferences } from '$lib/stores/preferences'

    let { recentUpdates = [], preferredRegion = 'US' } = $props()

    /** @type {HTMLElement | undefined} */
    let container = $state()
    let heroIndex = $state(0)
    let isPaused = $state(false)
    /** @type {ReturnType<typeof setInterval>} */
    let carouselTimer

    function startCarousel () {
        if (!browser) return
        clearInterval(carouselTimer)
        carouselTimer = setInterval(() => {
            if (!isPaused && recentUpdates.length > 0) {
                nextHero()
            }
        }, 6000)
    }

    function nextHero () {
        if (!container) return
        let nextIndex = (heroIndex + 1) % recentUpdates.length
        scrollTo(nextIndex)
    }

    function prevHero () {
        if (!container) return
        let prevIndex =
            (heroIndex - 1 + recentUpdates.length) % recentUpdates.length
        scrollTo(prevIndex)
    }

    /**
     * @param {number} index
     */
    function setHero (index) {
        scrollTo(index)
        startCarousel() // Restart timer
    }

    /**
     * @param {number} index
     */
    function scrollTo (index) {
        if (!container) return
        heroIndex = index
        const slide = container.children[index]
        if (slide) {
            container.scrollTo({
                // @ts-ignore
                left: slide.offsetLeft,
                behavior: 'smooth',
            })
        }
    }

    function handleScroll () {
        if (!container) return
        const scrollLeft = container.scrollLeft
        const width = container.clientWidth
        const newIndex = Math.round(scrollLeft / width)
        if (
            newIndex !== heroIndex &&
            newIndex >= 0 &&
            newIndex < recentUpdates.length
        ) {
            heroIndex = newIndex
        }
    }

    onMount(() => {
        if (recentUpdates.length > 0) startCarousel()
    })

    onDestroy(() => {
        if (browser) clearInterval(carouselTimer)
    })
</script>

{#if recentUpdates.length > 0}
    <section
        class="hero-carousel"
        onmouseenter={() => (isPaused = true)}
        onmouseleave={() => (isPaused = false)}
        aria-label="Featured recently updated games"
        in:fade
    >
        <div
            class="carousel-track"
            bind:this={container}
            onscroll={handleScroll}
        >
            {#each recentUpdates as game, i}
                {@const bannerSet = createImageSet(game.bannerUrl, {
                    highRes: $preferences.highResImages,
                    bannerWidth: 1000,
                })}
                {@const name = getLocalizedName(game.names, preferredRegion)}
                {@const perf = game.performance || { docked: {}, handheld: {} }}

                <div class="carousel-slide">
                    <div class="hero-bg">
                        {#if bannerSet}
                            <img
                                src={bannerSet.src}
                                srcset={bannerSet.srcset}
                                alt=""
                                loading={i === 0 ? 'eager' : 'lazy'}
                            />
                        {/if}
                        <div class="hero-overlay"></div>
                    </div>

                    <div class="hero-content">
                        <div class="hero-content-inner">
                            <div class="hero-badge">
                                <Icon icon="mdi:clock-outline" /> Latest Update
                            </div>

                            <h1>{name}</h1>

                            {#if perf.docked?.target_fps || perf.handheld?.target_fps}
                                <div class="hero-performance">
                                    {#if perf.docked?.target_fps}
                                        <span
                                            class="perf-badge"
                                            title="Docked: {perf.docked
                                                .target_fps} FPS"
                                        >
                                            <Icon
                                                icon="mdi:television"
                                                width="16"
                                            />
                                            {perf.docked.target_fps ===
                                            'Unlocked'
                                                ? '60'
                                                : perf.docked.target_fps} FPS
                                        </span>
                                    {/if}
                                    {#if perf.handheld?.target_fps}
                                        <span
                                            class="perf-badge"
                                            title="Handheld: {perf.handheld
                                                .target_fps} FPS"
                                        >
                                            <Icon
                                                icon="mdi:nintendo-switch"
                                                width="16"
                                            />
                                            {perf.handheld.target_fps ===
                                            'Unlocked'
                                                ? '60'
                                                : perf.handheld.target_fps} FPS
                                        </span>
                                    {/if}
                                    {#if perf.docked?.resolution_type || perf.handheld?.resolution_type}
                                        <span class="perf-badge res-badge">
                                            <Icon
                                                icon="mdi:monitor-screenshot"
                                                width="16"
                                            />
                                            {perf.docked?.resolution_type ||
                                                perf.handheld?.resolution_type}
                                        </span>
                                    {/if}
                                </div>
                            {/if}

                            <a href="/title/{game.id}" class="hero-cta">
                                View Details <Icon icon="mdi:arrow-right" />
                            </a>
                        </div>
                    </div>
                </div>
            {/each}
        </div>

        <!-- Carousel Controls -->
        <div class="hero-controls">
            <button
                class="control-btn"
                onclick={prevHero}
                aria-label="Previous game"
            >
                <Icon icon="mdi:chevron-left" width="24" height="24" />
            </button>

            <div class="indicators">
                {#each recentUpdates as _, i}
                    <button
                        class="indicator-dot"
                        class:active={i === heroIndex}
                        onclick={() => setHero(i)}
                        aria-label="Go to slide {i + 1}"
                    ></button>
                {/each}
            </div>

            <span class="indicator-counter"
                >{heroIndex + 1} / {recentUpdates.length}</span
            >

            <button
                class="control-btn"
                onclick={nextHero}
                aria-label="Next game"
            >
                <Icon icon="mdi:chevron-right" width="24" height="24" />
            </button>
        </div>
    </section>
{/if}

<style>
    .hero-carousel {
        position: relative;
        border-radius: var(--radius-lg);
        overflow: hidden;
        color: white;
        min-height: 280px;
        display: flex;
        flex-direction: column;
        box-shadow: var(--shadow-lg);
        background-color: var(--surface-color);
    }

    @media (min-width: 640px) {
        .hero-carousel {
            min-height: 380px;
        }
    }

    .carousel-track {
        display: flex;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scrollbar-width: none; /* Firefox */
        -ms-overflow-style: none; /* IE/Edge */
        flex: 1;
        scroll-behavior: smooth;
    }

    .carousel-track::-webkit-scrollbar {
        display: none; /* Chrome/Safari */
    }

    .carousel-slide {
        position: relative;
        flex: 0 0 100%;
        scroll-snap-align: center;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        padding: 2.5rem 2rem 5rem; /* bottom padding accounting for controls */
    }

    @media (max-width: 768px) {
        .carousel-slide {
            padding: 2.5rem 1.5rem 4rem;
        }
    }

    .hero-bg {
        position: absolute;
        inset: 0;
        z-index: 0;
    }

    .hero-bg img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .hero-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(
            to top,
            var(--theme-overlay, rgba(0, 0, 0, 0.95)) 0%,
            color-mix(
                    in srgb,
                    var(--theme-overlay, rgba(0, 0, 0, 0.6)) 80%,
                    transparent
                )
                60%,
            transparent 100%
        );
    }

    @media (prefers-color-scheme: dark) {
        .hero-overlay:not(:global(.has-theme) *) {
            background: linear-gradient(
                to top,
                rgba(0, 0, 0, 0.95) 0%,
                rgba(0, 0, 0, 0.6) 60%,
                rgba(0, 0, 0, 0.3) 100%
            );
        }
    }

    @media (prefers-color-scheme: light) {
        .hero-overlay:not(:global(.has-theme) *) {
            background: linear-gradient(
                to top,
                rgba(255, 255, 255, 0.95) 0%,
                rgba(255, 255, 255, 0.7) 60%,
                rgba(255, 255, 255, 0.4) 100%
            );
        }
    }

    .hero-content {
        position: relative;
        z-index: 1;
        width: 100%;
        max-width: 700px;
    }

    .hero-content-inner {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .hero-badge {
        display: inline-flex;
        align-items: center;
        align-self: flex-start;
        gap: 0.4rem;
        background-color: var(--primary-color);
        color: var(--primary-action-text);
        padding: 6px 14px;
        border-radius: 99px;
        font-size: 0.85rem;
        font-weight: 600;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .hero-carousel h1 {
        font-size: 1.75rem;
        font-weight: 800;
        margin: 0;
        line-height: 1.2;
        color: #ffffff;
        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    }

    @media (min-width: 640px) {
        .hero-carousel h1 {
            font-size: 2.5rem;
        }
    }

    .hero-cta {
        display: inline-flex;
        align-items: center;
        align-self: flex-start;
        gap: 0.5rem;
        background-color: var(--primary-color);
        color: var(--primary-action-text);
        padding: 10px 20px;
        border-radius: 99px;
        font-weight: 700;
        font-size: 0.95rem;
        text-decoration: none;
        transition: transform 0.2s;
    }

    /* Mobile Layout Overrides */
    @media (max-width: 768px) {
        .hero-content-inner {
            align-items: center;
            text-align: center;
            gap: 1rem;
        }

        .hero-badge {
            align-self: center;
        }

        .hero-carousel h1 {
            font-size: 2.15rem;
            text-wrap: balance;
        }

        .hero-cta {
            align-self: inherit;
            width: 100%;
            justify-content: center;
            padding: 14px 20px;
            margin-top: 0.5rem;
            font-size: 1.05rem;
            border-radius: 16px;
        }
    }

    .hero-cta:hover {
        transform: translateY(-2px);
    }

    .hero-performance {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
    }

    @media (max-width: 768px) {
        .hero-performance {
            justify-content: center;
        }
    }

    .perf-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 6px 12px;
        background: rgba(0, 0, 0, 0.6);
        color: white;
        border-radius: 8px;
        font-size: 0.85rem;
        font-weight: 600;
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .hero-controls {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 2rem;
        background: linear-gradient(to top, rgba(0, 0, 0, 0.5), transparent);
        gap: 1rem;
    }

    @media (max-width: 768px) {
        .hero-controls {
            justify-content: flex-end;
            padding: 1rem 1.5rem;
            background: none;
            pointer-events: none;
        }
        .indicator-counter {
            pointer-events: auto;
        }
        button.control-btn,
        div.indicators {
            display: none !important;
        }
    }

    .control-btn {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
    }

    .control-btn:hover {
        background: rgba(255, 255, 255, 0.25);
        transform: scale(1.1);
    }

    .indicators {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .indicator-counter {
        font-size: 0.85rem;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.9);
        background: rgba(0, 0, 0, 0.4);
        padding: 4px 12px;
        border-radius: 99px;
        backdrop-filter: blur(4px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        white-space: nowrap;
        flex-shrink: 0;
    }

    .indicator-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: rgba(255, 255, 255, 0.3);
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .indicator-dot.active {
        background-color: var(--primary-color);
        width: 24px;
        border-radius: 4px;
    }
</style>
