<script>
	import Icon from "@iconify/svelte";
	import { createImageSet } from "$lib/image";
	import { preferences } from "$lib/stores/preferences";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { tick } from "svelte";
	import { fade, fly, scale } from "svelte/transition";
	import { cubicOut } from "svelte/easing";

	let { data } = $props();

	let games = $derived(data.games || []);
	let pagination = $derived(data.pagination);
	let session = $derived(data.session);
	let sortBy = $derived(data.sortBy);
	let impactStats = $derived(data.impactStats || {});

	let pageHeader;

	async function changePage(newPage) {
		const url = new URL(page.url);
		url.searchParams.set("page", newPage.toString());
		await goto(url.toString(), { noScroll: true });
		window.scrollTo({ top: 0, behavior: "smooth" });
		await tick();
		pageHeader?.focus();
	}

	function toggleSort() {
		const url = new URL(page.url);
		const newSort = sortBy === "requests" ? "default" : "requests";
		url.searchParams.set("sort", newSort);
		url.searchParams.set("page", "1");
		goto(url.toString());
	}

	function formatNumber(num) {
		if (num >= 1000) return (num / 1000).toFixed(1) + "k";
		return num || 0;
	}
</script>

<svelte:head>
	<title>Contribute - Switch Performance</title>
	<meta
		name="description"
		content="Help build the most comprehensive Nintendo Switch performance database. Contribute FPS data, resolution details, and graphics settings for games."
	/>
</svelte:head>

<div class="contribute-page" bind:this={pageHeader} tabindex="-1">
	<!-- Hero Section -->
	<section class="hero-section">
		<div class="hero-bg"></div>
		<div class="hero-content">
			<div class="badge" in:fly={{ y: -20, duration: 800 }}>
				<Icon icon="mdi:star" />
				<span>Community Driven</span>
			</div>
			<h1 in:fly={{ y: 20, duration: 800, delay: 100 }}>
				Power the <span class="gradient-text">Database</span>
			</h1>
			<p in:fly={{ y: 20, duration: 800, delay: 200 }}>
				Join thousands of contributors making Switch gaming better for
				everyone. Your data helps others find the best settings.
			</p>

			<!-- Impact Stats Grid -->
			<div class="stats-grid">
				<div
					class="stat-card"
					in:scale={{
						duration: 600,
						delay: 400,
						start: 0.9,
						easing: cubicOut,
					}}
				>
					<div class="stat-icon">
						<Icon icon="mdi:account-group" />
					</div>
					<div class="stat-value">
						{formatNumber(impactStats.totalContributors)}
					</div>
					<div class="stat-label">Contributors</div>
				</div>
				<div
					class="stat-card"
					in:scale={{
						duration: 600,
						delay: 500,
						start: 0.9,
						easing: cubicOut,
					}}
				>
					<div class="stat-icon">
						<Icon icon="mdi:database-check" />
					</div>
					<div class="stat-value">
						{formatNumber(impactStats.totalUpdates)}
					</div>
					<div class="stat-label">Reports Filed</div>
				</div>
				<div
					class="stat-card"
					in:scale={{
						duration: 600,
						delay: 600,
						start: 0.9,
						easing: cubicOut,
					}}
				>
					<div class="stat-icon"><Icon icon="mdi:fire" /></div>
					<div class="stat-value">
						{formatNumber(impactStats.totalRequests)}
					</div>
					<div class="stat-label">Total Requests</div>
				</div>
			</div>
		</div>
	</section>

	<main class="main-content">
		{#if !session?.user}
			<div class="auth-promo" in:fade={{ duration: 1000, delay: 800 }}>
				<div class="promo-content">
					<h2>Start your Journey</h2>
					<p>
						Sign in with GitHub to submit performance data, unlock
						badges, and track your contributions to the community.
					</p>
					<form action="/auth/signin/github" method="post">
						<button type="submit" class="github-btn">
							<Icon icon="mdi:github" />
							<span>Sign In with GitHub</span>
						</button>
					</form>
				</div>
				<div class="promo-features">
					<div class="feature">
						<Icon icon="mdi:check-circle" />
						<span>Quick Submissions</span>
					</div>
					<div class="feature">
						<Icon icon="mdi:check-circle" />
						<span>Community Badges</span>
					</div>
					<div class="feature">
						<Icon icon="mdi:check-circle" />
						<span>Impact Tracking</span>
					</div>
				</div>
			</div>
		{:else}
			<div class="view-header">
				<div class="view-title">
					<h2>Help Wanted</h2>
					<p>Games currently missing performance or graphics data</p>
				</div>

				<div class="view-controls">
					<div class="sort-group">
						<button
							class="sort-pill"
							class:active={sortBy !== "requests"}
							onclick={() => {
								const url = new URL(page.url);
								url.searchParams.set("sort", "default");
								url.searchParams.set("page", "1");
								goto(url.toString());
							}}
						>
							<Icon icon="mdi:sort-variant" />
							<span>Default</span>
						</button>
						<button
							class="sort-pill"
							class:active={sortBy === "requests"}
							onclick={() => {
								const url = new URL(page.url);
								url.searchParams.set("sort", "requests");
								url.searchParams.set("page", "1");
								goto(url.toString());
							}}
						>
							<Icon icon="mdi:fire" />
							<span>Hot</span>
						</button>
					</div>
				</div>
			</div>

			{#if games.length > 0}
				<div class="impact-list">
					{#each games as game, i (game.id)}
						{@const iconSet = createImageSet(game.iconUrl, {
							highRes: $preferences.highResImages,
							thumbnailWidth: 120,
						})}
						<div
							in:fly={{
								y: 20,
								duration: 400,
								delay: 50 * Math.min(i, 10),
							}}
						>
							<a
								href={`/contribute/${game.id}`}
								class="contribution-card"
							>
								{#if iconSet}
									<div class="card-icon">
										<img
											src={iconSet.src}
											srcset={iconSet.srcset}
											alt=""
											loading="lazy"
										/>
									</div>
								{:else}
									<div class="card-icon placeholder">
										<Icon icon="mdi:image-off" />
									</div>
								{/if}

								<div class="card-body">
									<h3 class="game-name">{game.names[0]}</h3>
									<div class="game-meta">
										<span class="game-id">{game.id}</span>
										{#if Number(game.requestCount) > 0}
											<div class="request-pill">
												<Icon icon="mdi:fire" />
												<span
													>{game.requestCount} Requests</span
												>
											</div>
										{/if}
									</div>
								</div>

								<div class="card-action">
									<span>Contribute</span>
									<Icon icon="mdi:arrow-right" />
								</div>
							</a>
						</div>
					{/each}
				</div>

				{#if pagination && pagination.totalPages > 1}
					<nav class="premium-pagination">
						<button
							class="page-btn"
							disabled={pagination.currentPage <= 1}
							onclick={() =>
								changePage(pagination.currentPage - 1)}
						>
							<Icon icon="mdi:chevron-left" />
							<span>Prev</span>
						</button>

						<div class="page-indicator">
							<span class="current">{pagination.currentPage}</span
							>
							<span class="total">/ {pagination.totalPages}</span>
						</div>

						<button
							class="page-btn"
							disabled={pagination.currentPage >=
								pagination.totalPages}
							onclick={() =>
								changePage(pagination.currentPage + 1)}
						>
							<span>Next</span>
							<Icon icon="mdi:chevron-right" />
						</button>
					</nav>
				{/if}
			{:else}
				<div class="all-clear" in:fade>
					<div class="clear-icon">
						<Icon icon="mdi:check-decagram" />
					</div>
					<h3>Database Complete!</h3>
					<p>
						Every game currently has data. Check back later for new
						releases.
					</p>
				</div>
			{/if}
		{/if}
	</main>
</div>

<style>
	.contribute-page {
		min-height: 100vh;
		background: var(--background-color);
	}

	.contribute-page:focus {
		outline: none;
	}

	/* --- Hero Section --- */
	.hero-section {
		position: relative;
		padding: 5rem 1.5rem 6rem;
		text-align: center;
		overflow: hidden;
		background: #0d1117;
	}

	.hero-bg {
		position: absolute;
		inset: 0;
		background: radial-gradient(
				circle at 20% 30%,
				rgba(var(--primary-color-rgb, 226, 31, 38), 0.15) 0%,
				transparent 50%
			),
			radial-gradient(
				circle at 80% 70%,
				rgba(var(--accent-color-rgb, 31, 162, 255), 0.1) 0%,
				transparent 50%
			);
		opacity: 0.6;
	}

	.hero-content {
		position: relative;
		z-index: 1;
		max-width: 800px;
		margin: 0 auto;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background: rgba(255, 255, 255, 0.05);
		backdrop-filter: blur(10px);
		padding: 6px 14px;
		border-radius: 99px;
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--primary-color);
		border: 1px solid rgba(255, 255, 255, 0.1);
		margin-bottom: 2rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.hero-section h1 {
		font-size: clamp(2.5rem, 8vw, 4rem);
		font-weight: 900;
		line-height: 1.1;
		margin-bottom: 1.5rem;
		letter-spacing: -0.03em;
		color: white;
	}

	.gradient-text {
		background: linear-gradient(
			135deg,
			var(--primary-color) 0%,
			#ff6b6b 100%
		);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.hero-section p {
		font-size: 1.25rem;
		color: rgba(255, 255, 255, 0.7);
		margin-bottom: 3.5rem;
		line-height: 1.6;
		max-width: 600px;
		margin-left: auto;
		margin-right: auto;
	}

	/* --- Stats Grid --- */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
		margin-top: 2rem;
	}

	.stat-card {
		background: rgba(255, 255, 255, 0.03);
		backdrop-filter: blur(16px);
		border: 1px solid rgba(255, 255, 255, 0.08);
		padding: 1.5rem;
		border-radius: 20px;
		transition: transform 0.3s ease;
	}

	.stat-card:hover {
		transform: translateY(-5px);
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.15);
	}

	.stat-icon {
		font-size: 1.5rem;
		color: var(--primary-color);
		margin-bottom: 0.75rem;
	}

	.stat-value {
		font-size: 1.75rem;
		font-weight: 800;
		color: white;
		margin-bottom: 0.25rem;
	}

	.stat-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.4);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	@media (max-width: 640px) {
		.stats-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
	}

	/* --- Main Content --- */
	.main-content {
		max-width: 1000px;
		margin: -3rem auto 5rem;
		padding: 0 1.5rem;
		position: relative;
		z-index: 2;
	}

	/* --- Auth Promo --- */
	.auth-promo {
		background: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: 24px;
		display: grid;
		grid-template-columns: 1.5fr 1fr;
		overflow: hidden;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
	}

	.promo-content {
		padding: 3.5rem;
	}

	.promo-content h2 {
		font-size: 2rem;
		margin-bottom: 1rem;
	}

	.promo-content p {
		color: var(--text-secondary);
		font-size: 1.1rem;
		line-height: 1.6;
		margin-bottom: 2.5rem;
	}

	.github-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		background: #24292f;
		color: white;
		padding: 14px 28px;
		border-radius: 12px;
		font-weight: 700;
		border: none;
		cursor: pointer;
		transition: all 0.2s;
	}

	.github-btn:hover {
		background: #1a1e22;
		transform: translateY(-2px);
		box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
	}

	.promo-features {
		background: rgba(255, 255, 255, 0.02);
		padding: 3.5rem;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 1.5rem;
		border-left: 1px solid var(--border-color);
	}

	.feature {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-weight: 600;
		font-size: 1rem;
		color: var(--text-primary);
	}

	.feature :global(svg) {
		color: #10b981;
		font-size: 1.25rem;
	}

	@media (max-width: 800px) {
		.auth-promo {
			grid-template-columns: 1fr;
		}
		.promo-features {
			border-left: none;
			border-top: 1px solid var(--border-color);
			padding: 2.5rem;
		}
	}

	/* --- View Header --- */
	.view-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		margin-bottom: 2rem;
		padding: 0 0.5rem;
	}

	.view-title h2 {
		font-size: 1.75rem;
		font-weight: 800;
		margin-bottom: 0.5rem;
	}

	.view-title p {
		color: var(--text-secondary);
		font-size: 1rem;
	}

	.sort-group {
		display: flex;
		background: var(--input-bg);
		padding: 4px;
		border-radius: 14px;
		border: 1px solid var(--border-color);
	}

	.sort-pill {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 6px 16px;
		border-radius: 10px;
		background: transparent;
		border: none;
		color: var(--text-secondary);
		font-weight: 700;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.sort-pill:hover:not(.active) {
		color: var(--text-primary);
		background: rgba(255, 255, 255, 0.05);
	}

	.sort-pill.active {
		background: var(--primary-color);
		color: white;
		box-shadow: 0 4px 12px rgba(var(--primary-color-rgb, 226, 31, 38), 0.3);
	}

	/* --- Contribution Cards --- */
	.impact-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.contribution-card {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		padding: 1.25rem;
		background: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: 20px;
		text-decoration: none;
		color: inherit;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.contribution-card:hover {
		transform: translateX(8px);
		border-color: var(--primary-color);
		background: color-mix(
			in srgb,
			var(--primary-color) 3%,
			var(--surface-color)
		);
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
	}

	.card-icon {
		width: 72px;
		height: 72px;
		border-radius: 16px;
		overflow: hidden;
		flex-shrink: 0;
		background: var(--input-bg);
	}

	.card-icon img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.card-icon.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-secondary);
		font-size: 1.5rem;
	}

	.card-body {
		flex: 1;
		min-width: 0;
	}

	.game-name {
		font-size: 1.2rem;
		font-weight: 700;
		margin-bottom: 0.35rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.game-meta {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.game-id {
		font-family: monospace;
		font-size: 0.8rem;
		color: var(--text-secondary);
		opacity: 0.7;
	}

	.request-pill {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 4px 10px;
		background: rgba(245, 158, 11, 0.1);
		color: #f59e0b;
		border-radius: 99px;
		font-size: 0.75rem;
		font-weight: 700;
	}

	.card-action {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 700;
		color: var(--primary-color);
		opacity: 0;
		transform: translateX(-10px);
		transition: all 0.3s ease;
	}

	.contribution-card:hover .card-action {
		opacity: 1;
		transform: translateX(0);
	}

	@media (max-width: 640px) {
		.card-action {
			display: none;
		}
		.contribution-card {
			gap: 1rem;
		}
		.card-icon {
			width: 60px;
			height: 60px;
		}
	}

	/* --- Pagination --- */
	.premium-pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 2rem;
		margin-top: 4rem;
	}

	.page-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 10px 20px;
		border-radius: 12px;
		background: var(--surface-color);
		border: 1px solid var(--border-color);
		color: var(--text-primary);
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s;
	}

	.page-btn:hover:not(:disabled) {
		border-color: var(--primary-color);
		background: var(--input-bg);
	}

	.page-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.page-indicator {
		display: flex;
		align-items: baseline;
		gap: 0.25rem;
	}

	.current {
		font-size: 1.5rem;
		font-weight: 900;
		color: var(--primary-color);
	}

	.total {
		font-size: 0.9rem;
		color: var(--text-secondary);
		font-weight: 600;
	}

	/* --- All Clear --- */
	.all-clear {
		text-align: center;
		padding: 5rem 2rem;
		background: var(--surface-color);
		border-radius: 32px;
		border: 2px dashed var(--border-color);
	}

	.clear-icon {
		font-size: 4rem;
		color: #10b981;
		margin-bottom: 1.5rem;
	}

	.all-clear h3 {
		font-size: 2rem;
		margin-bottom: 0.75rem;
	}

	.all-clear p {
		color: var(--text-secondary);
		font-size: 1.1rem;
		max-width: 400px;
		margin: 0 auto;
	}
</style>
