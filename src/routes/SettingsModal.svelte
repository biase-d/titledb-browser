<script>
    import { fade, scale } from 'svelte/transition';
    import Icon from '@iconify/svelte';
    import { preferences, COUNTRY_GROUPS } from '$lib/stores/preferences';

    let { show = $bindable() } = $props();

    let currentRegion = $state('US');

    preferences.subscribe(p => currentRegion = p.region);

    function handleChange(event) {
        const newRegion = event.target.value;
        preferences.setRegion(newRegion);
        setTimeout(() => {
            show = false;
        }, 300);
    }
</script>

{#if show}
    <div class="modal-overlay" onclick={() => show = false} transition:fade={{ duration: 150 }}>
        <div 
            class="modal-content" 
            onclick={(e) => e.stopPropagation()}
            transition:scale={{ duration: 200, start: 0.95 }}
        >
            <div class="modal-header">
                <h2>Settings</h2>
                <button class="close-btn" onclick={() => show = false}><Icon icon="mdi:close" /></button>
            </div>
            
            <div class="modal-body">
                <section>
                    <div class="section-title-row">
                        <Icon icon="mdi:earth" class="section-icon" />
                        <h3>Preferred Country</h3>
                    </div>
                    <p class="description">
                        Select your eShop country. We will prioritize showing the specific version of a game (Title ID, Name, and Icon) released in this country.
                    </p>
                    
                    <div class="select-wrapper">
                        <select value={currentRegion} onchange={handleChange}>
                            {#each COUNTRY_GROUPS as group}
                                <optgroup label={group.label}>
                                    {#each group.options as country}
                                        <option value={country.id}>
                                            {country.flag} {country.label}
                                        </option>
                                    {/each}
                                </optgroup>
                            {/each}
                        </select>
                        <Icon icon="mdi:chevron-down" class="select-arrow" />
                    </div>
                </section>
            </div>
        </div>
    </div>
{/if}

<style>
    .modal-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        z-index: 100;
    }

    .modal-content {
        background-color: var(--surface-color);
        width: 90%;
        max-width: 450px;
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        display: flex;
        flex-direction: column;
        max-height: 90vh;
        border: 1px solid var(--border-color);
    }

    .modal-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--border-color);
    }

    .modal-header h2 { margin: 0; font-size: 1.25rem; }
    .close-btn { background: none; border: none; cursor: pointer; padding: 0.5rem; color: var(--text-secondary); }

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

    h3 { margin: 0; font-size: 1.1rem; font-weight: 600; color: var(--text-primary); }
    .description { margin: 0 0 1.5rem; font-size: 0.95rem; color: var(--text-secondary); line-height: 1.5; }

    .select-wrapper {
        position: relative;
        width: 100%;
    }

    select {
        width: 100%;
        appearance: none;
        background-color: var(--input-bg);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        padding: 12px 16px;
        font-size: 1rem;
        color: var(--text-primary);
        cursor: pointer;
        transition: border-color 0.2s, box-shadow 0.2s;
    }

    select:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 20%, transparent);
    }

    .select-arrow {
        position: absolute;
        right: 16px;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        color: var(--text-secondary);
    }
</style>