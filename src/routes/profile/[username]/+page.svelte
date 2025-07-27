<script>
    export let data;
    const { username, mergedPullRequests, pendingPullRequests } = data;

    const sessionUser = data.session?.user;
    const isOwnProfile = sessionUser?.login?.toLowerCase() === username.toLowerCase();

    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
</script>

<svelte:head>
    <title>Profile for {username}</title>
</svelte:head>

<div class="profile-container">
    <div class="profile-header">
        {#if isOwnProfile && sessionUser?.image}
            <img src={sessionUser.image} alt={username} class="avatar" />
        {/if}
        <div class="header-text">
            <h1>{username}'s Profile</h1>
            <p>
                Successfully merged <strong>{mergedPullRequests.length}</strong>
                {mergedPullRequests.length === 1 ? 'contribution' : 'contributions'}.
            </p>
        </div>
    </div>

    {#if pendingPullRequests.length > 0}
        <h2 class="section-title">Pending Review</h2>
        <div class="pr-grid">
            {#each pendingPullRequests as pr}
                <a href={pr.url} class="pr-card pending" target="_blank" rel="noopener noreferrer">
                    <div class="card-header">
                        <span class="status-badge pending-badge">Pending</span>
                        <div class="date-info">
                            <span>{formatDate(pr.createdAt)}</span>
                            <span class="pr-number">#{pr.number}</span>
                        </div>
                    </div>
                    <h3 class="pr-title">{pr.title}</h3>
                    <span class="pr-link">View on GitHub →</span>
                </a>
            {/each}
        </div>
    {/if}

    {#if mergedPullRequests.length > 0}
        <h2 class="section-title">Merged Contributions</h2>
         <div class="pr-grid">
            {#each mergedPullRequests as pr}
                <a href={pr.url} class="pr-card merged" target="_blank" rel="noopener noreferrer">
                    <div class="card-header">
                        <span class="status-badge merged-badge">Merged</span>
                         <div class="date-info">
                            <span>{formatDate(pr.createdAt)}</span>
                            <span class="pr-number">#{pr.number}</span>
                         </div>
                    </div>
                    <h3 class="pr-title">{pr.title}</h3>
                    <span class="pr-link">View on GitHub →</span>
                </a>
            {/each}
        </div>
    {/if}

    {#if pendingPullRequests.length === 0 && mergedPullRequests.length === 0}
        <div class="empty-state">
            <h2>No Contributions Found</h2>
            <p>{username} hasn't submitted any performance data contributions yet.</p>
        </div>
    {/if}
</div>

<style>
    .profile-container {
        max-width: 1024px;
        margin: 0 auto;
    }
    .profile-header {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        margin-bottom: 2.5rem;
        padding-bottom: 1.5rem;
        border-bottom: 1px solid var(--border-color);
    }
    .section-title {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--text-primary);
        margin-top: 3rem;
        margin-bottom: 1.5rem;
    }
    .avatar {
        width: 80px;
        height: 80px;
        border-radius: 999px;
        border: 2px solid var(--border-color);
    }
    .header-text h1 {
        margin: 0;
        font-size: 2.25rem;
        color: var(--text-primary);
    }
    .header-text p {
        margin: 0.25rem 0 0;
        font-size: 1.1rem;
        color: var(--text-secondary);
    }

    .pr-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
    }

    .pr-card {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        background-color: var(--surface-color);
        padding: 1.5rem;
        border-radius: var(--border-radius);
        border: 1px solid var(--border-color);
        text-decoration: none;
        transition: all 0.2s ease;
        box-shadow: var(--box-shadow);
    }

    .pr-card:hover {
        transform: translateY(-3px);
        border-color: var(--primary-color);
    }

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .date-info {
        text-align: right;
        font-size: 0.8rem;
        color: var(--text-secondary);
    }

    .pr-number {
        margin-left: 0.5rem;
        opacity: 0.7;
    }

    .pr-title {
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
        font-size: 1.1rem;
        flex-grow: 1;
    }

    .pr-link {
        font-size: 0.9rem;
        font-weight: 500;
        color: var(--primary-color);
    }

    .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.75rem;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 999px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .pending-badge {
        background-color: hsl(45, 93%, 85%);
        color: hsl(38, 61%, 35%);
    }
    .merged-badge {
        background-color: hsl(145, 63%, 85%);
        color: hsl(145, 63%, 25%);
    }
    .status-badge::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
    }
    .pending-badge::before {
        background-color: #eab308;
    }
    .merged-badge::before {
        background-color: #22c55e;
    }

    .empty-state {
        text-align: center;
        padding: 4rem 2rem;
        background-color: var(--surface-color);
        border-radius: var(--border-radius);
        border: 2px dashed var(--border-color);
    }
</style>