<script>
    import { browser } from "$app/environment";
    import { onMount, onDestroy } from "svelte";
    import { fade, fly } from "svelte/transition";
    import Icon from "@iconify/svelte";
    import { createImageSet } from "$lib/image";
    import { getLocalizedName } from "$lib/i18n";

    let { recentUpdates = [], preferredRegion = "US" } = $props();

    // --- Hero Carousel Logic ---
    let heroIndex = $state(0);
    let carouselTimer;
    let isPaused = $state(false);

    // Derived hero data based on current index
    let featuredGame = $derived(
        recentUpdates.length > 0 ? recentUpdates[heroIndex] : null,
    );
    let heroBanner = $derived(
        featuredGame ? createImageSet(featuredGame.bannerUrl) : null,
    );
    let featuredName = $derived(
        featuredGame
            ? getLocalizedName(featuredGame.names, preferredRegion)
            : "",
    );

    // --- Swipe Logic ---
    let touchStartX = 0;
    let touchEndX = 0;

    function handleTouchStart(e) {
        touchStartX = e.changedTouches[0].screenX;
    }

    function handleTouchEnd(e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }

    function handleSwipe() {
        const threshold = 50;
        if (touchEndX < touchStartX - threshold) {
            nextHero();
        }
        if (touchEndX > touchStartX + threshold) {
            prevHero();
        }
    }

    // --- Smart Dots Logic ---
    let visibleDots = $derived(
        (() => {
            const total = recentUpdates.length;
            if (total <= 5) return recentUpdates.map((_, i) => i);

            let start = heroIndex - 2;
            if (start < 0) start = 0;
            if (start > total - 5) start = total - 5;

            return Array.from({ length: 5 }, (_, i) => start + i);
        })(),
    );

    function startCarousel() {
        if (!browser) return;
        clearInterval(carouselTimer);
        carouselTimer = setInterval(() => {
            if (!isPaused && recentUpdates.length > 0) {
                nextHero();
            }
        }, 6000);
    }

    function nextHero() {
        heroIndex = (heroIndex + 1) % recentUpdates.length;
    }

    function prevHero() {
        heroIndex =
            (heroIndex - 1 + recentUpdates.length) % recentUpdates.length;
    }

    function setHero(index) {
        heroIndex = index;
        startCarousel();
    }

    function formatHeroPerf(modeData) {
        if (!modeData) return "No Data";

        const resType = modeData.resolution_type || "Unknown";
        let resText = resType;

        if (resType === "Fixed" && modeData.resolution)
            resText = modeData.resolution;
        else if (resType === "Dynamic") resText = "Dynamic";
        else if (resType === "Multiple Fixed") resText = "Multiple";

        const fps = modeData.target_fps
            ? `${modeData.target_fps} FPS`
            : modeData.fps_behavior || "Unknown";
        return `${resText} • ${fps}`;
    }

    onMount(() => {
        if (recentUpdates.length > 0) startCarousel();
    });

    onDestroy(() => {
        if (browser) clearInterval(carouselTimer);
    });
</script>

{#if featuredGame}
    <section
        class="hero-section"
        onmouseenter={() => (isPaused = true)}
        onmouseleave={() => (isPaused = false)}
        ontouchstart={handleTouchStart}
        ontouchend={handleTouchEnd}
        aria-label="Featured recently updated games"
        in:fade
    >
        <!-- Background Image -->
        {#key heroIndex}
            {#if heroBanner}
                <div
                    class="hero-bg"
                    in:fade={{ duration: 600 }}
                    out:fade={{ duration: 600 }}
                >
                    <img
                        src={heroBanner.src}
                        srcset={heroBanner.srcset}
                        alt=""
                    />
                    <div class="hero-overlay"></div>
                </div>
            {/if}
        {/key}

        <!-- Content -->
        <div class="hero-content">
            {#key heroIndex}
                <div
                    class="hero-text-wrapper"
                    in:fly={{ y: 20, duration: 400, delay: 200 }}
                    out:fade={{ duration: 200 }}
                >
                    <div class="hero-badge">
                        <Icon icon="mdi:star-four-points" /> Recently Updated
                    </div>

                    <h1>{featuredName}</h1>

                    <div class="hero-stats">
                        <div class="stat-box">
                            <div class="stat-label">
                                <Icon icon="mdi:television" /> Docked
                            </div>
                            <div class="stat-value">
                                {formatHeroPerf(
                                    featuredGame.performance?.docked,
                                )}
                            </div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-label">
                                <Icon icon="mdi:nintendo-switch" /> Handheld
                            </div>
                            <div class="stat-value">
                                {formatHeroPerf(
                                    featuredGame.performance?.handheld,
                                )}
                            </div>
                        </div>
                    </div>

                    <a href="/title/{featuredGame.id}" class="hero-cta">
                        View Details <Icon icon="mdi:arrow-right" />
                    </a>
                </div>
            {/key}
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
                {#each visibleDots as i (i)}
                    <button
                        class="indicator-dot"
                        class:active={i === heroIndex}
                        class:small-dot={i !== heroIndex}
                        onclick={() => setHero(i)}
                        aria-label="Go to slide {i + 1}"
                    ></button>
                {/each}
            </div>

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
    /* --- Hero Section --- */
    .hero-section {
        position: relative;
        border-radius: var(--radius-lg);
        overflow: hidden;
        color: white;
        height: 460px;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        padding: 2.5rem;
        box-shadow: var(--shadow-lg);
        background-color: var(--surface-color);
    }

    @media (max-width: 640px) {
        .hero-section {
            height: 500px; /* Slightly taller on mobile for wrapped text */
            padding: 1.5rem;
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
            rgba(0, 0, 0, 0.9) 0%,
            rgba(0, 0, 0, 0.5) 60%,
            rgba(0, 0, 0, 0.3) 100%
        );
    }

    .hero-content {
        position: relative;
        z-index: 1;
        width: 100%;
        max-width: 800px;
        flex-grow: 1;
        display: grid;
        grid-template-areas: "stack";
        align-items: end; /* Align text to bottom */
    }

    .hero-text-wrapper {
        grid-area: stack;
        width: 100%;
    }

    .hero-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        background-color: var(--primary-color);
        color: var(--primary-action-text);
        padding: 6px 12px;
        border-radius: 99px;
        font-size: 0.85rem;
        font-weight: 600;
        margin-bottom: 1rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .hero-section h1 {
        font-size: 2.5rem;
        font-weight: 800;
        margin: 0 0 1.5rem;
        line-height: 1.1;
        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    @media (max-width: 640px) {
        .hero-section h1 {
            font-size: 2rem;
        }
    }

    @media (min-width: 768px) {
        .hero-section h1 {
            font-size: 3.5rem;
        }
    }

    .hero-stats {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        margin-bottom: 2rem;
    }

    .stat-box {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        padding: 0.75rem 1.25rem;
        border-radius: 12px;
        min-width: 140px;
    }

    .stat-label {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.8);
        margin-bottom: 0.25rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .stat-value {
        font-size: 1.1rem;
        font-weight: 700;
        color: white;
    }

    .hero-cta {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background-color: white;
        color: black;
        padding: 12px 24px;
        border-radius: 99px;
        font-weight: 700;
        text-decoration: none;
        transition:
            transform 0.2s,
            box-shadow 0.2s;
    }

    .hero-cta:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    /* --- Carousel Controls --- */
    .hero-controls {
        position: relative;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 2rem;
        padding-top: 1rem;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
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

    @media (max-width: 640px) {
        .control-btn {
            display: none;
        }
    }

    .indicators {
        display: flex;
        gap: 0.5rem;
        flex-wrap: nowrap;
        justify-content: center;
        max-width: 100%;
    }

    .indicator-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: rgba(255, 255, 255, 0.3);
        border: none;
        padding: 0;
        cursor: pointer;
        transition: all 0.3s;
    }

    .indicator-dot:hover {
        background-color: rgba(255, 255, 255, 0.6);
    }

    .indicator-dot.active {
        background-color: var(--primary-color);
        transform: scale(1.2);
        width: 24px; /* Elongate active dot */
        border-radius: 4px;
    }
</style>
