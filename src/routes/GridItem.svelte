<script>
    import Icon from "@iconify/svelte";
    import { slide } from "svelte/transition";

    let { titleData } = $props();

    const {
        id,
        iconUrl,
        names = [],
        publisher = "N/A",
        performance = {}
    } = titleData;

    const {
        docked = {},
        handheld = {}
    } = performance;
</script>

<a href={`/title/${id}`} class="game-card" transition:slide|local data-sveltekit-preload-data="hover" aria-label={`View details for ${names[0] || 'Unknown Title'}`} >
    <img class="card-icon" src={iconUrl} loading="lazy" alt={`${names[0]}'s game icon'`}/>

    <div class="card-info">
        <p class="card-title">{names[0] || "Unknown Title"}</p>
        <p class="card-publisher">{publisher}</p>
    </div>

    {#if docked.target_fps || handheld.target_fps}
        <div class="card-perf-badge">
            {#if docked.target_fps}
            <span>
                <Icon icon="mdi:television" />
                {docked.target_fps}
            </span>
            {/if}
            {#if handheld.target_fps}
            <span>
                <Icon icon="mdi:nintendo-switch" />
                {handheld.target_fps}
            </span>
            {/if}
        </div>
    {/if}
</a>

<style>
.game-card {
    position: relative;
    display: flex;
    flex-direction: column;
    background-color: var(--surface-color);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    text-decoration: none;
    color: inherit;
}

.game-card:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-lg);
}

.card-icon {
    width: 100%;
    aspect-ratio: 1 / 1;
    background-size: cover;
    background-position: center;
    background-color: var(--input-bg);
    border-bottom: 1px solid var(--border-color);
}

.card-info {
    flex-grow: 1;
    padding: 0.75rem;
}

.card-title {
    margin: 0 0 0.25rem;
    font-weight: 700;
    font-size: 1rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text-primary);
}

.card-publisher {
    margin: 0;
    font-size: 0.75rem;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.card-perf-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 4px 8px;
    font-size: 0.75rem;
    font-weight: 500;
    background-color: rgba(20, 20, 20, 0.7);
    color: white;
    border-radius: 999px;
    backdrop-filter: blur(4px);
    transition: opacity 0.3s ease, transform 0.3s ease;
}

.card-perf-badge span {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
}
</style>
