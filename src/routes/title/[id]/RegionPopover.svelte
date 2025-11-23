<script>
    import Icon from '@iconify/svelte';
    import { fade, scale } from 'svelte/transition';
    import { getFlagEmoji, getCountryName } from '$lib/flags';
    import { getRegionLabel } from '$lib/regions';

    let { regions = [] } = $props();

    let isOpen = $state(false);
    let label = $derived(getRegionLabel(regions) || 'Unknown Region');
    
    let sortedRegions = $derived([...regions].sort((a, b) => {
        const priority = ['US', 'JP', 'GB', 'EU'];
        const idxA = priority.indexOf(a);
        const idxB = priority.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
    }));

    function toggle(e) {
        e.stopPropagation();
        isOpen = !isOpen;
    }

    function close() {
        isOpen = false;
    }
</script>

<svelte:window onclick={close} />

<div class="region-container">
    <button 
        class="region-trigger" 
        onclick={toggle} 
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="View available countries"
    >
        <Icon icon="mdi:earth" />
        <span class="label">{label}</span>
        <Icon icon="mdi:chevron-down" class="chevron {isOpen ? 'open' : ''}" />
    </button>

    {#if isOpen}
        <div 
            class="popover" 
            transition:scale={{ duration: 150, start: 0.95 }}
            onclick={(e) => e.stopPropagation()}
        >
            <div class="popover-header">Available In</div>
            <div class="flags-grid">
                {#each sortedRegions as code}
                    <div class="flag-item" title="{getCountryName(code)}">
                        <span class="emoji">{getFlagEmoji(code)}</span>
                        <span class="code">{code}</span>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>

<style>
    .region-container {
        position: relative;
        display: inline-block;
        z-index: 50;
    }

    .region-trigger {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;
    }

    .region-trigger:hover {
        background: rgba(255, 255, 255, 0.2);
    }

    .chevron {
        font-size: 1rem;
        opacity: 0.7;
        transition: transform 0.2s;
    }
    .chevron.open {
        transform: rotate(180deg);
    }

    .popover {
        position: absolute;
        top: 100%;
        left: 0;
        margin-top: 0.5rem;
        background-color: var(--surface-color);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        padding: 1rem;
        z-index: 50;
        min-width: 280px;
        max-width: 320px;
    }

    .popover-header {
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-secondary);
        margin-bottom: 0.75rem;
        font-weight: 600;
    }

    .flags-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
        gap: 0.5rem;
    }

    .flag-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 0.5rem;
        background-color: var(--input-bg);
        border-radius: var(--radius-sm);
        border: 1px solid transparent;
        transition: border-color 0.2s;
    }

    .flag-item:hover {
        border-color: var(--primary-color);
    }

    .emoji {
        font-size: 1.5rem;
        line-height: 1;
        margin-bottom: 0.25rem;
    }

    .code {
        font-size: 0.75rem;
        color: var(--text-primary);
        font-weight: 500;
    }
</style>