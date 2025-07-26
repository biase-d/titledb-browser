<script>
    export let data;
    const { username, pullRequests } = data;

    const sessionUser = data.session?.user;
    const isOwnProfile = sessionUser?.name?.toLowerCase() === username.toLowerCase();

    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
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
            <h1>{username}'s Contributions</h1>
            <p>
                Successfully contributed data for <strong>{pullRequests.length}</strong>
                {pullRequests.length === 1 ? 'game' : 'games'}.
            </p>
        </div>
    </div>

    {#if pullRequests.length > 0}
        <ul class="pr-list">
            {#each pullRequests as pr}
                <li class="pr-item">
                    <a href={pr.url} target="_blank" rel="noopener noreferrer">
                        <div class="pr-info">
                            <span class="pr-title">{pr.title}</span>
                            <span class="pr-date">Submitted on {formatDate(pr.createdAt)}</span>
                        </div>
                        <span class="pr-link">View on GitHub →</span>
                    </a>
                </li>
            {/each}
        </ul>
    {:else}
        <div class="empty-state">
            <h2>No Contributions Found</h2>
            <p>{username} hasn't had any performance data contributions merged yet.</p>
        </div>
    {/if}
</div>

<style>
    .profile-container {
        max-width: 800px;
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

    .pr-list {
        list-style: none;
        padding: 0;
        margin: 0;
    }
    .pr-item a {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
        background-color: var(--surface-color);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        margin-bottom: 1rem;
        text-decoration: none;
        transition: all 0.2s ease;
    }
    .pr-item a:hover {
        border-color: var(--primary-color);
        transform: translateY(-2px);
        box-shadow: var(--box-shadow);
    }
    .pr-info {
        display: flex;
        flex-direction: column;
    }
    .pr-title {
        font-weight: 500;
        color: var(--text-primary);
    }
    .pr-date {
        font-size: 0.875rem;
        color: var(--text-secondary);
        margin-top: 0.25rem;
    }
    .pr-link {
        font-size: 0.9rem;
        font-weight: 500;
        color: var(--primary-color);
    }

    .empty-state {
        text-align: center;
        padding: 4rem 2rem;
        background-color: var(--surface-color);
        border-radius: var(--border-radius);
        border: 2px dashed var(--border-color);
    }
</style>