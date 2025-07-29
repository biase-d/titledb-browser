<script>
	import Icon from "@iconify/svelte";

    export let data;
    const { username, mergedPullRequests } = data;

    const sessionUser = data.session?.user;
    const isOwnProfile = sessionUser?.login?.toLowerCase() === username.toLowerCase();

    const iconPool = [
        'mdi:star',
        'mdi:trophy',
        'mdi:medal',
        'mdi:sparkles',
        'mdi:diamond-stone',
        'mdi:crown',
        'mdi:lightning-bolt'
    ];

    const badges = [
        { threshold: 5, name: 'Bronze Contributor', color: '#cd7f32' },
        { threshold: 10, name: 'Silver Contributor', color: '#c0c0c0' },
        { threshold: 20, name: 'Gold Contributor', color: '#ffd700' },
        { threshold: 40, name: 'Platinum Contributor', color: '#e5e4e2' },
        { threshold: 80, name: 'Diamond Contributor', color: '#b9f2ff' },
        { threshold: 100, name: 'Master Contributor', color: '#ff00ff' }
    ].map(badge => ({
        ...badge,
        icon: iconPool[Math.floor(Math.random() * iconPool.length)]
    }));

    $: unlockedBadges = badges.filter(badge => mergedPullRequests.length >= badge.threshold);
    $: nextBadge = badges.find(badge => mergedPullRequests.length < badge.threshold);
    $: progressToNext = nextBadge ? Math.floor((mergedPullRequests.length / nextBadge.threshold) * 100) : 100;
</script>

<svelte:head>
    <title>{username}'s profile - Titledb Browser</title>
</svelte:head>

<div class="profile-container">
    <div class="profile-header">
        {#if isOwnProfile && sessionUser?.image}
            <img src={sessionUser.image} alt={username} class="avatar" />
        {/if}
        <div class="header-text">
            <h1>{username}'s Profile</h1>
            {#if isOwnProfile}
                <form action="/auth/signout" method="post">
                    <button type="submit" class="signout-button">Sign Out</button>
                </form>
            {/if}
            <p>
                Successfully contributed data for <strong>{mergedPullRequests.length}</strong>
                {mergedPullRequests.length === 1 ? 'game' : 'games'}.
            </p>
            
            <div class="badges-container">
                {#if unlockedBadges.length > 0}
                    {#each unlockedBadges as badge}
                        <span class="badge" style="--badge-color: {badge.color};" title={badge.name}>
                            <Icon icon={badge.icon} class="badge-icon" />
                            <span class="badge-count">{badge.threshold}</span>
                        </span>
                    {/each}
                {/if}
            </div>

            {#if nextBadge}
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: {progressToNext}%;"></div>
                    <span class="progress-text">{progressToNext}% to {nextBadge.threshold} contributions ({nextBadge.name})</span>
                </div>
            {/if}
        </div>
    </div>

    {#if mergedPullRequests.length > 0}
        <h2 class="section-title">Contributions</h2>
         <div class="pr-grid">
            {#each mergedPullRequests as game}
                <a href={game.url} class="pr-card merged">
                    <h3 class="pr-title">{game.title}</h3>
                    <span class="pr-link">View Game →</span>
                </a>
            {/each}
        </div>
    {:else}
        <div class="empty-state">
            <h2>No Contributions Found</h2>
            <p>{username} hasn't submitted any performance data contributions yet</p>
        </div>
    {/if}
</div>

<style>
    .profile-container { max-width: 1024px; margin: 0 auto; }
    .profile-header {
        display: flex;
        align-items: flex-start;
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
        width: 120px;
        height: 120px;
        border-radius: 999px;
        border: 2px solid var(--border-color);
        flex-shrink: 0;
    }
    .header-text {
        flex-grow: 1;
    }
    .header-text h1 {
        margin: 0;
        font-size: 2.25rem;
        color: var(--text-primary);
    }
    .header-text p {
        margin: 0.25rem 0 0.75rem;
        font-size: 1.1rem;
        color: var(--text-secondary);
    }

    .badges-container {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 1rem;
    }
    .badge {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 4px 10px;
        border-radius: 999px;
        background-color: var(--badge-color);
        color: white;
        font-size: 0.8rem;
        font-weight: 600;
        text-shadow: 0 1px 1px rgba(0,0,0,0.2);
    }
    :global(.badge-icon) {
        width: 1rem;
        height: 1rem;
        filter: brightness(1.2);
    }
    .progress-bar-container {
        width: 100%;
        height: 8px;
        background-color: var(--input-bg);
        border-radius: 999px;
        overflow: hidden;
        margin-top: 0.5rem;
        position: relative;
    }
    .progress-bar {
        height: 100%;
        background-color: var(--primary-color);
        border-radius: 999px;
        transition: width 0.3s ease-out;
    }
    .progress-text {
        font-size: 0.8rem;
        color: var(--text-secondary);
        margin-top: 0.5rem;
        display: block;
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

    .pr-title {
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
        font-size: 1.1rem;
        flex-grow: 1;
    }

    .empty-state {
        text-align: center;
        padding: 4rem 2rem;
        background-color: var(--surface-color);
        border-radius: var(--border-radius);
        border: 2px dashed var(--border-color);
    }
</style>