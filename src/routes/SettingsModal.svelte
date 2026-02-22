<script>
    import { fade, scale } from 'svelte/transition'
    import Icon from '@iconify/svelte'
    import { preferences, COUNTRY_GROUPS } from '$lib/stores/preferences'
    import { getFlagIcon } from '$lib/flags'
    import { uiStore } from '$lib/stores/ui.svelte'
    import { tick } from 'svelte'
    import { getCountryName } from '$lib/flags'

    let { show = $bindable() } = $props()

    let currentRegion = $state('US')
    let showCountryGrid = $state(false)

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

    preferences.subscribe((p) => (currentRegion = p.region))

    $effect(() => {
        if (show && uiStore.settingsSection) {
            tick().then(() => {
                const element = document.getElementById(
                    uiStore.settingsSection || '',
                )
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' })
                    // Clear after scroll so it doesn't trigger again unless requested
                    uiStore.settingsSection = undefined
                }
            })
        }
    })
</script>

{#if show}
    <div
        class="modal-overlay"
        onclick={() => (show = false)}
        onkeydown={(e) => e.key === 'Escape' && (show = false)}
        transition:fade={{ duration: 150 }}
        role="presentation"
    >
        <div
            class="modal-content"
            onclick={(e) => e.stopPropagation()}
            onkeydown={(e) => e.stopPropagation()}
            transition:scale={{ duration: 200, start: 0.95 }}
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            tabindex="-1"
        >
            <div class="modal-header">
                <h2>Settings</h2>
                <button class="close-btn" onclick={() => (show = false)}
                    ><Icon icon="mdi:close" /></button
                >
            </div>

            <div class="modal-body">
                <section id="region">
                    <div class="section-title-row">
                        <Icon icon="mdi:earth" class="section-icon" />
                        <h3>Preferred Country</h3>
                    </div>
                    <p class="description">
                        Select your eShop country. We will prioritize showing
                        the specific version of a game (Title ID, Name, and
                        Icon) released in this country
                    </p>

                    <div class="compact-select-wrapper">
                        <button
                            class="current-selection"
                            onclick={() => (showCountryGrid = !showCountryGrid)}
                        >
                            <div class="selection-info">
                                <Icon
                                    icon={getFlagIcon(currentRegion)}
                                    width="24"
                                    height="24"
                                />
                                <div class="text">
                                    <span class="label">Preferred Country</span>
                                    <span class="value"
                                        >{getCountryName(currentRegion)}</span
                                    >
                                </div>
                            </div>
                            <Icon
                                icon="mdi:chevron-down"
                                class="chevron"
                                style="transform: rotate({showCountryGrid
                                    ? '180deg'
                                    : '0deg'})"
                            />
                        </button>

                        {#if showCountryGrid}
                            <div
                                class="country-grid-popover"
                                transition:fade={{ duration: 150 }}
                            >
                                <div class="country-grid">
                                    {#each COUNTRY_GROUPS as group}
                                        <div class="group-label">
                                            {group.label}
                                        </div>
                                        <div class="options-row">
                                            {#each group.options as country}
                                                <button
                                                    class="country-btn"
                                                    class:selected={currentRegion ===
                                                        country.id}
                                                    onclick={() => {
                                                        preferences.setRegion(
                                                            country.id,
                                                        )
                                                        showCountryGrid = false
                                                    }}
                                                    title={country.label}
                                                >
                                                    <Icon
                                                        icon={getFlagIcon(
                                                            country.id,
                                                        )}
                                                        width="24"
                                                        height="24"
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
                        {/if}
                    </div>
                </section>

                <div class="drawer-divider"></div>

                <section>
                    <div class="section-title-row">
                        <Icon icon="mdi:palette-outline" class="section-icon" />
                        <h3>Appearance</h3>
                    </div>

                    <div class="setting-item">
                        <div class="setting-info">
                            <span class="setting-label">Identity Color</span>
                            <span class="setting-desc"
                                >Personalize your site-wide accent color</span
                            >
                        </div>
                        <div class="palette-mini">
                            {#each palette as color}
                                <button
                                    class="palette-btn"
                                    class:selected={$preferences.favoriteColor ===
                                        color.hex}
                                    style="--btn-color: {color.hex}"
                                    onclick={() =>
                                        preferences.setFavoriteColor(color.hex)}
                                    title={color.name}
                                >
                                    <div class="dot"></div>
                                </button>
                            {/each}
                        </div>
                    </div>

                    <div class="setting-item">
                        <div class="setting-info">
                            <span class="setting-label">Adaptive Theme</span>
                            <span class="setting-desc"
                                >Extract colors and background from game icons</span
                            >
                        </div>
                        <label class="switch">
                            <input
                                type="checkbox"
                                checked={$preferences.adaptiveTheme}
                                onchange={(e) => {
                                    const target =
                                        /** @type {HTMLInputElement} */ (
                                            e.target
                                        )
                                    preferences.setAdaptiveTheme(
                                        target.checked,
                                    )
                                }}
                            />
                            <span class="slider"></span>
                        </label>
                    </div>

                    <div class="setting-item">
                        <div class="setting-info">
                            <span class="setting-label"
                                >High Resolution Images</span
                            >
                            <span class="setting-desc warning"
                                >Loads full quality images. May impact
                                performance on slower connections.</span
                            >
                        </div>
                        <label class="switch">
                            <input
                                type="checkbox"
                                checked={$preferences.highResImages}
                                onchange={(e) => {
                                    const target =
                                        /** @type {HTMLInputElement} */ (
                                            e.target
                                        )
                                    preferences.setHighResImages(
                                        target.checked,
                                    )
                                }}
                            />
                            <span class="slider"></span>
                        </label>
                    </div>
                </section>

                <div class="drawer-divider"></div>

                <section>
                    <div class="section-title-row">
                        <Icon icon="mdi:flask-outline" class="section-icon" />
                        <h3>Beta Features</h3>
                    </div>

                    <div class="setting-item">
                        <div class="setting-info">
                            <span class="setting-label"
                                >Beta Contribution Flow</span
                            >
                            <span class="setting-desc"
                                >Enable the new multi-stage database + GitHub
                                contribution system</span
                            >
                        </div>
                        <label class="switch">
                            <input
                                type="checkbox"
                                checked={$preferences.betaFlow}
                                onchange={(e) => {
                                    const target =
                                        /** @type {HTMLInputElement} */ (
                                            e.target
                                        )
                                    preferences.setBetaFlow(target.checked)
                                }}
                            />
                            <span class="slider"></span>
                        </label>
                    </div>
                </section>
            </div>
        </div>
    </div>
{/if}

<style>
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
    }

    .modal-content {
        background-color: var(--surface-color);
        width: 90%;
        max-width: 500px;
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        display: flex;
        flex-direction: column;
        max-height: 90vh;
        border: 1px solid var(--border-color);
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--border-color);
    }

    .modal-header h2 {
        margin: 0;
        font-size: 1.25rem;
    }
    .close-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.5rem;
        color: var(--text-secondary);
    }

    .modal-body {
        padding: 1.5rem;
        overflow-y: auto;
    }

    .section-title-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        color: var(--primary-color);
    }

    h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--text-primary);
    }
    .description {
        margin: 0 0 1rem;
        font-size: 0.95rem;
        color: var(--text-secondary);
        line-height: 1.5;
    }

    /* Compact Country Selector */
    .compact-select-wrapper {
        position: relative;
    }

    .current-selection {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1rem;
        background-color: var(--input-bg);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: all 0.2s;
    }

    .current-selection:hover {
        border-color: var(--primary-color);
        background-color: color-mix(
            in srgb,
            var(--primary-color) 5%,
            var(--input-bg)
        );
    }

    .selection-info {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .selection-info .text {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        line-height: 1.2;
    }

    .selection-info .label {
        font-size: 0.7rem;
        font-weight: 600;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .selection-info .value {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary);
    }

    .chevron {
        color: var(--text-secondary);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .country-grid-popover {
        margin-top: 0.5rem;
        padding: 1rem;
        background-color: var(--surface-color);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
    }

    .country-grid {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .group-label {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 0.25rem;
    }

    .options-row {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
        gap: 0.5rem;
    }

    .country-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.25rem;
        padding: 0.5rem;
        background-color: var(--input-bg);
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

    .drawer-divider {
        height: 1px;
        background: var(--border-color);
        margin: 1.5rem 0;
        opacity: 0.5;
    }

    .setting-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.5rem 0;
    }

    .setting-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .setting-label {
        font-weight: 600;
        color: var(--text-primary);
        font-size: 1rem;
    }

    .setting-desc {
        font-size: 0.85rem;
        color: var(--text-secondary);
    }

    .setting-desc.warning {
        color: var(--warning-color, #f59e0b);
    }

    /* Palette Mini */
    .palette-mini {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        max-width: 180px;
        justify-content: flex-end;
    }

    .palette-btn {
        width: 24px;
        height: 24px;
        padding: 0;
        border-radius: 50%;
        border: 2px solid transparent;
        background: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }

    .palette-btn:hover {
        transform: scale(1.1);
    }

    .palette-btn.selected {
        border-color: var(--text-primary);
        background-color: color-mix(in srgb, var(--btn-color) 20%, transparent);
    }

    .palette-btn .dot {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background-color: var(--btn-color);
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
    }

    /* Switch styling */
    .switch {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
        flex-shrink: 0;
    }

    .switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }

    .slider {
        position: absolute;
        cursor: pointer;
        inset: 0;
        background-color: var(--input-bg);
        border: 1px solid var(--border-color);
        transition: 0.3s;
        border-radius: 24px;
    }

    .slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 2px;
        bottom: 2px;
        background-color: white;
        transition: 0.3s;
        border-radius: 50%;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    input:checked + .slider {
        background-color: var(--primary-color);
        border-color: var(--primary-color);
    }

    input:focus + .slider {
        box-shadow: 0 0 1px var(--primary-color);
    }

    input:checked + .slider:before {
        transform: translateX(20px);
    }

    .code {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--text-primary);
    }
</style>
