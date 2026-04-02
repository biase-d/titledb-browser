<script>
    import { browser } from '$app/environment'
    import { onMount, onDestroy } from 'svelte'
    import { fade } from 'svelte/transition'
    import Icon from '@iconify/svelte'
    import { createImageSet } from '$lib/image'
    import { getLocalizedName } from '$lib/i18n'
    import { preferences } from '$lib/stores/preferences'
    import { extractTheme } from '$lib/utils/theme' // Your new theme engine

    let { recentUpdates = [], preferredRegion = 'US' } = $props()

    /** @type {HTMLElement | undefined} */
    let container = $state()
    let heroIndex = $state(0)
    let isPaused = $state(false)
    let dynamicTheme = $state(null)
    
    /** @type {ReturnType<typeof setInterval>} */
    let carouselTimer

    // Auto-extract theme when the active slide changes
    $effect(() => {
        if (!browser || recentUpdates.length === 0) return
        const activeGame = recentUpdates[heroIndex]
        if (activeGame?.bannerUrl) {
            extractTheme(activeGame.bannerUrl).then(theme => {
                dynamicTheme = theme
            })
        }
    })

    function startCarousel () {
        if (!browser) return
        clearInterval(carouselTimer)
        carouselTimer = setInterval(() => {
            if (!isPaused && recentUpdates.length > 0) {
                nextHero()
            }
        }, 6000) // 6 seconds per slide
    }

    function nextHero () {
        if (!container) return
        let nextIndex = (heroIndex + 1) % recentUpdates.length
        scrollTo(nextIndex)
    }

    function prevHero () {
        if (!container) return
        let prevIndex = (heroIndex - 1 + recentUpdates.length) % recentUpdates.length
        scrollTo(prevIndex)
    }

    /** @param {number} index */
    function setHero (index) {
        scrollTo(index)
        startCarousel()
    }

    /** @param {number} index */
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
        if (newIndex !== heroIndex && newIndex >= 0 && newIndex < recentUpdates.length) {
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
        style:--dynamic-primary={dynamicTheme?.primary || 'var(--primary-color)'}
        style:--dynamic-accent={dynamicTheme?.accent || 'rgba(255,255,255,0.1)'}
        style:--dynamic-overlay={dynamicTheme?.overlay || 'rgba(0,0,0,0.8)'}
        onmouseenter={() => (isPaused = true)}
        onmouseleave={() => (isPaused = false)}
        aria-label="Featured recently updated games"
        in:fade
    >
        <div class="carousel-track" bind:this={container} onscroll={handleScroll}>
            {#each recentUpdates as game, i}
                {@const bannerSet = createImageSet(game.bannerUrl, {
                    highRes: $preferences.highResImages,
                    bannerWidth: 1000,
                })}
                {@const name = getLocalizedName(game.names, preferredRegion)}
                {@const perf = game.performance || { docked: {}, handheld: {} }}
                {@const isActive = i === heroIndex}

                <div class="carousel-slide" class:is-active={isActive}>
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
                        <div class="hero-badge">
                            <Icon icon="mdi:clock-outline" /> Latest Update
                        </div>

                        <h1>{name}</h1>

                        {#if perf.docked?.target_fps || perf.handheld?.target_fps}
                            <div class="hero-performance">
                                {#if perf.docked?.target_fps}
                                    <span class="perf-glass-badge">
                                        <Icon icon="mdi:television" width="16" />
                                        {perf.docked.target_fps === 'Unlocked' ? '60' : perf.docked.target_fps} FPS
                                    </span>
                                {/if}
                                {#if perf.handheld?.target_fps}
                                    <span class="perf-glass-badge">
                                        <Icon icon="mdi:nintendo-switch" width="16" />
                                        {perf.handheld.target_fps === 'Unlocked' ? '60' : perf.handheld.target_fps} FPS
                                    </span>
                                {/if}
                                {#if perf.docked?.resolution_type || perf.handheld?.resolution_type}
                                    <span class="perf-glass-badge">
                                        <Icon icon="mdi:monitor-screenshot" width="16" />
                                        {perf.docked?.resolution_type || perf.handheld?.resolution_type}
                                    </span>
                                {/if}
                            </div>
                        {/if}

                        <div class="hero-actions">
                            <a href="/title/{game.id}" class="hero-cta primary-cta">
                                View Details <Icon icon="mdi:arrow-right" />
                            </a>
                        </div>
                    </div>
                </div>
            {/each}
        </div>

        <div class="hero-controls">
            <div class="indicators">
                {#each recentUpdates as _, i}
                    <button
                        class="indicator-bar"
                        class:active={i === heroIndex}
                        class:paused={isPaused}
                        onclick={() => setHero(i)}
                        aria-label="Go to slide {i + 1}"
                    >
                        <div class="progress-fill"></div>
                    </button>
                {/each}
            </div>
            
            <div class="nav-buttons">
                <button class="control-btn" onclick={prevHero} aria-label="Previous">
                    <Icon icon="mdi:chevron-left" width="24" />
                </button>
                <button class="control-btn" onclick={nextHero} aria-label="Next">
                    <Icon icon="mdi:chevron-right" width="24" />
                </button>
            </div>
        </div>
    </section>
{/if}

<style>
    .hero-carousel {
        position: relative;
        display: flex;           /* Add this */
        flex-direction: column;  /* Add this */
        border-radius: 20px;
        overflow: hidden;
        color: white;
        height: 440px; 
        box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.3);
        background-color: var(--surface-color);
        transition: --dynamic-primary 0.5s ease, --dynamic-overlay 0.5s ease;
    }

    .carousel-track {
        display: flex;
        flex: 1; /* Changed from height: 100% to fix mobile collapsing */
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scrollbar-width: none;
        scroll-behavior: smooth;
    }
    .carousel-track::-webkit-scrollbar { display: none; }

    .carousel-slide {
        position: relative;
        flex: 0 0 100%;
        scroll-snap-align: center;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        padding: 3rem;
    }

    .hero-bg {
        position: absolute;
        inset: 0;
        z-index: 0;
        overflow: hidden; /* Contains the zoom animation */
        background-color: var(--dynamic-primary); /* Fallback before load */
    }

    .hero-bg img {
        position: absolute; /* Add this to pin it perfectly */
        inset: 0;           /* Add this */
        display: block;     /* Kills the magic white space at the bottom */
        width: 100%;
        height: 100%;
        object-fit: cover;
        transform: scale(1.05);
        transition: transform 6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    /* Cinematic pan/zoom effect only for the active slide */
    .carousel-slide.is-active .hero-bg img {
        transform: scale(1);
    }

    .hero-overlay {
        position: absolute;
        inset: 0;
        /* Rich, themed gradient: Blends 20% game color with 80% deep black */
        background: linear-gradient(
            to top, 
            color-mix(in srgb, var(--dynamic-primary) 20%, #050505 80%) 0%,
            color-mix(in srgb, var(--dynamic-primary) 10%, rgba(5, 5, 5, 0.8) 90%) 50%,
            transparent 100%
        );
    }

    .hero-content {
        position: relative;
        z-index: 1;
        width: 100%;
        max-width: 600px; /* Tighter max-width for better typography reading lines */
        display: flex;
        flex-direction: column;
        gap: 1rem;
        transform: translateY(20px);
        opacity: 0;
        transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        transition-delay: 0.2s;
    }

    .carousel-slide.is-active .hero-content {
        transform: translateY(0);
        opacity: 1;
    }

    .hero-badge {
        display: inline-flex;
        align-items: center;
        align-self: flex-start;
        gap: 0.5rem;
        background: var(--dynamic-primary);
        color: white;
        padding: 6px 16px;
        border-radius: 99px;
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .hero-carousel h1 {
        font-size: clamp(2rem, 5vw, 3rem);
        font-weight: 900;
        margin: 0;
        line-height: 1.1;
        color: #ffffff;
        /* Replaced generic black shadow with a heavily themed deep shadow */
        text-shadow: 0 4px 24px color-mix(in srgb, var(--dynamic-primary) 60%, rgba(0, 0, 0, 0.9));
    }

    .hero-performance {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
    }

    /* Modern Themed Glassmorphism Badges */
    .perf-glass-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 6px 14px;
        /* Mixes primary color into a dark semi-transparent base */
        background: color-mix(in srgb, var(--dynamic-primary) 25%, rgba(0, 0, 0, 0.5));
        color: white;
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: 600;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        /* Subtle themed border */
        border: 1px solid color-mix(in srgb, var(--dynamic-primary) 40%, rgba(255, 255, 255, 0.15));
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .hero-actions {
        margin-top: 0.5rem;
    }

    .hero-cta {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 12px 28px;
        border-radius: 14px;
        font-weight: 700;
        font-size: 1rem;
        text-decoration: none;
        transition: all 0.2s ease;
    }

    .primary-cta {
        background-color: white;
        color: black;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
        border: 1px solid transparent;
    }

    .primary-cta:hover {
        transform: translateY(-3px) scale(1.02);
        /* Beautiful colored glow based on the game's theme when hovering */
        box-shadow: 0 12px 24px color-mix(in srgb, var(--dynamic-primary) 40%, transparent);
    }

    .hero-controls {
        position: absolute;
        bottom: 1.5rem;
        right: 2rem;
        z-index: 2;
        display: flex;
        align-items: center;
        gap: 1.5rem;
    }

    .nav-buttons {
        display: flex;
        gap: 0.5rem;
    }

    .control-btn {
        /* Themed glass for the buttons */
        background: color-mix(in srgb, var(--dynamic-primary) 15%, rgba(0, 0, 0, 0.4));
        backdrop-filter: blur(8px);
        border: 1px solid color-mix(in srgb, var(--dynamic-primary) 30%, rgba(255, 255, 255, 0.1));
        color: white;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
    }

    .control-btn:hover {
        background: var(--dynamic-primary);
        transform: scale(1.1);
        box-shadow: 0 4px 12px color-mix(in srgb, var(--dynamic-primary) 50%, transparent);
    }

    .indicators {
        display: flex;
        gap: 6px;
    }

    /* Animated Progress Bars instead of dots */
    .indicator-bar {
        width: 30px;
        height: 6px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.2);
        border: none;
        padding: 0;
        cursor: pointer;
        overflow: hidden;
        position: relative;
    }

    .progress-fill {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 0%;
        background-color: var(--dynamic-primary);
    }

    .indicator-bar.active .progress-fill {
        animation: progress 6s linear forwards;
    }

    .indicator-bar.paused .progress-fill {
        animation-play-state: paused;
    }

    @keyframes progress {
        from { width: 0%; }
        to { width: 100%; }
    }

    @media (max-width: 768px) {
        .hero-carousel {
            /* Switch from a fixed height to a dynamic one to prevent text overflow */
            height: auto;
            min-height: 500px;
            border-radius: 0; /* Bleed to the edges of the screen */
        }
        
        .carousel-track {
            /* Ensures horizontal swiping doesn't trigger browser "back/forward" navigation */
            touch-action: pan-y pinch-zoom;
        }
        
        .carousel-slide {
            padding: 2rem 1.25rem 4.5rem; /* Tighter side padding, room for controls at bottom */
        }

        .hero-content {
            align-items: center; /* Forces all flex children to the center */
            text-align: center;
        }

        .hero-carousel h1 {
            /* Rescales better on small screens */
            font-size: clamp(1.75rem, 8vw, 2.25rem); 
            /* MAGIC CSS: Prevents awkward widows (e.g., "The Legend of / Zelda" becomes stacked evenly) */
            text-wrap: balance; 
        }

        .hero-performance {
            justify-content: center;
            gap: 0.4rem; /* Tighter spacing so badges don't wrap to 3 lines */
        }
        
        .perf-glass-badge {
            font-size: 0.75rem; /* Slightly smaller to fit on narrow screens */
            padding: 4px 10px;
        }

        .hero-actions { 
            width: 100%; 
            margin-top: 1rem;
        }
        
        .hero-cta { 
            width: 100%; 
            justify-content: center; 
        }

        .hero-controls {
            right: 0;
            left: 0;
            bottom: 1.5rem;
            justify-content: center;
            padding: 0 1.5rem; /* Padding prevents bars from touching screen edges */
        }

        .nav-buttons { 
            display: none; /* Hide arrows, mobile users intuitively swipe */
        }
        
        .indicators {
            width: 100%;
            justify-content: center;
        }
        
        .indicator-bar {
            /* Flex shrinking ensures bars squish down instead of overflowing if there are lots of games */
            flex: 1;
            max-width: 30px; 
            height: 4px; /* Thinner bars look more elegant on mobile */
        }
    }
</style>