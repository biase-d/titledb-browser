<script>
    import { fade, fly, scale } from 'svelte/transition'
    import Icon from '@iconify/svelte'
    import { preferences, COUNTRY_GROUPS } from '$lib/stores/preferences'
    import CountryFlag from '$lib/components/CountryFlag.svelte'
    import { onMount } from 'svelte'
    import { isBot } from '$lib/utils/bot'

    /**
     * A new visitor is no longer stopped by a modal over the page. A small card
     * asks once the page has been looked at (after the first scroll, or a pause
     * if they just read), and the full setup only opens if they ask for it.
     * Crawlers get neither: they judge the page, not the prompt
     */
    let prompt = $state(false)
    /** The visitor's own country, when their browser language names one we list */
    let detectedRegion = $state(/** @type {{ id: string, label: string } | null} */ (null))
    let show = $state(false)
    let step = $state(1)
    let selectedRegion = $state('US')
    let selectedColor = $state('#3b82f6')

    const palette = [
        { name: 'Blue', hex: '#3b82f6' },
        { name: 'Indigo', hex: '#6366f1' },
        { name: 'Purple', hex: '#8b5cf6' },
        { name: 'Pink', hex: '#ec4899' },
        { name: 'Red', hex: '#ef4444' },
        { name: 'Orange', hex: '#f97316' },
        { name: 'Green', hex: '#10b981' },
        { name: 'Teal', hex: '#14b8a6' },
    ]

    onMount(() => {
        if (isBot()) {
            return
        }

        const hasOnboarded = localStorage.getItem('has_onboarded')
        if (hasOnboarded) return

        const current = localStorage.getItem('preferred_region')
        if (current) selectedRegion = current

        const country = (navigator.language || '').split('-')[1]?.toUpperCase()
        detectedRegion = COUNTRY_GROUPS.flatMap(g => g.options).find(o => o.id === country) ?? null
        if (detectedRegion && !current) selectedRegion = detectedRegion.id

        const reveal = () => {
            prompt = true
            cleanup()
        }
        const onScroll = () => { if (window.scrollY > 240) reveal() }
        const timer = setTimeout(reveal, 12000)
        const cleanup = () => {
            clearTimeout(timer)
            window.removeEventListener('scroll', onScroll)
        }
        window.addEventListener('scroll', onScroll, { passive: true })
        return cleanup
    })

    function openSetup () {
        prompt = false
        show = true
    }

    /** One tap: their country, default colour, and no more asking */
    function useDetected () {
        if (detectedRegion) preferences.setRegion(detectedRegion.id)
        dismiss()
    }

    function dismiss () {
        localStorage.setItem('has_onboarded', 'true')
        prompt = false
    }

    function nextStep () {
        if (step < 3) {
            step++
        } else {
            finish()
        }
    }

    function finish () {
        // Save the region preference
        preferences.setRegion(selectedRegion)
        preferences.setFavoriteColor(selectedColor)

        // Mark onboarding as complete
        localStorage.setItem('has_onboarded', 'true')
        show = false
    }
</script>

{#if prompt}
    <aside class="welcome-card" transition:fly={{ y: 24, duration: 250 }} aria-label="Welcome">
        <button class="welcome-close" onclick={dismiss} aria-label="Dismiss">
            <Icon icon="mdi:close" />
        </button>
        <p class="welcome-title">Welcome to Switch Performance</p>
        <p class="welcome-text">
            Pick your eShop country and we'll show game names and artwork from
            that region.
        </p>
        <div class="welcome-actions">
            {#if detectedRegion}
                <button class="welcome-primary" onclick={useDetected}>
                    <CountryFlag code={detectedRegion.id} size={18} />
                    Use {detectedRegion.label}
                </button>
                <button class="welcome-secondary" onclick={openSetup}>Choose another</button>
            {:else}
                <button class="welcome-primary" onclick={openSetup}>Choose region</button>
                <button class="welcome-secondary" onclick={dismiss}>Not now</button>
            {/if}
        </div>
    </aside>
{/if}

{#if show}
    <div class="modal-overlay" transition:fade={{ duration: 300 }}>
        <div
            class="modal-content"
            transition:scale={{ duration: 300, start: 0.95 }}
        >
            {#if step === 1}
                <div class="step-container" in:fade={{ duration: 200 }}>
                    <div class="icon-header">
                        <Icon icon="mdi:earth" width="48" height="48" />
                    </div>
                    <h2>Welcome to Switch Performance</h2>
                    <p class="subtitle">
                        To give you the best experience, please select your
                        preferred eShop country. We will prioritize game
                        versions, names, and icons from this region
                    </p>

                    <div class="grid-wrapper">
                        <div class="country-grid">
                            {#each COUNTRY_GROUPS as group}
                                <div class="group-label">{group.label}</div>
                                <div class="options-row">
                                    {#each group.options as country}
                                        <button
                                            class="country-btn"
                                            class:selected={selectedRegion ===
                                                country.id}
                                            onclick={() =>
                                                (selectedRegion = country.id)}
                                            title={country.label}
                                        >
                                            <CountryFlag
                                                code={country.id}
                                                size={24}
                                            />
                                            <span class="code"
                                                >{country.id}</span
                                            >
                                        </button>
                                    {/each}
                                </div>
                            {/each}
                        </div>
                    </div>

                    <button class="primary-btn" onclick={nextStep}>
                        Continue <Icon icon="mdi:arrow-right" />
                    </button>
                </div>
            {:else if step === 2}
                <div class="step-container" in:fade={{ duration: 200 }}>
                    <div
                        class="icon-header"
                        style="color: {selectedColor}; background: color-mix(in srgb, {selectedColor} 10%, transparent)"
                    >
                        <Icon icon="mdi:palette" width="48" height="48" />
                    </div>
                    <h2>Choose Your Identity</h2>
                    <p class="subtitle">
                        Select a favorite color to personalize your experience.
                        This will be used as the primary accent across the site.
                    </p>

                    <div class="palette-grid">
                        {#each palette as color}
                            <button
                                class="color-btn"
                                class:selected={selectedColor === color.hex}
                                style="--btn-color: {color.hex}"
                                onclick={() => (selectedColor = color.hex)}
                                title={color.name}
                            >
                                <div class="color-preview"></div>
                                <span class="color-name">{color.name}</span>
                            </button>
                        {/each}
                    </div>

                    <button
                        class="primary-btn"
                        onclick={nextStep}
                        style="background-color: {selectedColor}"
                    >
                        Continue <Icon icon="mdi:arrow-right" />
                    </button>
                </div>
            {:else}
                <div class="step-container" in:fade={{ duration: 200 }}>
                    <div class="icon-header">
                        <Icon icon="mdi:rocket-launch" width="48" height="48" />
                    </div>
                    <h2>Quick Guide</h2>

                    <div class="features-list">
                        <div class="feature">
                            <div class="feature-icon">
                                <Icon icon="mdi:tag-text-outline" />
                            </div>
                            <div class="feature-text">
                                <strong>Smart Localization</strong>
                                <p>
                                    Game titles and IDs will automatically match
                                    your selected region
                                </p>
                            </div>
                        </div>
                        <div class="feature">
                            <div class="feature-icon">
                                <Icon icon="mdi:speedometer" />
                            </div>
                            <div class="feature-text">
                                <strong>Performance Data</strong>
                                <p>
                                    Check Docked and Handheld FPS targets,
                                    resolution, and stability ratings
                                </p>
                            </div>
                        </div>
                        <div class="feature">
                            <div class="feature-icon">
                                <Icon icon="mdi:github" />
                            </div>
                            <div class="feature-text">
                                <strong>Community Driven</strong>
                                <p>
                                    Sign in with GitHub to submit new data or
                                    suggest edits to existing games
                                </p>
                            </div>
                        </div>
                    </div>

                    <button class="primary-btn" onclick={finish}>
                        Get Started
                    </button>
                </div>
            {/if}

            <div class="stepper">
                <div class="dot" class:active={step === 1}></div>
                <div class="dot" class:active={step === 2}></div>
                <div class="dot" class:active={step === 3}></div>
            </div>
        </div>
    </div>
{/if}

<style>
    .welcome-card {
        position: fixed;
        z-index: 150;
        right: 1rem;
        bottom: 1rem;
        width: min(22rem, calc(100vw - 2rem));
        padding: 1rem 1.125rem;
        background: var(--surface-color);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
    }

    .welcome-title {
        margin: 0 1.5rem 0.25rem 0;
        font-weight: 700;
        color: var(--text-primary);
    }

    .welcome-text {
        margin: 0 0 0.875rem;
        font-size: 0.875rem;
        line-height: 1.45;
        color: var(--text-secondary);
    }

    .welcome-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .welcome-primary,
    .welcome-secondary {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.875rem;
        border-radius: 10px;
        font: inherit;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
    }

    .welcome-primary {
        background: var(--primary-color);
        border: 1px solid var(--primary-color);
        color: var(--primary-action-text, #fff);
    }

    .welcome-secondary {
        background: transparent;
        border: 1px solid var(--border-color);
        color: var(--text-primary);
    }

    .welcome-close {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        display: grid;
        place-items: center;
        width: 1.75rem;
        height: 1.75rem;
        background: none;
        border: 0;
        border-radius: 8px;
        color: var(--text-secondary);
        cursor: pointer;
    }

    .welcome-close:hover { color: var(--text-primary); background: var(--input-bg); }

    @media (max-width: 560px) {
        .welcome-card { left: 1rem; right: 1rem; width: auto; }
    }

    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 200; /* Higher than standard modals */
    }

    .modal-content {
        background-color: var(--surface-color);
        width: 90%;
        max-width: 450px;
        border-radius: var(--radius-lg);
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
        border: 1px solid var(--border-color);
        overflow: hidden;
        max-height: 90vh;
    }

    .step-container {
        padding: 2rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        overflow-y: auto;
    }

    .icon-header {
        color: var(--primary-color);
        margin-bottom: 1rem;
        background: color-mix(in srgb, var(--primary-color) 10%, transparent);
        padding: 1rem;
        border-radius: 50%;
    }

    h2 {
        margin: 0 0 0.5rem;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-primary);
    }

    .subtitle {
        margin: 0 0 1.5rem;
        color: var(--text-secondary);
        line-height: 1.5;
        font-size: 0.95rem;
    }

    .grid-wrapper {
        width: 100%;
        margin-bottom: 2rem;
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        padding: 1rem;
        background-color: var(--input-bg);
        max-height: 300px;
        overflow-y: auto;
    }

    .country-grid {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .group-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 0.25rem;
        text-align: left;
    }

    .options-row {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
        gap: 0.5rem;
    }

    .country-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.25rem;
        padding: 0.5rem;
        background-color: var(--surface-color);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: all 0.2s;
    }

    .country-btn:hover {
        border-color: var(--primary-color);
        background-color: color-mix(
            in srgb,
            var(--primary-color) 5%,
            transparent
        );
    }

    .country-btn.selected {
        border-color: var(--primary-color);
        background-color: color-mix(
            in srgb,
            var(--primary-color) 15%,
            transparent
        );
        box-shadow: 0 0 0 1px var(--primary-color);
    }

    .code {
        font-size: 0.7rem;
        font-weight: 600;
        color: var(--text-primary);
    }

    /* Palette Grid */
    .palette-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
        gap: 0.75rem;
        width: 100%;
        margin-bottom: 2rem;
    }

    .color-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem;
        background-color: var(--input-bg);
        border: 2px solid transparent;
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .color-btn:hover {
        background-color: color-mix(
            in srgb,
            var(--btn-color) 10%,
            var(--input-bg)
        );
        transform: translateY(-2px);
    }

    .color-btn.selected {
        border-color: var(--btn-color);
        background-color: color-mix(
            in srgb,
            var(--btn-color) 15%,
            var(--input-bg)
        );
        box-shadow: 0 4px 12px
            color-mix(in srgb, var(--btn-color) 20%, transparent);
    }

    .color-preview {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: var(--btn-color);
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
    }

    .color-name {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--text-primary);
    }

    .primary-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background-color: var(--primary-color);
        color: var(--primary-action-text);
        border: none;
        padding: 12px 32px;
        border-radius: 999px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition:
            transform 0.2s,
            box-shadow 0.2s;
    }

    .primary-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    /* Features List */
    .features-list {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        margin-bottom: 2rem;
        text-align: left;
        width: 100%;
    }

    .feature {
        display: flex;
        gap: 1rem;
    }

    .feature-icon {
        flex-shrink: 0;
        width: 40px;
        height: 40px;
        background-color: var(--input-bg);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--primary-color);
        font-size: 1.2rem;
    }

    .feature-text strong {
        display: block;
        margin-bottom: 0.25rem;
        color: var(--text-primary);
    }

    .feature-text p {
        margin: 0;
        font-size: 0.9rem;
        color: var(--text-secondary);
        line-height: 1.4;
    }

    /* Stepper Dots */
    .stepper {
        display: flex;
        justify-content: center;
        gap: 0.5rem;
        padding-bottom: 1.5rem;
    }

    .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: var(--border-color);
        transition: background-color 0.3s;
    }

    .dot.active {
        background-color: var(--primary-color);
    }
</style>
