<script>
    import Icon from '@iconify/svelte'
    import { createImageSet } from '$lib/image'
    import { preferences } from '$lib/stores/preferences'

    let { data } = $props()
    const groups = $derived(data.groups)

    /** @param {any} date */
    function formatDate (date) {
        if (!date) return 'Unknown date'
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }).format(new Date(date))
    }
</script>

<svelte:head>
    <title>Pending Verification - Switch Performance</title>
    <meta
        name="description"
        content="View community contributions currently awaiting verification via GitHub Pull Requests. Track the status of pending performance data submissions."
    />
</svelte:head>

<div class="pending-dashboard">
    <header class="dashboard-header">
        <div class="status-badge">
            <Icon icon="mdi:clock-outline" />
            Verification Queue
        </div>
        <h1 class="title-main">Pending Contributions</h1>
        <p class="title-sub">
            Data is currently being verified via Pull Requests on GitHub. Once
            merged, these updates will automatically go live.
        </p>
    </header>

    {#if groups.length === 0}
        <div class="empty-state">
            <div class="icon-circle">
                <Icon icon="mdi:check-all" width="48" />
            </div>
            <h2 class="empty-title">Queue is Empty</h2>
            <p class="empty-sub">
                All recent contributions have been verified and merged.
            </p>
        </div>
    {:else}
        <div class="groups-list">
            {#each groups as group}
                <div class="verification-card glass-panel">
                    <div class="card-header">
                        <div class="game-info">
                            {#if group.game}
                                {@const iconSet = createImageSet(
                                    group.game.iconUrl || group.game.bannerUrl,
                                    {
                                        highRes: $preferences.highResImages,
                                        thumbnailWidth: 96,
                                    },
                                )}
                                {#if iconSet}
                                    <img
                                        src={iconSet.src}
                                        srcset={iconSet.srcset}
                                        alt={group.game.names.en}
                                        class="game-icon"
                                        class:fallback-icon={!group.game
                                            .iconUrl && group.game.bannerUrl}
                                    />
                                {/if}
                                <div class="game-text">
                                    <h2 class="game-name">
                                        <a
                                            href={`/title/${group.game.id}`}
                                            class="title-link"
                                        >
                                            {group.game.name}
                                        </a>
                                    </h2>
                                    <p class="group-id">{group.groupId}</p>
                                </div>
                            {:else}
                                <div class="game-icon placeholder">
                                    <Icon
                                        icon="mdi:help-circle-outline"
                                        width="24"
                                    />
                                </div>
                                <h2 class="game-name unknown">Unknown Group</h2>
                            {/if}
                        </div>

                        <div class="pr-info">
                            <span class="submission-date"
                                >{formatDate(group.submittedAt)}</span
                            >
                            <a
                                href={group.prUrl ||
                                    `https://github.com/biase-d/nx-performance/pull/${group.prNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="pr-link github-glow"
                            >
                                <Icon icon="mdi:github" width="18" />
                                <span>PR #{group.prNumber}</span>
                                <Icon
                                    icon="mdi:open-in-new"
                                    width="14"
                                    class="external-icon"
                                />
                            </a>
                        </div>
                    </div>

                    <div class="card-body">
                        <div class="card-sections">
                            <div class="details-section">
                                <h3 class="section-label">
                                    Contribution Details
                                </h3>
                                <div class="changes-list">
                                    {#if group.changeSummary && group.changeSummary.length > 0}
                                        <ul class="summary-list">
                                            {#each group.changeSummary as change}
                                                <li class="summary-item">
                                                    <span class="bullet">•</span>
                                                    <span>{change}</span>
                                                </li>
                                            {/each}
                                        </ul>
                                    {:else}
                                        <div class="no-changes">
                                            <span class="text-muted"
                                                >No summary available.</span
                                            >
                                        </div>
                                    {/if}
                                </div>
                            </div>

                            {#if group.contributors && group.contributors.length > 0}
                                <div class="contributors-section">
                                    <h3 class="section-label">Contributors</h3>
                                    <div class="contributor-list">
                                        {#each group.contributors as contributor}
                                            <span class="contributor-badge">
                                                <Icon
                                                    icon="mdi:account-outline"
                                                    width="14"
                                                />
                                                {contributor}
                                            </span>
                                        {/each}
                                    </div>
                                </div>
                            {/if}
                        </div>
                    </div>

                    <div class="card-footer">
                        <div class="merge-status pending">
                            <div class="pulse-dot"></div>
                            Awaiting GitHub merge
                        </div>
                        <div class="footer-note">
                            Verification is automated upon merge
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .pending-dashboard {
        max-width: 900px;
        margin: 0 auto;
        padding: 3rem 1.5rem;
    }

    .dashboard-header {
        margin-bottom: 3rem;
        text-align: center;
    }

    .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.375rem 1rem;
        border-radius: 9999px;
        background: color-mix(in srgb, #eab308 15%, transparent);
        color: #eab308;
        border: 1px solid color-mix(in srgb, #eab308 30%, transparent);
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: 1rem;
    }

    .title-main {
        font-size: 2.25rem;
        font-weight: 900;
        margin-bottom: 1rem;
        letter-spacing: -0.025em;
        color: var(--text-primary);
    }

    .title-sub {
        color: var(--text-secondary);
        max-width: 36rem;
        margin-left: auto;
        margin-right: auto;
        font-size: 1.125rem;
        line-height: 1.625;
    }

    .glass-panel {
        background: color-mix(in srgb, var(--surface-color) 70%, transparent);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid var(--border-color);
    }

    .groups-list {
        display: grid;
        gap: 2rem;
    }

    .verification-card {
        border-radius: 24px;
        transition:
            transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow 0.3s ease,
            border-color 0.3s ease;
        box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.1);
    }

    .verification-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 20px 40px -10px color-mix(in srgb, var(--primary-color) 15%, rgba(0,0,0,0.2));
        border-color: var(--primary-color);
    }

    .card-header {
        border-bottom: 1px solid var(--border-color);
        padding: 1.5rem;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
    }

    .game-info {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .game-icon {
        width: 3rem;
        height: 3rem;
        border-radius: 0.75rem;
        box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.2);
        border: 1px solid var(--border-color);
        object-fit: cover;
    }

    .game-icon.fallback-icon {
        object-position: center;
    }

    .game-icon.placeholder {
        background: var(--input-bg);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-secondary);
    }

    .game-name {
        font-size: 1.25rem;
        font-weight: 700;
        margin: 0;
        color: var(--text-primary);
    }

    .game-name.unknown {
        color: var(--text-secondary);
        font-style: italic;
    }

    .group-id {
        font-size: 0.75rem;
        color: var(--text-secondary);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            monospace;
        letter-spacing: -0.05em;
        text-transform: uppercase;
        margin: 0;
    }

    .pr-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .submission-date {
        font-size: 0.875rem;
        color: var(--text-secondary);
        font-weight: 500;
    }

    .pr-link {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.6rem 1.25rem;
        /* Dynamic inversion based on theme */
        background: var(--text-primary);
        color: var(--surface-color);
        text-decoration: none;
        border-radius: 14px;
        font-weight: 700;
        font-size: 0.9rem;
        transition: all 0.2s ease;
        border: 1px solid transparent;
    }

    .github-glow:hover {
        transform: scale(1.02);
        box-shadow: 0 8px 20px color-mix(in srgb, var(--text-primary) 20%, transparent);
    }

    .pr-link :global(.external-icon) {
        opacity: 0.5;
    }

    .title-link {
        color: inherit;
        text-decoration: none;
        transition: color 0.2s ease;
    }

    .title-link:hover {
        color: var(--primary-color);
        text-underline-offset: 4px;
        text-decoration: underline;
    }

    .card-body {
        padding: 1.5rem;
    }

    .card-sections {
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    .contributors-section {
        border-top: 1px solid var(--border-color);
        padding-top: 1.5rem;
    }

    .contributor-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
    }

    .contributor-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.3rem 0.75rem;
        background: var(--input-bg);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        font-size: 0.8rem;
        font-weight: 500;
        color: var(--text-secondary);
        transition: all 0.2s ease;
    }

    .contributor-badge:hover {
        background: color-mix(in srgb, var(--primary-color) 10%, var(--input-bg));
        border-color: var(--primary-color);
        color: var(--primary-color);
    }

    .changes-list {
        background: var(--input-bg);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 1rem 1.25rem;
    }

    .summary-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .summary-item {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        font-size: 0.9rem;
        line-height: 1.4;
        color: var(--text-primary);
    }

    .bullet {
        color: var(--primary-color);
        font-size: 1.2rem;
        line-height: 1;
        margin-top: -0.1rem;
    }

    .no-changes {
        font-size: 0.9rem;
        color: var(--text-secondary);
        font-style: italic;
    }

    .section-label {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: 1rem;
        margin-top: 0;
    }

    .card-footer {
        background: var(--input-bg);
        padding: 1rem 1.5rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-top: 1px solid var(--border-color);
        border-radius: 0 0 24px 24px;
    }

    .merge-status {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .merge-status.pending {
        color: #eab308;
    }

    .footer-note {
        font-size: 0.75rem;
        color: var(--text-secondary);
        font-style: italic;
    }

    .empty-state {
        text-align: center;
        padding: 6rem 1.25rem;
        background: color-mix(in srgb, var(--surface-color) 40%, transparent);
        border: 2px dashed var(--border-color);
        border-radius: 32px;
    }

    .icon-circle {
        width: 100px;
        height: 100px;
        background: var(--input-bg);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1.5rem;
        color: var(--text-secondary);
    }

    .empty-title {
        font-size: 1.5rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
        color: var(--text-primary);
    }

    .empty-sub {
        color: var(--text-secondary);
        margin: 0;
    }

    .pulse-dot {
        width: 8px;
        height: 8px;
        background: currentColor;
        border-radius: 50%;
        animation: pulse 2s infinite;
    }

    @keyframes pulse {
        0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 color-mix(in srgb, currentColor 70%, transparent);
        }
        70% {
            transform: scale(1);
            box-shadow: 0 0 0 10px rgba(234, 179, 8, 0);
        }
        100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(234, 179, 8, 0);
        }
    }
</style>