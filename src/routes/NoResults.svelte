<script>
    import Icon from '@iconify/svelte'
    import { fade, fly } from 'svelte/transition'

    let { onClear } = $props()
</script>

<div class="no-results" in:fade={{ duration: 300, delay: 100 }}>
    <div class="icon-container" in:fly={{ y: 20, duration: 500 }}>
        <div class="icon-pulse"></div>
        <Icon icon="mdi:magnify-close" width="64" height="64" />
    </div>

    <h2 in:fly={{ y: 10, duration: 400, delay: 200 }}>No results found</h2>
    <p in:fly={{ y: 10, duration: 400, delay: 300 }}>
        We couldn't find any games matching your current filters.
    </p>

    <div class="actions" in:fly={{ y: 10, duration: 400, delay: 400 }}>
        <button class="clear-btn" onclick={onClear}>
            <Icon icon="mdi:refresh" width="18" height="18" />
            Clear all filters
        </button>
    </div>
</div>

<style>
    .no-results {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 64px 24px;
        text-align: center;
        color: var(--text-muted);
        max-width: 400px;
        margin: 0 auto;
    }

    .icon-container {
        position: relative;
        margin-bottom: 24px;
        color: var(--accent-primary);
        opacity: 0.8;
    }

    .icon-pulse {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
        height: 100%;
        background: var(--accent-primary);
        border-radius: 50%;
        opacity: 0.1;
        animation: pulse 2s infinite ease-in-out;
        z-index: -1;
    }

    @keyframes pulse {
        0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0.15;
        }
        50% {
            transform: translate(-50%, -50%) scale(1.3);
            opacity: 0;
        }
        100% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0.15;
        }
    }

    h2 {
        color: var(--text-main);
        font-size: 1.5rem;
        margin-bottom: 8px;
        font-weight: 600;
    }

    p {
        margin-bottom: 32px;
        line-height: 1.5;
    }

    .clear-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        color: var(--text-main);
        border-radius: 8px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .clear-btn:hover {
        background: var(--bg-tertiary);
        border-color: var(--accent-primary);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .clear-btn:active {
        transform: translateY(0);
    }
</style>
