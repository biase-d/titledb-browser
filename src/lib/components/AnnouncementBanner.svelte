<script>
    import { onMount } from "svelte";
    import { slide } from "svelte/transition";
    import Icon from "@iconify/svelte";
    import { getVersionInfo } from "$lib/services/versionService";

    let activeAnnouncement = $state(null);
    let isVisible = $state(false);

    onMount(() => {
        const { announcements } = getVersionInfo();

        // Find latest active announcement
        const latest = announcements
            .filter((a) => a.active)
            .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

        if (latest) {
            const dismissed = localStorage.getItem(
                `dismissed_announcement_${latest.id}`,
            );
            if (!dismissed) {
                activeAnnouncement = latest;
                isVisible = true;
            }
        }
    });

    function dismiss() {
        if (!activeAnnouncement) return;
        localStorage.setItem(
            `dismissed_announcement_${activeAnnouncement.id}`,
            "true",
        );
        isVisible = false;
    }

    function getIcon(type) {
        switch (type) {
            case "warning":
                return "mdi:alert-circle";
            case "success":
                return "mdi:check-circle";
            case "feature":
                return "mdi:star-four-points";
            case "critical":
                return "mdi:alert-decagram";
            default:
                return "mdi:information";
        }
    }
</script>

{#if isVisible && activeAnnouncement}
    <div
        class="banner {activeAnnouncement.type}"
        transition:slide={{ duration: 300 }}
    >
        <div class="content">
            <Icon icon={getIcon(activeAnnouncement.type)} class="icon" />
            <span class="message">
                <strong>{activeAnnouncement.type.toUpperCase()}:</strong>
                {activeAnnouncement.message}
            </span>

            <div class="actions">
                {#if activeAnnouncement.link}
                    <a
                        href={activeAnnouncement.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="link"
                    >
                        Learn More <Icon icon="mdi:open-in-new" width="14" />
                    </a>
                {/if}
                <a href="/announcements" class="history-link">History</a>
            </div>
        </div>

        <button
            class="dismiss-btn"
            onclick={dismiss}
            aria-label="Dismiss announcement"
        >
            <Icon icon="mdi:close" />
        </button>
    </div>
{/if}

<style>
    .banner {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1.5rem;
        font-size: 0.9rem;
        color: white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        z-index: 100;
        gap: 1rem;
    }

    /* Type variants */
    .banner.warning {
        background-color: #f59e0b;
        color: #fff;
    }
    .banner.critical {
        background-color: #ef4444;
        color: #fff;
    }
    .banner.success {
        background-color: #10b981;
        color: #fff;
    }
    .banner.feature {
        background-color: var(--primary-color, #6366f1);
        color: var(--primary-action-text, #fff);
    }
    .banner.info {
        background-color: #3b82f6;
        color: #fff;
    }

    .content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
        flex-grow: 1;
    }

    .icon {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
    }

    .message {
        margin-right: auto;
    }

    .actions {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .link,
    .history-link {
        color: inherit;
        text-decoration: underline;
        text-underline-offset: 2px;
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        opacity: 0.9;
        transition: opacity 0.2s;
        white-space: nowrap;
    }

    .link:hover,
    .history-link:hover {
        opacity: 1;
    }

    .dismiss-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: inherit;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background-color 0.2s;
        flex-shrink: 0;
    }

    .dismiss-btn:hover {
        background: rgba(255, 255, 255, 0.4);
    }

    @media (max-width: 640px) {
        .banner {
            flex-direction: column;
            align-items: flex-start;
            padding: 1rem;
        }

        .dismiss-btn {
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
        }

        .actions {
            width: 100%;
            justify-content: space-between;
            margin-top: 0.5rem;
        }
    }
</style>
