<script>
    import Icon from '@iconify/svelte'
    import { fade, fly } from 'svelte/transition'

    let { data } = $props()
    let health = $derived(data.health)

    function getStatusColor (status) {
        switch (status) {
            case 'up':
                return '#10b981'
            case 'degraded':
                return '#f59e0b'
            case 'down':
                return '#ef4444'
            default:
                return 'var(--text-secondary)'
        }
    }

    function getStatusLabel (status) {
        switch (status) {
            case 'up':
                return 'Operational'
            case 'degraded':
                return 'Degraded Performance'
            case 'down':
                return 'Service Outage'
            default:
                return 'Unknown'
        }
    }
</script>

<svelte:head>
    <title>System Status - Switch Performance</title>
</svelte:head>

<main class="page-container">
    <div class="status-header" in:fly={{ y: -20, duration: 600 }}>
        <h1>System Status</h1>
        <div class="overall-status">
            {#if Object.values(health.services).every((s) => s.status === 'up')}
                <div class="status-indicator up"></div>
                <span>All Systems Operational</span>
            {:else if Object.values(health.services).some((s) => s.status === 'down')}
                <div class="status-indicator down"></div>
                <span>Major Service Outage</span>
            {:else}
                <div class="status-indicator degraded"></div>
                <span>Partial Service Degradation</span>
            {/if}
        </div>
    </div>

    <div class="services-grid">
        <div class="service-card" in:fade={{ delay: 200 }}>
            <div class="service-info">
                <Icon icon="mdi:database" />
                <h3>Core Database</h3>
            </div>
            <div class="service-status">
                <span
                    class="status-pill"
                    style:background-color={getStatusColor(
                        health.services.database.status,
                    )}
                >
                    {getStatusLabel(health.services.database.status)}
                </span>
                <span class="latency">{health.services.database.latency}ms</span
                >
            </div>
            {#if health.services.database.message && health.services.database.status !== 'up'}
                <div class="error-detail">
                    <Icon icon="mdi:alert-circle-outline" />
                    <span>{health.services.database.message}</span>
                </div>
            {/if}
        </div>

        <div class="service-card" in:fade={{ delay: 300 }}>
            <div class="service-info">
                <Icon icon="mdi:cloud-download" />
                <h3>e-Shop CDN</h3>
            </div>
            <div class="service-status">
                <span
                    class="status-pill"
                    style:background-color={getStatusColor(
                        health.services.nintendoCdn.status,
                    )}
                >
                    {getStatusLabel(health.services.nintendoCdn.status)}
                </span>
                <span class="latency"
                    >{health.services.nintendoCdn.latency}ms</span
                >
            </div>
            {#if health.services.nintendoCdn.message && health.services.nintendoCdn.status !== 'up'}
                <div class="error-detail">
                    <Icon icon="mdi:alert-circle-outline" />
                    <span>{health.services.nintendoCdn.message}</span>
                </div>
            {/if}
        </div>

        <div class="service-card" in:fade={{ delay: 400 }}>
            <div class="service-info">
                <Icon icon="mdi:github" />
                <h3>nx-performance Repo</h3>
            </div>
            <div class="service-status">
                <span
                    class="status-pill"
                    style:background-color={getStatusColor(
                        health.services.github.status,
                    )}
                >
                    {getStatusLabel(health.services.github.status)}
                </span>
                <span class="latency">{health.services.github.latency}ms</span>
            </div>
            {#if health.services.github.message && health.services.github.status !== 'up'}
                <div class="error-detail">
                    <Icon icon="mdi:alert-circle-outline" />
                    <span>{health.services.github.message}</span>
                </div>
            {/if}
        </div>
    </div>

    <div class="system-details" in:fade={{ delay: 600 }}>
        <div class="detail-item">
            <span class="label">Last Checked</span>
            <span class="value"
                >{new Date(health.timestamp).toLocaleString()}</span
            >
        </div>
        <div class="detail-item">
            <span class="label">System Uptime</span>
            <span class="value"
                >{Math.floor(health.system.uptime / 3600)}h {Math.floor(
                    (health.system.uptime % 3600) / 60,
                )}m</span
            >
        </div>
        <div class="detail-item">
            <span class="label">Environment</span>
            <span class="value">Node {health.system.node_version}</span>
        </div>
    </div>
</main>

<style>
    .page-container {
        max-width: 800px;
        margin: 0 auto;
        padding: 4rem 1.5rem;
    }

    .status-header {
        text-align: center;
        margin-bottom: 4rem;
    }

    h1 {
        font-size: 3rem;
        font-weight: 900;
        margin-bottom: 1rem;
        letter-spacing: -0.02em;
    }

    .overall-status {
        display: inline-flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1.5rem;
        background: var(--surface-color);
        border: 1px solid var(--border-color);
        border-radius: 99px;
        font-weight: 700;
        font-size: 1.1rem;
    }

    .status-indicator {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        box-shadow: 0 0 10px currentColor;
    }

    .status-indicator.up {
        color: #10b981;
        background: #10b981;
    }
    .status-indicator.degraded {
        color: #f59e0b;
        background: #f59e0b;
    }
    .status-indicator.down {
        color: #ef4444;
        background: #ef4444;
    }

    .services-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1rem;
        margin-bottom: 4rem;
    }

    .service-card {
        background: var(--surface-color);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
        padding: 1.5rem 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .service-info {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .service-info :global(svg) {
        font-size: 1.5rem;
        color: var(--text-secondary);
    }

    .service-info h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 700;
    }

    .service-status {
        display: flex;
        align-items: center;
        gap: 1.5rem;
    }

    .status-pill {
        padding: 4px 12px;
        border-radius: 6px;
        color: white;
        font-size: 0.85rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .latency {
        font-family: monospace;
        color: var(--text-secondary);
        font-size: 0.9rem;
    }

    .error-detail {
        margin-top: 1rem;
        padding: 0.75rem 1rem;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.2);
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        color: #ef4444;
        font-size: 0.85rem;
        font-weight: 500;
        animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
    }

    .error-detail :global(svg) {
        font-size: 1.1rem;
        flex-shrink: 0;
    }

    @keyframes shake {
        10%,
        90% {
            transform: translate3d(-1px, 0, 0);
        }
        20%,
        80% {
            transform: translate3d(2px, 0, 0);
        }
        30%,
        50%,
        70% {
            transform: translate3d(-4px, 0, 0);
        }
        40%,
        60% {
            transform: translate3d(4px, 0, 0);
        }
    }

    .system-details {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 2rem;
        padding: 2rem;
        background: rgba(255, 255, 255, 0.02);
        border-radius: var(--radius-lg);
        border: 1px dashed var(--border-color);
    }

    .detail-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .label {
        font-size: 0.8rem;
        font-weight: 700;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }

    .value {
        font-weight: 600;
        color: var(--text-primary);
    }

    @media (max-width: 640px) {
        .service-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
        }
        .service-status {
            width: 100%;
            justify-content: space-between;
        }
    }
</style>
