<script>
    import { calculatePlayabilityScore } from "$lib/playability";
    import Icon from "@iconify/svelte";

    /**
     * @typedef {Object} Props
     * @property {Object} profile
     * @property {boolean} [large]
     */

    /** @type {Props} */
    let { profile, large = false } = $props();

    let score = $derived(calculatePlayabilityScore(profile));

    const icons = {
        Perfect: "mdi:star-circle",
        Great: "mdi:check-circle",
        Playable: "mdi:check",
        Rough: "mdi:alert-circle",
        Unknown: "mdi:help-circle",
    };
</script>

<div
    class="badge {score.score.toLowerCase()}"
    class:large
    title={score.description}
>
    <Icon
        icon={icons[score.score]}
        width={large ? 20 : 14}
        height={large ? 20 : 14}
    />
    <span>{score.label}</span>
</div>

<style>
    .badge {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.5rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        background-color: var(--surface-color-2, #2a2a2a);
        border: 1px solid transparent;
        color: var(--text-secondary);
    }

    .badge.large {
        padding: 0.35rem 0.75rem;
        font-size: 0.85rem;
    }

    /* Score Colors (using logical properties if needed, but hardcoded vars for now based on impl plan) */
    .badge.perfect {
        color: var(--green-400, #4ade80);
        background-color: color-mix(
            in srgb,
            var(--green-400, #4ade80) 10%,
            transparent
        );
        border-color: color-mix(
            in srgb,
            var(--green-400, #4ade80) 20%,
            transparent
        );
    }

    .badge.great {
        color: var(--blue-400, #60a5fa);
        background-color: color-mix(
            in srgb,
            var(--blue-400, #60a5fa) 10%,
            transparent
        );
        border-color: color-mix(
            in srgb,
            var(--blue-400, #60a5fa) 20%,
            transparent
        );
    }

    .badge.playable {
        color: var(--yellow-400, #facc15);
        background-color: color-mix(
            in srgb,
            var(--yellow-400, #facc15) 10%,
            transparent
        );
        border-color: color-mix(
            in srgb,
            var(--yellow-400, #facc15) 20%,
            transparent
        );
    }

    .badge.rough {
        color: var(--red-400, #f87171);
        background-color: color-mix(
            in srgb,
            var(--red-400, #f87171) 10%,
            transparent
        );
        border-color: color-mix(
            in srgb,
            var(--red-400, #f87171) 20%,
            transparent
        );
    }
</style>
