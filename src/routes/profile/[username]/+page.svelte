<script>
	import Icon from "@iconify/svelte";

	let { data } = $props();
	
	let username = $derived(data.username);
	let contributions = $derived(data.contributions || []);
	let totalContributions = $derived(data.totalContributions || 0);
	let sessionUser = $derived(data.session?.user);
	
	let isOwnProfile = $derived(sessionUser?.login?.toLowerCase() === username.toLowerCase());

	const iconPool = ['mdi:star', 'mdi:trophy', 'mdi:medal', 'mdi:sparkles', 'mdi:diamond-stone', 'mdi:crown', 'mdi:lightning-bolt'];
	const badges = [
		{ threshold: 1, name: 'First Contribution', color: '#a1a1aa' },
		{ threshold: 5, name: 'Bronze Contributor', color: '#cd7f32' },
		{ threshold: 15, name: 'Silver Contributor', color: '#c0c0c0' },
		{ threshold: 30, name: 'Gold Contributor', color: '#ffd700' },
		{ threshold: 50, name: 'Platinum Contributor', color: '#e5e4e2' },
		{ threshold: 100, name: 'Diamond Contributor', color: '#b9f2ff' },
		{ threshold: 200, name: 'Master Contributor', color: '#ff00ff' }
	].map((badge, i) => ({ ...badge, icon: iconPool[i % iconPool.length] }));

	let unlockedBadges = $derived(badges.filter(badge => totalContributions >= badge.threshold));
	let nextBadge = $derived(badges.find(badge => totalContributions < badge.threshold));
	let progressToNext = $derived(nextBadge ? Math.floor((totalContributions / nextBadge.threshold) * 100) : 100);
</script>

<svelte:head>
	<title>{username}'s Profile - Titledb Browser</title>
</svelte:head>

<div class="profile-container">
	<div class="profile-header">
		{#if isOwnProfile && sessionUser?.image}
			<img src={sessionUser.image} alt={username} class="avatar" />
		{/if}
		<div class="header-text">
			<h1>{username}</h1>
			<p>Community Contributor</p>
		</div>
		{#if isOwnProfile}
			<form action="/auth/signout" method="post" class="signout-form">
				<button type="submit" class="signout-button">Sign Out</button>
			</form>
		{/if}
	</div>

	<div class="stats-bar">
		<div class="stat-item">
			<span class="stat-value">{totalContributions}</span>
			<span class="stat-label">Total Contributions</span>
		</div>
		<div class="stat-item">
			<span class="stat-value">{contributions.length}</span>
			<span class="stat-label">Unique Games</span>
		</div>
		{#if unlockedBadges.length > 0}
			<div class="stat-item badges-container">
				{#each unlockedBadges as badge}
					<span class="badge" style="--badge-color: {badge.color};" title="{badge.name} ({badge.threshold}+ contributions)">
						<Icon icon={badge.icon} />
					</span>
				{/each}
			</div>
		{/if}
	</div>

	{#if nextBadge}
		<div class="progress-section">
			<p><strong>Next Goal:</strong> {nextBadge.name} ({nextBadge.threshold} contributions)</p>
			<div class="progress-bar-container">
				<div class="progress-bar" style="width: {progressToNext}%;"></div>
				<span class="progress-text">{totalContributions} / {nextBadge.threshold}</span>
			</div>
		</div>
	{/if}

	<h2 class="section-title">Contributions</h2>

	{#if contributions.length > 0}
		<div class="contributions-grid">
			{#each contributions as item (item.game.id)}
				<a href={`/title/${item.game.id}`} class="game-card">
					<div class="card-icon" style="background-image: url({item.game.iconUrl || '/favicon.svg'})"></div>
					<div class="card-info">
						<p class="card-title">{item.game.name}</p>
						<div class="versions-list">
							{#each item.versions as v}
								<a href={v.sourcePrUrl} target="_blank" rel="noopener noreferrer" class="version-tag" onclick={(e) => e.stopPropagation()}>
									v{v.version} <Icon icon="mdi:open-in-new" />
								</a>
							{/each}
						</div>
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<div class="empty-state">
			<h2>No Contributions Yet</h2>
			<p>{username} hasn't submitted any performance data that has been merged.</p>
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
		margin-bottom: 2rem;
	}

	.avatar {
		width: 80px;
		height: 80px;
		border-radius: 999px;
	}

	.header-text h1 {
		margin: 0;
		font-size: 2rem;
	}

	.header-text p {
		margin: 0;
		color: var(--text-secondary);
	}

	.signout-form {
		margin-left: auto;
	}

	.signout-button {
		padding: 8px 16px;
		font-weight: 500;
		background: none;
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
		border-radius: 6px;
		cursor: pointer;
	}

	.stats-bar {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
		padding: 1.5rem;
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
	}

	.stat-item {
		text-align: center;
	}

	.stat-value {
		font-size: 2rem;
		font-weight: 600;
		color: var(--primary-color);
	}

	.stat-label {
		font-size: 0.8rem;
		color: var(--text-secondary);
		text-transform: uppercase;
	}

	.badges-container {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.badge {
		font-size: 1.75rem;
		color: var(--badge-color);
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
	}

	.progress-section {
		margin-top: 2rem;
	}

	.progress-section p {
		margin: 0 0 0.5rem;
		font-size: 0.9rem;
	}

	.progress-bar-container {
		position: relative;
		width: 100%;
		height: 12px;
		background-color: var(--input-bg);
		border-radius: 999px;
		overflow: hidden;
	}

	.progress-bar {
		height: 100%;
		background-color: var(--primary-color);
		border-radius: 999px;
	}

	.progress-text {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-size: 0.7rem;
		font-weight: bold;
		color: white;
		text-shadow: 0 0 2px black;
	}

	.section-title {
		margin: 2.5rem 0 1.5rem;
		padding-bottom: 0.5rem;
		font-size: 1.5rem;
		font-weight: 600;
		border-bottom: 1px solid var(--border-color);
	}

	.contributions-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 1.5rem;
	}

	.game-card {
		display: flex;
		flex-direction: column;
		background-color: var(--surface-color);
		border-radius: var(--border-radius);
		box-shadow: var(--box-shadow);
		transition: transform 0.2s;
	}

	.game-card:hover {
		transform: translateY(-3px);
	}

	.card-icon {
		aspect-ratio: 1 / 1;
		background-size: cover;
		background-position: center;
		background-color: var(--input-bg);
		border-top-left-radius: var(--border-radius);
		border-top-right-radius: var(--border-radius);
	}

	.card-info {
		flex-grow: 1;
		padding: 1rem;
	}

	.card-title {
		margin: 0 0 0.75rem;
		font-weight: 600;
	}

	.versions-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.version-tag {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 4px 8px;
		font-size: 0.8rem;
		font-weight: 500;
		background-color: var(--input-bg);
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
		border-radius: 6px;
	}

	.version-tag:hover {
		border-color: var(--primary-color);
		color: var(--primary-color);
	}

	.empty-state {
		padding: 4rem 2rem;
		text-align: center;
		background-color: var(--surface-color);
		border: 2px dashed var(--border-color);
		border-radius: var(--border-radius);
	}
</style>
