<script>
    /** @type {{ viewMode?: 'grid' | 'list' | 'table' | 'detailed' | 'gallery' | 'compact' | 'activity' }} */
    let { viewMode = 'grid' } = $props()
</script>

{#if viewMode === 'grid'}
    <div class="skeleton-card">
        <div class="skeleton-image"></div>
        <div class="skeleton-content">
            <div class="skeleton-title"></div>
            <div class="skeleton-meta"></div>
            <div class="skeleton-badges">
                <div class="skeleton-badge"></div>
                <div class="skeleton-badge"></div>
            </div>
        </div>
    </div>
{:else if viewMode === 'gallery'}
    <div class="skeleton-gallery-item">
        <div class="skeleton-overlay">
            <div class="skeleton-title-sm"></div>
            <div class="skeleton-meta-xs"></div>
        </div>
    </div>
{:else if viewMode === 'compact'}
    <div class="skeleton-compact-item">
        <div class="skeleton-icon-xs"></div>
        <div class="skeleton-title-xs"></div>
        <div class="skeleton-badge-xs"></div>
    </div>
{:else if viewMode === 'table'}
    <div class="skeleton-table-row">
        <div class="skeleton-icon-sm"></div>
        <div class="skeleton-title-sm"></div>
        <div class="skeleton-id-sm"></div>
        <div class="skeleton-region-sm"></div>
        <div class="skeleton-fps-sm"></div>
    </div>
{:else if viewMode === 'detailed'}
    <div class="skeleton-detailed-item">
        <div class="skeleton-icon-lg"></div>
        <div class="skeleton-detailed-content">
            <div class="skeleton-title"></div>
            <div class="skeleton-meta-grid">
                <div class="skeleton-meta-item"></div>
                <div class="skeleton-meta-item"></div>
                <div class="skeleton-meta-item"></div>
            </div>
            <div class="skeleton-perf-overview"></div>
        </div>
    </div>
{:else if viewMode === 'activity'}
    <div class="skeleton-activity-item">
        <div class="skeleton-icon-sm"></div>
        <div class="skeleton-activity-body">
            <div class="skeleton-header-row">
                <div class="skeleton-badge-sm"></div>
                <div class="skeleton-time-sm"></div>
            </div>
            <div class="skeleton-title-sm"></div>
        </div>
    </div>
{:else}
    <div class="skeleton-list-item">
        <div class="skeleton-icon"></div>
        <div class="skeleton-list-content">
            <div class="skeleton-title-sm"></div>
            <div class="skeleton-meta-sm"></div>
        </div>
        <div class="skeleton-badge-sm"></div>
    </div>
{/if}

<style>
    .skeleton-card,
    .skeleton-list-item {
        background: var(--surface-color);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        overflow: hidden;
        position: relative;
    }

    .skeleton-card {
        height: 100%;
        display: flex;
        flex-direction: column;
    }

    .skeleton-list-item {
        display: flex;
        align-items: center;
        padding: 0.75rem;
        gap: 1rem;
        margin-bottom: 0.5rem;
    }

    .skeleton-compact-item {
        display: flex;
        align-items: center;
        padding: 0.4rem 0.75rem;
        gap: 0.75rem;
        height: 48px;
        background: var(--surface-color);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-sm);
    }

    .skeleton-table-row {
        display: grid;
        grid-template-columns: 48px 1fr 160px 120px 140px;
        align-items: center;
        padding: 0.5rem 1rem;
        height: 48px;
        background: var(--surface-color);
        border-bottom: 1px solid var(--border-color);
    }

    .skeleton-gallery-item {
        aspect-ratio: 16 / 9;
        background: var(--input-bg);
        border-radius: var(--radius-lg);
        position: relative;
        overflow: hidden;
    }

    .skeleton-detailed-item {
        display: flex;
        padding: 1.5rem;
        gap: 1.5rem;
        background: var(--surface-color);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
    }

    .skeleton-activity-item {
        display: flex;
        align-items: center;
        padding: 1rem 1.25rem;
        gap: 1.25rem;
        height: 80px;
        background: var(--surface-color);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
    }

    .skeleton-image {
        aspect-ratio: 16/9;
        background: var(--input-bg);
    }

    .skeleton-icon {
        width: 48px;
        height: 48px;
        border-radius: var(--radius-sm);
        background: var(--input-bg);
    }

    .skeleton-icon-xs {
        width: 24px;
        height: 24px;
        border-radius: 4px;
        background: var(--input-bg);
    }
    .skeleton-icon-sm {
        width: 32px;
        height: 32px;
        border-radius: 4px;
        background: var(--input-bg);
    }
    .skeleton-icon-lg {
        width: 96px;
        height: 96px;
        border-radius: var(--radius-md);
        background: var(--input-bg);
    }

    .skeleton-content {
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .skeleton-list-content,
    .skeleton-detailed-content,
    .skeleton-activity-body {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .skeleton-overlay {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 1.25rem;
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.5));
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .skeleton-title,
    .skeleton-title-sm,
    .skeleton-title-xs,
    .skeleton-meta,
    .skeleton-meta-sm,
    .skeleton-meta-xs,
    .skeleton-meta-grid,
    .skeleton-meta-item,
    .skeleton-id-sm,
    .skeleton-region-sm,
    .skeleton-fps-sm,
    .skeleton-badge,
    .skeleton-badge-sm,
    .skeleton-badge-xs,
    .skeleton-time-sm,
    .skeleton-perf-overview {
        background: var(--border-color);
        border-radius: 4px;
        position: relative;
        overflow: hidden;
    }

    .skeleton-title {
        height: 1.25rem;
        width: 80%;
    }
    .skeleton-title-sm {
        height: 1rem;
        width: 60%;
    }
    .skeleton-title-xs {
        height: 0.8rem;
        width: 40%;
    }
    .skeleton-meta {
        height: 0.875rem;
        width: 40%;
    }
    .skeleton-meta-sm {
        height: 0.75rem;
        width: 30%;
    }
    .skeleton-meta-xs {
        height: 0.6rem;
        width: 20%;
    }
    .skeleton-id-sm {
        height: 0.75rem;
        width: 100px;
    }
    .skeleton-region-sm {
        height: 0.75rem;
        width: 80px;
    }
    .skeleton-fps-sm {
        height: 0.75rem;
        width: 100px;
    }
    .skeleton-time-sm {
        height: 0.75rem;
        width: 60px;
    }
    .skeleton-meta-grid {
        height: 60px;
        width: 100%;
        border-radius: var(--radius-md);
    }
    .skeleton-perf-overview {
        height: 40px;
        width: 200px;
    }

    .skeleton-header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .skeleton-badges {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }
    .skeleton-badge {
        height: 1.5rem;
        width: 60px;
        border-radius: 999px;
    }
    .skeleton-badge-sm {
        height: 1.25rem;
        width: 50px;
        border-radius: 999px;
    }
    .skeleton-badge-xs {
        height: 1rem;
        width: 40px;
        border-radius: 999px;
    }

    .skeleton-title::after,
    .skeleton-title-sm::after,
    .skeleton-title-xs::after,
    .skeleton-meta::after,
    .skeleton-meta-sm::after,
    .skeleton-meta-xs::after,
    .skeleton-meta-grid::after,
    .skeleton-id-sm::after,
    .skeleton-region-sm::after,
    .skeleton-fps-sm::after,
    .skeleton-badge::after,
    .skeleton-badge-sm::after,
    .skeleton-badge-xs::after,
    .skeleton-time-sm::after,
    .skeleton-perf-overview::after,
    .skeleton-image::after,
    .skeleton-icon::after,
    .skeleton-icon-xs::after,
    .skeleton-icon-sm::after,
    .skeleton-icon-lg::after {
        content: "";
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        transform: translateX(-100%);
        background-image: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0,
            rgba(255, 255, 255, 0.05) 20%,
            rgba(255, 255, 255, 0.1) 60%,
            rgba(255, 255, 255, 0)
        );
        animation: shimmer 2s infinite;
    }

    @keyframes shimmer {
        100% {
            transform: translateX(100%);
        }
    }
</style>
