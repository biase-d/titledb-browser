<script>
	import Icon from "@iconify/svelte";
	import { page } from "$app/state";
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	const badges = [
		{ threshold: 500, name: 'Creative Right Hand', color: '#fde047', icon: 'mdi:hand-back-right' },
		{ threshold: 400, name: 'Ancient Angel Borb', color: '#d1d5db', icon: 'mdi:shield-star' },
		{ threshold: 300, name: 'Big Purple Pterodactyl', color: '#8b5cf6', icon: 'mdi:bird' },
		{ threshold: 200, name: 'King K. Roolish', color: '#facc15', icon: 'mdi:crown' },
		{ threshold: 100, name: 'Evil Gray Twin', color: '#4f46e5', icon: 'mdi:sword-cross' },
		{ threshold: 50, name: 'Big Buff Croc', color: '#78716c', icon: 'mdi:arm-flex' },
		{ threshold: 30, name: 'Spooky Robe Guy', color: '#e11d48', icon: 'mdi:ghost' },
		{ threshold: 15, name: 'Floating Brain Jelly', color: '#f59e0b', icon: 'mdi:jellyfish' },
		{ threshold: 5, name: 'Grumpy Gator', color: '#16a34a', icon: 'mdi:alligator' },
		{ threshold: 1, name: 'Shroom Stomper', color: '#a16207', icon: 'mdi:mushroom' }
	];

	let { data } = $props();
	
	let username = $derived(data.username);
	let contributions = $derived(data.contributions || []);
	let totalContributions = $derived(data.totalContributions || 0);
	let sessionUser = $derived(data.session?.user);
	let isOwnProfile = $derived(sessionUser?.login?.toLowerCase() === username.toLowerCase());
	let currentTierName = $derived(data.currentTierName);
	let pagination = $derived(data.pagination);
	
	let nextBadge = $derived(badges.slice().reverse().find(badge => totalContributions < badge.threshold));
	let progressToNext = $derived(nextBadge ? Math.floor((totalContributions / nextBadge.threshold) * 100) : 100);

	let viewMode = $state('grid');

	onMount(() => {
		const savedView = localStorage.getItem('profileViewMode');
		if (savedView === 'grid' || savedView === 'list') viewMode = savedView;
	});

	$effect(() => {
		if (browser) localStorage.setItem('profileViewMode', viewMode);
	});

	function changePage(newPage) {
		const url = new URL(page.url);
		url.searchParams.set('page', newPage.toString());
		goto(url, { keepData: false, noScroll: true });
	}
</script>

<svelte:head>
	<title>{username}'s Profile - Titledb Browser</title>
</svelte:head>

<div class="profile-container">
	<div 
		class="profile-card"
		data-tier={currentTierName?.toLowerCase().replace(/\s+/g, '-')}
	>
		<div class="profile-header">
			{#if isOwnProfile && sessionUser?.image}
				<img src={sessionUser.image} alt={username} class="avatar" />
			{/if}
			<div class="header-text">
				<div class="title-with-badges">
					<h1>{username}</h1>
					<div class="badges-header-container">
						{#each badges as badge}
							{#if totalContributions >= badge.threshold}
								<span class="badge" style="--badge-color: {badge.color};" title="{badge.name} ({badge.threshold}+ contributions)">
									<Icon icon={badge.icon} />
								</span>
							{/if}
						{/each}
					</div>
				</div>
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
				<span class="stat-value">{pagination?.totalItems || 0}</span>
				<span class="stat-label">Unique Games</span>
			</div>
		</div>
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

	<div class="section-header">
		<h2 class="section-title">Contributions</h2>
		<div class="view-switcher">
			<button class:active={viewMode === 'list'} onclick={() => viewMode = 'list'} title="List View"><Icon icon="mdi:view-list" /></button>
			<button class:active={viewMode === 'grid'} onclick={() => viewMode = 'grid'} title="Grid View"><Icon icon="mdi:view-grid" /></button>
		</div>
	</div>

	{#if contributions.length > 0}
		<div class="contributions-container {viewMode}">
			{#each contributions as item (item.game.id)}
				{#if viewMode === 'list'}
					<a href={`/title/${item.game.id}`} class="list-item">
						<div class="list-item-info">
							<p class="list-item-title">{item.game.name}</p>
							<div class="card-tags">
								{#each item.versions as v}
									<div class="version-tag-wrapper">
										<Icon icon="mdi:chart-line-variant" /> v{v.version}
									</div>
								{/each}
								{#if item.hasGraphics}
									<span class="info-tag"><Icon icon="mdi:palette-outline" /> Graphics</span>
								{/if}
								{#if item.hasYoutube}
									<span class="info-tag"><Icon icon="mdi:youtube" /> Videos</span>
								{/if}
							</div>
						</div>
					</a>
				{:else}
					<a href={`/title/${item.game.id}`} class="game-card">
						<div class="card-icon" style="background-image: url({item.game.iconUrl || '/favicon.svg'})"></div>
						<div class="card-info">
							<p class="card-title">{item.game.name}</p>
							<div class="card-tags">
								{#each item.versions as v}
									<div
										class="version-tag"
										role="link"
										tabindex="0"
										onclick={(e) => {
											e.stopPropagation();
											window.open(v.sourcePrUrl, '_blank');
										}}
										onkeydown={(e) => {
											if (e.key === 'Enter') {
												e.stopPropagation();
												window.open(v.sourcePrUrl, '_blank');
											}
										}}
									>
										<Icon icon="mdi:chart-line-variant" /> v{v.version}
									</div>
								{/each}
								{#if item.hasGraphics}
									<span class="info-tag"><Icon icon="mdi:palette-outline" /> Graphics</span>
								{/if}
								{#if item.hasYoutube}
									<span class="info-tag"><Icon icon="mdi:youtube" /> Videos</span>
								{/if}
							</div>
						</div>
					</a>
				{/if}
			{/each}
		</div>
	{:else}
		<div class="empty-state">
			<h2>No Contributions Yet</h2>
			<p>{username} hasn't submitted any performance data that has been merged.</p>
		</div>
	{/if}
	
	{#if pagination && pagination.totalPages > 1}
		<div class="pagination">
			<button disabled={pagination.currentPage <= 1} onclick={() => changePage(pagination.currentPage - 1)}>← Previous</button>
			<span>Page {pagination.currentPage} of {pagination.totalPages}</span>
			<button disabled={pagination.currentPage >= pagination.totalPages} onclick={() => changePage(pagination.currentPage + 1)}>Next →</button>
		</div>
	{/if}
</div>

<style>
	@keyframes glow {
		from { box-shadow: 0 0 2px 0px var(--glow-color); }
		to { box-shadow: 0 0 8px 2px var(--glow-color); }
	}

	.profile-container {
		max-width: 1024px;
		margin: 0 auto;
	}

	.profile-card {
		position: relative;
		padding: 1.5rem;
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
		transition: border-color 0.3s ease;
		background-color: var(--surface-color);
		margin-bottom: 2rem;
	}
	@media(min-width: 640px) {
		.profile-card {
			padding: 2rem;
		}
	}

	/* Tier-based animated borders using data attributes */
	.profile-card[data-tier="spooky-robe-guy"] { border-color: #e11d48; }
	.profile-card[data-tier="evil-gray-twin"] { border-color: #4f46e5; }
	.profile-card[data-tier="big-purple-pterodactyl"] {
		--glow-color: #8b5cf655;
		animation: glow 3s infinite alternate ease-in-out;
		border-color: #8b5cf6;
	}
	.profile-card[data-tier="creative-right-hand"] {
		--glow-color: #fde04755;
		animation: glow 2.5s infinite alternate ease-in-out;
		border-color: #fde047;
	}
	.profile-card[data-tier="ancient-angel-borb"] {
		--glow-color: #d1d5db55;
		animation: glow 3.5s infinite alternate ease-in-out;
		border-color: #d1d5db;
	}

	.profile-header {
		display: flex;
		align-items: flex-start; /* Align to top for wrapping badges */
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
	
	.title-with-badges {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-bottom: 0.25rem;
	}

	.badges-header-container {
		display: flex;
		gap: 0.5rem;
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
	
	.badge {
		font-size: 1.5rem;
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

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin: 2.5rem 0 1.5rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--border-color);
	}

	.section-title {
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0;
	}

	.view-switcher {
		display: flex;
		gap: 0.5rem;
	}

	.view-switcher button {
		padding: 0.5rem;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		background: none;
		color: var(--text-secondary);
		cursor: pointer;
		line-height: 1;
	}

	.view-switcher button.active {
		background-color: var(--primary-color);
		border-color: var(--primary-color);
		color: white;
	}
	
	.contributions-container.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 1.5rem;
	}
	
	.contributions-container.list .list-item {
		display: flex;
		align-items: center;
		padding: 1rem;
		background-color: var(--surface-color);
		border-bottom: 1px solid var(--border-color);
	}

	.list-item-title {
		font-weight: 600;
		margin: 0 0 0.5rem 0;
	}
	
	.version-tag-wrapper {
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

	.card-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: auto;
	}

	.version-tag,
	.info-tag {
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

	.version-tag {
		color: var(--primary-color);
		border-color: var(--primary-color);
		cursor: pointer;
	}

	.version-tag:hover {
		background-color: var(--primary-color);
		color: white;
	}

	.info-tag {
		background-color: var(--input-bg);
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
	}

	.empty-state {
		padding: 4rem 2rem;
		text-align: center;
		background-color: var(--surface-color);
		border: 2px dashed var(--border-color);
		border-radius: var(--border-radius);
	}
	
	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		margin-top: 2.5rem;
	}

	.pagination button {
		padding: 8px 16px;
		font-weight: 500;
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		color: var(--primary-color);
		border-radius: 6px;
		cursor: pointer;
	}

	.pagination button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>