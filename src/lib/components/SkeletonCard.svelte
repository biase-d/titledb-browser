<script>
    /** @type {{ viewMode?: 'grid' | 'list' }} */
    let { viewMode = "grid" } = $props();
</script>

{#if viewMode === "grid"}
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

    .skeleton-content {
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .skeleton-list-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .skeleton-title,
    .skeleton-title-sm,
    .skeleton-meta,
    .skeleton-meta-sm,
    .skeleton-badge,
    .skeleton-badge-sm {
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
    .skeleton-meta {
        height: 0.875rem;
        width: 40%;
    }
    .skeleton-meta-sm {
        height: 0.75rem;
        width: 30%;
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

    .skeleton-title::after,
    .skeleton-title-sm::after,
    .skeleton-meta::after,
    .skeleton-meta-sm::after,
    .skeleton-badge::after,
    .skeleton-badge-sm::after,
    .skeleton-image::after,
    .skeleton-icon::after {
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
