<script>
	import Icon from "@iconify/svelte";
	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";
	import { browser } from "$app/environment";
	import CanvasFlair from "./CanvasFlair.svelte";
	import { slide, fade, fly } from "svelte/transition";
	import { cubicOut } from "svelte/easing";

	const badges = [
		{
			threshold: 500,
			name: "Creative Right Hand",
			color: "#fde047",
			icon: "mdi:hand-back-right",
		},
		{
			threshold: 400,
			name: "Ancient Angel Borb",
			color: "#d1d5db",
			icon: "mdi:shield-star",
		},
		{
			threshold: 300,
			name: "Big Purple Pterodactyl",
			color: "#8b5cf6",
			icon: "mdi:bird",
		},
		{
			threshold: 200,
			name: "King K. Roolish",
			color: "#facc15",
			icon: "mdi:crown",
		},
		{
			threshold: 100,
			name: "Evil Gray Twin",
			color: "#4f46e5",
			icon: "mdi:sword-cross",
		},
		{
			threshold: 50,
			name: "Big Buff Croc",
			color: "#78716c",
			icon: "mdi:arm-flex",
		},
		{
			threshold: 30,
			name: "Spooky Robe Guy",
			color: "#e11d48",
			icon: "mdi:ghost",
		},
		{
			threshold: 15,
			name: "Floating Brain Jelly",
			color: "#f59e0b",
			icon: "mdi:jellyfish",
		},
		{
			threshold: 5,
			name: "Grumpy Gator",
			color: "#16a34a",
			icon: "mdi:alligator",
		},
		{
			threshold: 1,
			name: "Shroom Stomper",
			color: "#a16207",
			icon: "mdi:mushroom",
		},
	];

	let { data } = $props();

	let username = $derived(data.username);
	let contributions = $derived(data.contributions || []);
	let totalContributions = $derived(data.totalContributions || 0);
	let sessionUser = $derived(data.session?.user);
	let isOwnProfile = $derived(
		sessionUser?.login?.toLowerCase() === username.toLowerCase(),
	);
	let currentTierName = $derived(data.currentTierName);
	let pagination = $derived(data.pagination);

	let currentTierBadge = $derived(
		badges.find((b) => b.name === currentTierName),
	);

	let nextBadge = $derived(
		badges
			.slice()
			.reverse()
			.find((badge) => totalContributions < badge.threshold),
	);
	let progressToNext = $derived(
		nextBadge
			? Math.floor((totalContributions / nextBadge.threshold) * 100)
			: 100,
	);

	let viewMode = $state("grid");

	onMount(() => {
		const savedView = localStorage.getItem("profileViewMode");
		if (savedView === "grid" || savedView === "list") viewMode = savedView;
	});

	$effect(() => {
		if (browser) localStorage.setItem("profileViewMode", viewMode);
	});

	function changePage(newPage) {
		const url = new URL(page.url);
		url.searchParams.set("page", newPage.toString());
		goto(url, { keepData: false, noScroll: true });
	}

	function handleSignOut() {
		const form = document.createElement("form");
		form.method = "POST";
		form.action = "/auth/signout";
		document.body.appendChild(form);
		form.submit();
	}
</script>

<svelte:head>
	<title>{username}'s Profile - Switch Performance</title>
</svelte:head>

<div class="profile-container">
	<div class="profile-content-wrapper" in:fade={{ duration: 400 }}>
		<!-- Hero Section -->
		<div
			class="profile-hero"
			data-tier={currentTierName?.toLowerCase().replace(/\s+/g, "-")}
		>
			<div class="hero-background">
				{#if data.featuredGame?.iconUrl}
					<img
						src={data.featuredGame.iconUrl}
						alt=""
						class="blurred-bg"
					/>
				{:else if contributions[0]?.game?.iconUrl}
					<img
						src={contributions[0].game.iconUrl}
						alt=""
						class="blurred-bg"
					/>
				{/if}
				<div class="overlay-gradient"></div>
			</div>

			{#if currentTierBadge}
				<div class="canvas-container">
					<CanvasFlair
						tier={currentTierBadge}
						animated={currentTierBadge.threshold >= 50}
					/>
				</div>
			{/if}

			<div class="hero-content">
				<div class="user-info">
					<div class="user-avatar-wrapper">
						{#if data.githubAvatarUrl}
							<img
								src={data.githubAvatarUrl}
								alt="{username}'s GitHub avatar"
								class="user-avatar"
								onerror={(e) => {
									e.currentTarget.style.display = "none";
									e.currentTarget.nextElementSibling.style.display =
										"flex";
								}}
							/>
						{/if}
						<div
							class="user-avatar-placeholder"
							style="display: {data.githubAvatarUrl
								? 'none'
								: 'flex'}"
						>
							<Icon
								icon="mdi:account-circle"
								width="80"
								height="80"
							/>
						</div>
					</div>
					<div class="user-details">
						<div class="name-badge-row">
							<h1>{username}</h1>
							{#if currentTierBadge}
								<span
									class="tier-badge"
									style="--tier-color: {currentTierBadge.color}"
								>
									<Icon icon={currentTierBadge.icon} />
									{currentTierName}
								</span>
							{/if}
						</div>

						<div class="badges-row">
							{#each badges
								.filter((b) => totalContributions >= b.threshold)
								.slice(0, 8) as badge}
								<div
									class="mini-badge"
									style="--badge-color: {badge.color}"
									title={badge.name}
								>
									<Icon icon={badge.icon} />
								</div>
							{/each}
						</div>
					</div>
				</div>

				{#if isOwnProfile}
					<button class="action-btn logout" onclick={handleSignOut}>
						<Icon icon="mdi:logout" />
						<span>Sign Out</span>
					</button>
				{/if}
			</div>

			<!-- Bento Stats -->
			<div class="bento-stats">
				<div class="stat-card primary">
					<div class="stat-icon">
						<Icon icon="mdi:chart-line" width="32" height="32" />
					</div>
					<div class="stat-data">
						<span class="value">{totalContributions}</span>
						<span class="label">Approved Contributions</span>
					</div>
				</div>

				<div class="stat-card">
					<div class="stat-icon">
						<Icon
							icon="mdi:nintendo-switch"
							width="28"
							height="28"
						/>
					</div>
					<div class="stat-data">
						<span class="value">{pagination?.totalItems || 0}</span>
						<span class="label">Unique Games</span>
					</div>
				</div>

				{#if nextBadge}
					<div class="stat-card progress">
						<div class="progress-header">
							<span class="label"
								>Progress to <strong>{nextBadge.name}</strong
								></span
							>
							<span class="percentage">{progressToNext}%</span>
						</div>
						<div class="progress-track">
							<div
								class="progress-fill"
								style="width: {progressToNext}%"
							></div>
						</div>
						<span class="sub-label"
							>{totalContributions} / {nextBadge.threshold} points</span
						>
					</div>
				{/if}
			</div>
		</div>

		<!-- Contributions Section -->
		<div class="content-section">
			<div class="section-header">
				<div class="title-block">
					<h2>Recent Contributions</h2>
					<span class="count"
						>{pagination?.totalItems || 0} merged titles</span
					>
				</div>

				<div class="view-controls">
					<button
						class="view-btn"
						class:active={viewMode === "list"}
						onclick={() => (viewMode = "list")}
						aria-label="List view"
					>
						<Icon icon="mdi:view-list" />
					</button>
					<button
						class="view-btn"
						class:active={viewMode === "grid"}
						onclick={() => (viewMode = "grid")}
						aria-label="Grid view"
					>
						<Icon icon="mdi:view-grid" />
					</button>
				</div>
			</div>

			{#if contributions.length > 0}
				<div class="contributions-layout {viewMode}">
					{#each contributions as item (item.game.id)}
						<a
							href={`/title/${item.game.id}`}
							class="contrib-card {viewMode}"
						>
							<div class="game-icon-wrapper">
								<img
									src={item.game.iconUrl || "/favicon.svg"}
									alt=""
									class="game-icon"
									loading="lazy"
								/>
							</div>

							<div class="card-body">
								<h3 class="game-title">{item.game.name}</h3>

								<div class="tag-cloud">
									{#each item.versions as v}
										<span class="tag version">
											<Icon
												icon="mdi:chart-line-variant"
											/>
											v{v.version}
										</span>
									{/each}

									{#if item.hasGraphics}
										<span class="tag graphics">
											<Icon icon="mdi:palette-outline" />
											Graphics
										</span>
									{/if}

									{#if item.hasYoutube}
										<span class="tag video">
											<Icon icon="mdi:youtube" />
											Videos
										</span>
									{/if}
								</div>
							</div>

							<div class="card-arrow">
								<Icon icon="mdi:chevron-right" width="20" />
							</div>
						</a>
					{/each}
				</div>
			{:else}
				<div class="empty-state">
					<Icon
						icon="mdi:database-off-outline"
						width="48"
						height="48"
					/>
					<h3>No Contributions Yet</h3>
					<p>{username} is just getting started on their journey.</p>
				</div>
			{/if}

			{#if pagination && pagination.totalPages > 1}
				<nav class="navigation-bar">
					<button
						class="pager-btn"
						disabled={pagination.currentPage <= 1}
						onclick={() => changePage(pagination.currentPage - 1)}
					>
						<Icon icon="mdi:chevron-left" />
						Previous
					</button>

					<span class="page-info">
						Page <strong>{pagination.currentPage}</strong> of {pagination.totalPages}
					</span>

					<button
						class="pager-btn"
						disabled={pagination.currentPage >=
							pagination.totalPages}
						onclick={() => changePage(pagination.currentPage + 1)}
					>
						Next
						<Icon icon="mdi:chevron-right" />
					</button>
				</nav>
			{/if}
		</div>
	</div>
</div>

<style>
	.profile-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1.5rem;
		min-height: 100vh;
	}

	@media (min-width: 768px) {
		.profile-container {
			padding: 3rem 2rem;
		}
	}

	.profile-content-wrapper {
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
	}

	/* Hero Section REDESIGN */
	.profile-hero {
		position: relative;
		padding: 3rem 2rem;
		border-radius: 32px;
		background: var(--surface-color);
		border: 1px solid var(--border-color);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		gap: 3rem;
		box-shadow: var(--shadow-xl);
	}

	.hero-background {
		position: absolute;
		inset: 0;
		z-index: 0;
	}

	.blurred-bg {
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: blur(80px) saturate(2);
		opacity: 0.15;
		transform: scale(1.1);
	}

	.overlay-gradient {
		position: absolute;
		inset: 0;
		background: radial-gradient(
				circle at top left,
				var(--primary-color) 0%,
				transparent 40%
			),
			linear-gradient(
				to bottom,
				transparent 0%,
				var(--surface-color) 100%
			);
		opacity: 0.05;
	}

	.canvas-container {
		position: absolute;
		inset: 0;
		pointer-events: none;
		opacity: 0.6;
	}

	.hero-content {
		position: relative;
		z-index: 2;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 2rem;
		flex-wrap: wrap;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 2rem;
	}

	.user-avatar-wrapper {
		position: relative;
		width: 100px;
		height: 100px;
		flex-shrink: 0;
	}

	.user-avatar {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 50%;
		border: 2px solid var(--border-color);
		box-shadow: var(--shadow-lg);
	}

	.user-avatar-placeholder {
		width: 100%;
		height: 100%;
		background: var(--input-bg);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-secondary);
		border: 2px solid var(--border-color);
		box-shadow: var(--shadow-lg);
	}

	.user-details h1 {
		margin: 0;
		font-size: 3rem;
		font-weight: 900;
		letter-spacing: -0.04em;
		background: linear-gradient(
			135deg,
			var(--text-primary) 0%,
			var(--text-secondary) 100%
		);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.name-badge-row {
		display: flex;
		align-items: baseline;
		gap: 1.5rem;
		flex-wrap: wrap;
	}

	.tier-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 6px 14px;
		border-radius: 99px;
		background: color-mix(in srgb, var(--tier-color) 15%, transparent);
		color: var(--tier-color);
		font-weight: 800;
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border: 1px solid color-mix(in srgb, var(--tier-color) 30%, transparent);
	}

	.badges-row {
		display: flex;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.mini-badge {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 10px;
		background: var(--input-bg);
		color: var(--badge-color);
		border: 1px solid var(--border-color);
		transition: all 0.2s;
	}

	.mini-badge:hover {
		transform: translateY(-2px);
		background: color-mix(in srgb, var(--badge-color) 10%, var(--input-bg));
		border-color: var(--badge-color);
	}

	.action-btn {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 10px 20px;
		border-radius: 14px;
		border: 1px solid var(--border-color);
		background: var(--input-bg);
		color: var(--text-primary);
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.action-btn:hover {
		background: var(--border-color);
		border-color: var(--text-secondary);
	}

	.action-btn.logout:hover {
		color: #ef4444;
		border-color: #ef444433;
		background: #ef444411;
	}

	/* Bento Stats Layout */
	.bento-stats {
		position: relative;
		z-index: 2;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.5rem;
	}

	.stat-card {
		padding: 1.5rem;
		border-radius: 20px;
		background: var(--background-color);
		border: 1px solid var(--border-color);
		display: flex;
		align-items: center;
		gap: 1.5rem;
		transition: all 0.3s;
	}

	.stat-card.primary {
		background: linear-gradient(
			135deg,
			color-mix(
					in srgb,
					var(--primary-color) 10%,
					var(--background-color)
				)
				0%,
			var(--background-color) 100%
		);
		border-color: color-mix(
			in srgb,
			var(--primary-color) 20%,
			var(--border-color)
		);
	}

	.stat-icon {
		width: 56px;
		height: 56px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 14px;
		background: var(--input-bg);
		color: var(--primary-color);
	}

	.stat-data {
		display: flex;
		flex-direction: column;
	}

	.stat-data .value {
		font-size: 2rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1;
	}

	.stat-data .label {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
		margin-top: 4px;
	}

	.stat-card.progress {
		flex-direction: column;
		align-items: stretch;
		gap: 1rem;
		padding: 1.5rem;
	}

	.progress-header {
		display: flex;
		justify-content: space-between;
		font-size: 0.85rem;
	}

	.progress-track {
		height: 10px;
		background: var(--input-bg);
		border-radius: 10px;
		overflow: hidden;
		border: 1px solid var(--border-color);
	}

	.progress-fill {
		height: 100%;
		background: var(--primary-color);
		border-radius: 10px;
		box-shadow: 0 0 10px var(--primary-color);
	}

	.sub-label {
		font-size: 0.75rem;
		color: var(--text-secondary);
		text-align: right;
	}

	/* Content Section */
	.content-section {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		border-bottom: 2px solid var(--border-color);
		padding-bottom: 1rem;
	}

	.title-block h2 {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 800;
		color: var(--text-primary);
	}

	.title-block .count {
		font-size: 0.9rem;
		color: var(--text-secondary);
	}

	.view-controls {
		display: flex;
		gap: 0.5rem;
		background: var(--input-bg);
		padding: 4px;
		border-radius: 10px;
	}

	.view-btn {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		border: none;
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.2s;
	}

	.view-btn:hover {
		color: var(--text-primary);
	}

	.view-btn.active {
		background: var(--surface-color);
		color: var(--primary-color);
		box-shadow: var(--shadow-sm);
	}

	/* Contributions Layout Grid/List */
	.contributions-layout.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1.5rem;
	}

	.contributions-layout.list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.contrib-card {
		background: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: 20px;
		padding: 1rem;
		display: flex;
		gap: 1rem;
		align-items: center;
		text-decoration: none;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.contrib-card:hover {
		border-color: var(--primary-color);
		transform: translateY(-4px);
		box-shadow: var(--shadow-lg);
	}

	.contrib-card.grid {
		flex-direction: column;
		align-items: stretch;
		padding: 1.25rem;
	}

	.game-icon-wrapper {
		width: 54px;
		height: 54px;
		flex-shrink: 0;
		border-radius: 12px;
		overflow: hidden;
		background: var(--input-bg);
		border: 1px solid var(--border-color);
	}

	.contrib-card.grid .game-icon-wrapper {
		width: 100%;
		height: auto;
		aspect-ratio: 1;
		border-radius: 16px;
	}

	.game-icon {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.card-body {
		flex-grow: 1;
		min-width: 0;
	}

	.game-title {
		margin: 0 0 0.5rem;
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.tag-cloud {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.tag {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 4px 8px;
		border-radius: 8px;
		font-size: 0.75rem;
		font-weight: 600;
		background: var(--input-bg);
		border: 1px solid var(--border-color);
		color: var(--text-secondary);
	}

	.tag.version {
		color: var(--primary-color);
		border-color: color-mix(in srgb, var(--primary-color) 30%, transparent);
	}

	.tag.graphics {
		color: #10b981;
	}

	.tag.video {
		color: #ef4444;
	}

	.card-arrow {
		color: var(--text-secondary);
		opacity: 0.3;
		transition: transform 0.2s;
	}

	.contrib-card:hover .card-arrow {
		opacity: 1;
		transform: translateX(4px);
		color: var(--primary-color);
	}

	.navigation-bar {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 2rem;
		margin-top: 1rem;
	}

	.pager-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 10px 20px;
		border-radius: 12px;
		background: var(--surface-color);
		border: 1px solid var(--border-color);
		color: var(--primary-color);
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s;
	}

	.pager-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.pager-btn:not(:disabled):hover {
		background: var(--primary-color);
		color: white;
		border-color: var(--primary-color);
		box-shadow: 0 4px 12px
			color-mix(in srgb, var(--primary-color) 40%, transparent);
	}

	.empty-state {
		padding: 4rem 2rem;
		text-align: center;
		background: var(--surface-color);
		border: 2px dashed var(--border-color);
		border-radius: 24px;
		color: var(--text-secondary);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.empty-state h3 {
		margin: 0;
		color: var(--text-primary);
	}
</style>
