<script>
    import { getVersionInfo } from "$lib/services/versionService";
    import Icon from "@iconify/svelte";

    const { announcements } = getVersionInfo();
    const sortedAnnouncements = announcements.sort(
        (a, b) => new Date(b.date) - new Date(a.date),
    );

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

    function getColor(type) {
        switch (type) {
            case "warning":
                return "var(--warning-color, #f59e0b)";
            case "success":
                return "var(--success-color, #10b981)";
            case "feature":
                return "var(--primary-color, #6366f1)";
            case "critical":
                return "var(--error-color, #ef4444)";
            default:
                return "var(--text-secondary, #6b7280)";
        }
    }
</script>

<svelte:head>
    <title>Announcements & Updates</title>
</svelte:head>

<div class="page-container">
    <header class="page-header">
        <h1>Announcements</h1>
        <p class="subtitle">
            Latest updates, features, and maintenance notices.
        </p>
    </header>

    <div class="timeline">
        {#each sortedAnnouncements as item}
            <div class="timeline-item">
                <div class="date-col">
                    <span class="date">{item.date}</span>
                    <div class="line"></div>
                </div>

                <div class="content-col">
                    <div class="card">
                        <div class="card-header">
                            <span
                                class="badge"
                                style="background-color: {getColor(item.type)}"
                            >
                                <Icon
                                    icon={getIcon(item.type)}
                                    style="margin-right: 4px;"
                                />
                                {item.type}
                            </span>
                        </div>

                        <h3 class="message">{item.message}</h3>

                        {#if item.link}
                            <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="read-more"
                            >
                                View details on GitHub <Icon
                                    icon="mdi:open-in-new"
                                    width="14"
                                />
                            </a>
                        {/if}
                    </div>
                </div>
            </div>
        {:else}
            <div class="empty-state">
                <Icon icon="mdi:bell-off-outline" width="48" />
                <p>No announcements yet.</p>
            </div>
        {/each}
    </div>
</div>

<style>
    .page-container {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem 1rem;
    }

    .page-header {
        text-align: center;
        margin-bottom: 3rem;
    }

    h1 {
        font-size: 2.5rem;
        margin-bottom: 0.5rem;
    }

    .subtitle {
        color: var(--text-secondary);
        font-size: 1.1rem;
    }

    .timeline {
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    .timeline-item {
        display: flex;
        gap: 1.5rem;
    }

    .date-col {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        min-width: 100px;
        padding-top: 0.5rem;
    }

    .date {
        font-weight: 500;
        color: var(--text-secondary);
        font-size: 0.9rem;
        white-space: nowrap;
    }

    .line {
        width: 2px;
        background-color: var(--border-color);
        flex-grow: 1;
        margin-top: 0.5rem;
        margin-right: -1.6rem; /* Align with card edge roughly */
        position: relative;
    }

    .content-col {
        flex-grow: 1;
    }

    .card {
        background-color: var(--surface-color);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
        padding: 1.5rem;
        box-shadow: var(--shadow-sm);
        transition: transform 0.2s;
    }

    .card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
    }

    .card-header {
        margin-bottom: 0.75rem;
    }

    .badge {
        display: inline-flex;
        align-items: center;
        padding: 4px 10px;
        border-radius: 99px;
        color: white;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .message {
        margin: 0 0 1rem;
        font-size: 1.2rem;
        line-height: 1.5;
        font-weight: 500;
    }

    .read-more {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        color: var(--primary-color);
        text-decoration: none;
        font-weight: 500;
        font-size: 0.9rem;
    }

    .read-more:hover {
        text-decoration: underline;
    }

    .empty-state {
        text-align: center;
        color: var(--text-secondary);
        padding: 4rem;
    }

    @media (max-width: 600px) {
        .timeline-item {
            flex-direction: column;
            gap: 0.5rem;
        }

        .date-col {
            flex-direction: row;
            align-items: center;
            gap: 1rem;
            min-width: unset;
        }

        .line {
            display: none;
        }
    }
</style>
