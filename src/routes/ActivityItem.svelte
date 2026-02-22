<script>
    import Icon from '@iconify/svelte'
    import { slide } from 'svelte/transition'
    import { preferences } from '$lib/stores/preferences'
    import { getLocalizedName } from '$lib/i18n'

    let { titleData } = $props()

    let id = $derived(titleData.id)
    let names = $derived(titleData.names || [])
    let iconUrl = $derived(titleData.iconUrl)
    let lastUpdated = $derived(titleData.lastUpdated)
    let performance = $derived(titleData.performance || {})

    let preferredRegion = $state('US')
    preferences.subscribe((p) => (preferredRegion = p.region))

    let titleName = $derived(getLocalizedName(names, preferredRegion))

    function timeAgo (date) {
        if (!date) return 'Long ago'
        const seconds = Math.floor((new Date() - new Date(date)) / 1000)
        let interval = seconds / 31536000
        if (interval > 1) return Math.floor(interval) + 'y ago'
        interval = seconds / 2592000
        if (interval > 1) return Math.floor(interval) + 'mo ago'
        interval = seconds / 86400
        if (interval > 1) return Math.floor(interval) + 'd ago'
        interval = seconds / 3600
        if (interval > 1) return Math.floor(interval) + 'h ago'
        interval = seconds / 60
        if (interval > 1) return Math.floor(interval) + 'm ago'
        return Math.floor(seconds) + 's ago'
    }

    let hasPerf = $derived(
        performance.docked?.target_fps || performance.handheld?.target_fps,
    )
</script>

<a
    href={`/title/${id}`}
    class="activity-item"
    transition:slide|local
    data-sveltekit-preload-data="tap"
>
    <div class="activity-accent"></div>
    <div class="activity-icon-wrapper">
        <img src={iconUrl} alt="" loading="lazy" width="40" height="40" />
    </div>
    <div class="activity-body">
        <div class="activity-header">
            <span class="activity-type">
                <Icon
                    icon={hasPerf ? 'mdi:lightning-bolt' : 'mdi:plus-circle'}
                />
                {hasPerf ? 'Updated Performance' : 'New Title Added'}
            </span>
            <span class="activity-time">{timeAgo(lastUpdated)}</span>
        </div>
        <h4 class="activity-title">{titleName}</h4>
        <div class="activity-meta">
            <span class="game-id">{id}</span>
        </div>
    </div>
</a>

<style>
    .activity-item {
        display: flex;
        align-items: center;
        padding: 1rem 1.25rem;
        gap: 1.25rem;
        background-color: var(--surface-color);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
        text-decoration: none;
        color: inherit;
        position: relative;
        overflow: hidden;
        transition: all 0.2s ease;
    }

    .activity-item:hover {
        border-color: var(--primary-color);
        transform: translateX(4px);
        background-color: color-mix(
            in srgb,
            var(--primary-color) 2%,
            var(--surface-color)
        );
    }

    .activity-accent {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 4px;
        background-color: var(--primary-color);
        opacity: 0.8;
    }

    .activity-icon-wrapper {
        width: 40px;
        height: 40px;
        flex-shrink: 0;
    }

    .activity-icon-wrapper img {
        width: 100%;
        height: 100%;
        border-radius: 8px;
        object-fit: cover;
        border: 1px solid var(--border-color);
    }

    .activity-body {
        flex-grow: 1;
        min-width: 0;
    }

    .activity-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.25rem;
    }

    .activity-type {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--primary-color);
        letter-spacing: 0.05em;
    }

    .activity-time {
        font-size: 0.75rem;
        color: var(--text-secondary);
        opacity: 0.7;
    }

    .activity-title {
        margin: 0 0 0.15rem;
        font-size: 1rem;
        font-weight: 700;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .activity-meta {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .game-id {
        font-family: var(--font-mono);
        font-size: 0.65rem;
        color: var(--text-secondary);
        opacity: 0.6;
    }
</style>
