<script>
    import { fade, scale } from "svelte/transition";
    import Icon from "@iconify/svelte";
    import { preferences, COUNTRY_GROUPS } from "$lib/stores/preferences";
    import { getFlagIcon } from "$lib/flags";

    let { show = $bindable() } = $props();

    let currentRegion = $state("US");

    preferences.subscribe((p) => (currentRegion = p.region));

    /**
     * @param {any} event
     */
    function handleChange(event) {
        const newRegion = event.target.value;
        preferences.setRegion(newRegion);
        setTimeout(() => {
            show = false;
        }, 300);
    }
</script>

{#if show}
    <div
        class="modal-overlay"
        onclick={() => (show = false)}
        transition:fade={{ duration: 150 }}
    >
        <div
            class="modal-content"
            onclick={(e) => e.stopPropagation()}
            transition:scale={{ duration: 200, start: 0.95 }}
        >
            <div class="modal-header">
                <h2>Settings</h2>
                <button class="close-btn" onclick={() => (show = false)}
                    ><Icon icon="mdi:close" /></button
                >
            </div>

            <div class="modal-body">
                <section>
                    <div class="section-title-row">
                        <Icon icon="mdi:earth" class="section-icon" />
                        <h3>Preferred Country</h3>
                    </div>
                    <p class="description">
                        Select your eShop country. We will prioritize showing
                        the specific version of a game (Title ID, Name, and
                        Icon) released in this country
                    </p>

                    <div class="select-wrapper">
                        <div class="country-grid">
                            {#each COUNTRY_GROUPS as group}
                                <div class="group-label">{group.label}</div>
                                <div class="options-row">
                                    {#each group.options as country}
                                        <button
                                            class="country-btn"
                                            class:selected={currentRegion ===
                                                country.id}
                                            onclick={() => {
                                                preferences.setRegion(
                                                    country.id,
                                                );
                                                setTimeout(
                                                    () => (show = false),
                                                    200,
                                                );
                                            }}
                                            title={country.label}
                                        >
                                            <Icon
                                                icon={getFlagIcon(country.id)}
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
                </section>

                <div class="drawer-divider"></div>

                <section>
                    <div class="section-title-row">
                        <Icon icon="mdi:palette-outline" class="section-icon" />
                        <h3>Appearance</h3>
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
                                        );
                                    preferences.setAdaptiveTheme(
                                        target.checked,
                                    );
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
        z-index: 100;
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
        margin: 0 0 1.5rem;
        font-size: 0.95rem;
        color: var(--text-secondary);
        line-height: 1.5;
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
