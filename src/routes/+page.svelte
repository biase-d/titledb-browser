<script>
	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import { browser } from "$app/environment";
	import { onMount, onDestroy } from "svelte";
	import { fade, fly } from "svelte/transition";
	import Icon from "@iconify/svelte";
	import ListItem from "./ListItem.svelte";
	import GridItem from "./GridItem.svelte";
	import Drafts from "./Drafts.svelte";
	import { createImageSet } from "$lib/image";
	import { getLocalizedName } from "$lib/i18n";
	import { preferences } from "$lib/stores/preferences";

	let { data } = $props();
	let { randomGames = [] } = $derived(data);

	let results = $derived(data.results);
	let recentUpdates = $derived(data.recentUpdates || []);
	let pagination = $derived(data.pagination);

	// --- State ---
	let search = $state("");
	let dockedFps = $state("");
	let handheldFps = $state("");
	let resolutionType = $state("");
	let regionFilter = $state("");
	let selectedSort = $state("date-desc");
	let currentPage = $state(1);
	let viewMode = $state("list");
	let preferredRegion = $state("US");

	// --- Hero Carousel Logic ---
	let heroIndex = $state(0);
	let carouselTimer;
	let isPaused = $state(false);

	// Derived hero data based on current index
	let featuredGame = $derived(
		recentUpdates.length > 0 ? recentUpdates[heroIndex] : null,
	);
	let heroBanner = $derived(
		featuredGame
			? createImageSet(featuredGame.bannerUrl, {
					highRes: $preferences.highResImages,
					bannerWidth: 1000,
				})
			: null,
	);
	let featuredName = $derived(
		featuredGame
			? getLocalizedName(featuredGame.names, preferredRegion)
			: "",
	);
	let featuredPerformance = $derived(
		featuredGame?.performance || { docked: {}, handheld: {} },
	);

	function startCarousel() {
		if (!browser) return;
		clearInterval(carouselTimer);
		carouselTimer = setInterval(() => {
			if (!isPaused && recentUpdates.length > 0) {
				nextHero();
			}
		}, 6000);
	}

	function nextHero() {
		heroIndex = (heroIndex + 1) % recentUpdates.length;
	}

	function prevHero() {
		heroIndex =
			(heroIndex - 1 + recentUpdates.length) % recentUpdates.length;
	}

	function setHero(index) {
		heroIndex = index;
		startCarousel();
	}

	let debounceTimer;

	onMount(() => {
		const { searchParams } = page.url;
		search = searchParams.get("q") || "";
		dockedFps = searchParams.get("docked_fps") || "";
		handheldFps = searchParams.get("handheld_fps") || "";
		resolutionType = searchParams.get("res_type") || "";
		regionFilter = searchParams.get("region_filter") || "";
		selectedSort =
			searchParams.get("sort") ||
			(search ? "relevance-desc" : "date-desc");
		currentPage = parseInt(searchParams.get("page"), 10) || 1;

		const savedView = localStorage.getItem("viewMode");
		if (savedView === "grid" || savedView === "list") viewMode = savedView;

		preferences.subscribe((p) => (preferredRegion = p.region));

		if (recentUpdates.length > 0) startCarousel();
	});

	onDestroy(() => {
		if (browser) clearInterval(carouselTimer);
	});

	$effect(() => {
		if (browser) localStorage.setItem("viewMode", viewMode);
	});

	function updateData({ resetPage = false } = {}) {
		if (!browser) return;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			const url = new URL(window.location.href);
			if (resetPage) currentPage = 1;

			const updateParam = (key, value, defaultValue = "") => {
				if (value && value.toString() !== defaultValue)
					url.searchParams.set(key, value);
				else url.searchParams.delete(key);
			};

			updateParam("q", search);
			updateParam("docked_fps", dockedFps);
			updateParam("handheld_fps", handheldFps);
			updateParam("res_type", resolutionType);
			updateParam("region_filter", regionFilter);
			updateParam("sort", selectedSort, "date-desc");
			updateParam("page", currentPage, "1");

			if (url.href !== window.location.href) {
				goto(url, {
					replaceState: true,
					noScroll: true,
					keepFocus: true,
				});
			}
		}, 350);
	}

	function changePage(newPage) {
		currentPage = newPage;
		updateData({ resetPage: false });
		if (browser) window.scrollTo({ top: 0, behavior: "smooth" });
	}

	let hasActiveFilters = $derived(
		dockedFps || handheldFps || resolutionType || regionFilter,
	);

	let searchResultText = $derived(
		(() => {
			const count = pagination?.totalItems?.toLocaleString() || 0;
			if (search || hasActiveFilters) {
				return `Found ${count} titles`;
			}
			return "All Titles";
		})(),
	);
</script>

<svelte:head>
	<title>Switch Performance — Nintendo Switch Game Performance Database</title
	>
	<meta
		name="description"
		content="Browse Nintendo Switch game performance data. Find FPS, resolution, and graphics details for thousands of Switch titles."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content={page.url.href} />
	<meta
		property="og:title"
		content="Switch Performance — Nintendo Switch Game Performance Database"
	/>
	<meta
		property="og:description"
		content="Browse Nintendo Switch game performance data. Find FPS, resolution, and graphics details for thousands of Switch titles."
	/>
	<meta property="og:site_name" content="Switch Performance" />
	<link rel="canonical" href={page.url.origin + page.url.pathname} />
	{#if recentUpdates?.[0]?.bannerUrl}
		<link rel="preload" as="image" href={recentUpdates[0].bannerUrl} />
	{/if}
	{@html `<script type="application/ld+json">
	{
		"@context": "https://schema.org",
		"@type": "WebSite",
		"name": "Switch Performance",
		"url": "${page.url.origin}",
		"description": "Browse Nintendo Switch game performance data. Find FPS, resolution, and graphics details for thousands of Switch titles.",
		"potentialAction": {
			"@type": "SearchAction",
			"target": "${page.url.origin}/?q={search_term_string}",
			"query-input": "required name=search_term_string"
		}
	}
	${"<"}/script>`}
</svelte:head>

<main class="main-content">
	{#if data.isLandingPage}
		<!-- Recently Updated Carousel -->
		{#if recentUpdates.length > 0}
			<section
				class="hero-section"
				onmouseenter={() => (isPaused = true)}
				onmouseleave={() => (isPaused = false)}
				aria-label="Featured recently updated games"
				in:fade
			>
				<div class="section-badge">
					<Icon icon="mdi:star" /> Recently Updated
				</div>

				<!-- Background Image -->
				{#key heroIndex}
					{#if heroBanner}
						<div
							class="hero-bg"
							in:fade={{ duration: 600 }}
							out:fade={{ duration: 600 }}
						>
							<img
								src={heroBanner.src}
								srcset={heroBanner.srcset}
								alt=""
							/>
							<div class="hero-overlay"></div>
						</div>
					{/if}
				{/key}

				<!-- Content -->
				<div class="hero-content">
					{#key heroIndex}
						<div
							class="hero-content-inner"
							in:fly={{ y: 20, duration: 400, delay: 200 }}
							out:fade={{ duration: 200 }}
						>
							<div class="hero-badge">
								<Icon icon="mdi:clock-outline" /> Latest Update
							</div>

							<h1>{featuredName}</h1>

							{#if featuredPerformance.docked?.target_fps || featuredPerformance.handheld?.target_fps}
								<div class="hero-performance">
									{#if featuredPerformance.docked?.target_fps}
										<span
											class="perf-badge"
											title="Docked: {featuredPerformance
												.docked.target_fps} FPS"
										>
											<Icon
												icon="mdi:television"
												width="16"
											/>
											{featuredPerformance.docked
												.target_fps === "Unlocked"
												? "60"
												: featuredPerformance.docked
														.target_fps} FPS
										</span>
									{/if}
									{#if featuredPerformance.handheld?.target_fps}
										<span
											class="perf-badge"
											title="Handheld: {featuredPerformance
												.handheld.target_fps} FPS"
										>
											<Icon
												icon="mdi:nintendo-switch"
												width="16"
											/>
											{featuredPerformance.handheld
												.target_fps === "Unlocked"
												? "60"
												: featuredPerformance.handheld
														.target_fps} FPS
										</span>
									{/if}
									{#if featuredPerformance.docked?.resolution_type || featuredPerformance.handheld?.resolution_type}
										<span class="perf-badge res-badge">
											<Icon
												icon="mdi:monitor-screenshot"
												width="16"
											/>
											{featuredPerformance.docked
												?.resolution_type ||
												featuredPerformance.handheld
													?.resolution_type}
										</span>
									{/if}
								</div>
							{/if}

							<a href="/title/{featuredGame.id}" class="hero-cta">
								View Details <Icon icon="mdi:arrow-right" />
							</a>
						</div>
					{/key}
				</div>

				<!-- Carousel Controls -->
				<div class="hero-controls">
					<button
						class="control-btn"
						onclick={prevHero}
						aria-label="Previous game"
					>
						<Icon icon="mdi:chevron-left" width="24" height="24" />
					</button>

					<div class="indicators">
						{#each recentUpdates as _, i}
							<button
								class="indicator-dot"
								class:active={i === heroIndex}
								onclick={() => setHero(i)}
								aria-label="Go to slide {i + 1}"
							></button>
						{/each}
					</div>

					<span class="indicator-counter"
						>{heroIndex + 1} / {recentUpdates.length}</span
					>

					<button
						class="control-btn"
						onclick={nextHero}
						aria-label="Next game"
					>
						<Icon icon="mdi:chevron-right" width="24" height="24" />
					</button>
				</div>
			</section>
		{/if}

		<!-- Discovery Section -->
		{#if randomGames.length > 0}
			<section class="discover-section">
				<div class="section-title">
					<Icon icon="mdi:auto-fix" />
					<h2>Discover Something New</h2>
				</div>
				<div class="discover-grid">
					{#each randomGames as game}
						{@const iconSet = createImageSet(game.iconUrl, {
							highRes: $preferences.highResImages,
							thumbnailWidth: 120,
						})}
						<a
							href="/title/{game.id}"
							class="discover-item"
							title={game.names[0]}
						>
							{#if iconSet}
								<img
									src={iconSet.src}
									srcset={iconSet.srcset}
									alt={game.names[0]}
									loading="lazy"
								/>
							{:else}
								<div class="no-icon">
									<Icon icon="mdi:image-off" />
								</div>
							{/if}
						</a>
					{/each}
				</div>
			</section>
		{/if}
	{/if}

	<Drafts />

	<!-- Results Section -->
	<section class="results-section">
		<div class="section-header-wrapper">
			<h2 class="section-header">{searchResultText}</h2>

			<div class="controls-row">
				<div class="view-switcher">
					<button
						class:active={viewMode === "list"}
						onclick={() => (viewMode = "list")}
						title="List View"><Icon icon="mdi:view-list" /></button
					>
					<button
						class:active={viewMode === "grid"}
						onclick={() => (viewMode = "grid")}
						title="Grid View"><Icon icon="mdi:view-grid" /></button
					>
				</div>
			</div>
		</div>

		<div class="results-container {viewMode}">
			{#each results as item (item.id)}
				{#if viewMode === "list"}
					<ListItem titleData={item} />
				{:else}
					<GridItem titleData={item} />
				{/if}
			{:else}
				<div class="no-results">
					<h3>No Titles Found</h3>
					<p>Try adjusting your search or filter criteria</p>
				</div>
			{/each}
		</div>
	</section>

	{#if pagination?.totalPages > 1}
		<div class="pagination">
			<button
				disabled={pagination.currentPage <= 1}
				onclick={() => changePage(pagination.currentPage - 1)}
				>← Previous</button
			>
			<span>Page {pagination.currentPage} of {pagination.totalPages}</span
			>
			<button
				disabled={pagination.currentPage >= pagination.totalPages}
				onclick={() => changePage(pagination.currentPage + 1)}
				>Next →</button
			>
		</div>
	{/if}

	{#if data.isLandingPage}
		<!-- Branding Hero (CTA) -->
		<section class="branding-hero branding-cta" in:fade>
			<div class="hero-bg-accent"></div>
			<div class="branding-badge">
				<Icon icon="mdi:account-group" /> Join the Community
			</div>
			<h1>Everything runs better with info</h1>
			<p>
				Contribute performance data, report graphics settings, or help
				verify existing entries. Together we build the best database for
				Switch players
			</p>
			<div class="cta-actions">
				<a href="/contribute" class="hero-cta">
					Get Started <Icon icon="mdi:plus-circle" />
				</a>
			</div>
		</section>
	{/if}
</main>

<style>
	.main-content {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		padding: 1rem;
		margin: 0 auto;
		max-width: 1200px;
	}

	/* --- Branding Hero / CTA --- */
	.branding-hero {
		position: relative;
		padding: 6rem 1.5rem;
		text-align: center;
		background: radial-gradient(
				circle at top right,
				color-mix(in srgb, var(--primary-color) 8%, transparent),
				transparent 40%
			),
			radial-gradient(
				circle at bottom left,
				color-mix(in srgb, var(--primary-color) 8%, transparent),
				transparent 40%
			);
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		margin-top: 4rem;
		overflow: hidden;
		box-shadow: var(--shadow-xl);
	}

	.branding-hero.branding-cta {
		padding: 7rem 1.5rem;
		margin-bottom: 2rem;
	}

	.hero-bg-accent {
		position: absolute;
		inset: 0;
		background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='currentColor' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
		color: var(--primary-color);
		opacity: 0.8;
		pointer-events: none;
	}

	.branding-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 6px 16px;
		background: color-mix(in srgb, var(--primary-color) 10%, transparent);
		color: var(--primary-color);
		border-radius: 99px;
		font-size: 0.9rem;
		font-weight: 600;
		margin-bottom: 1.5rem;
		border: 1px solid
			color-mix(in srgb, var(--primary-color) 20%, transparent);
	}

	.branding-hero h1 {
		font-size: clamp(2.2rem, 6vw, 3.5rem);
		font-weight: 900;
		line-height: 1.05;
		margin: 0 0 1.5rem;
		letter-spacing: -0.03em;
		color: var(--text-primary);
	}

	.branding-hero p {
		font-size: 1.15rem;
		color: var(--text-secondary);
		max-width: 600px;
		margin: 0 auto 2.5rem;
		line-height: 1.6;
	}

	.cta-actions {
		display: flex;
		justify-content: center;
		gap: 1rem;
	}

	.hero-search-wrapper {
		max-width: 600px;
		margin: 0 auto;
	}

	.search-input-container {
		position: relative;
		background: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: 16px;
		display: flex;
		align-items: center;
		padding: 0 1.25rem;
		box-shadow: var(--shadow-xl);
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.search-input-container:focus-within {
		border-color: var(--primary-color);
		transform: translateY(-2px);
		box-shadow: 0 12px 24px -8px color-mix(in srgb, var(--primary-color) 25%, transparent);
	}

	.search-input-container :global(.search-icon) {
		font-size: 1.5rem;
		color: var(--text-secondary);
		margin-right: 1rem;
	}

	.search-input-container input {
		width: 100%;
		padding: 1.25rem 0;
		background: transparent;
		border: none;
		font-size: 1.1rem;
		color: var(--text-primary);
		outline: none;
	}

	/* --- Common Themed Elements --- */
	:global(.has-theme) .perf-badge {
		background: color-mix(
			in srgb,
			var(--surface-color) 40%,
			rgba(0, 0, 0, 0.4)
		);
		border-color: color-mix(
			in srgb,
			var(--primary-color) 20%,
			rgba(255, 255, 255, 0.1)
		);
		color: #ffffff;
	}

	:global(.has-theme) .hero-badge,
	:global(.has-theme) .hero-cta,
	:global(.has-theme) .indicator-dot.active,
	:global(.has-theme) .view-switcher button.active,
	:global(.has-theme) .pagination button:hover:not(:disabled) {
		background-color: var(--primary-color);
		color: #ffffff !important;
	}

	:global(.has-theme) .view-switcher button:not(.active) {
		color: var(--text-primary) !important;
	}

	:global(.has-theme) .branding-badge {
		background: color-mix(in srgb, var(--primary-color) 15%, transparent);
		color: var(--primary-color);
		border-color: color-mix(in srgb, var(--primary-color) 30%, transparent);
	}

	/* --- Stats Bar --- */
	.stats-bar {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 2rem;
		margin: -5rem auto 3rem;
		padding: 1.5rem 2rem;
		background: var(--surface-color);
		border-radius: 20px;
		border: 1px solid var(--border-color);
		box-shadow: var(--shadow-lg);
		max-width: 900px;
		position: relative;
		z-index: 10;
	}

	@media (max-width: 768px) {
		.stats-bar {
			flex-direction: column;
			gap: 1rem;
			margin-top: 0;
			padding: 1rem;
		}

		.stat-divider {
			display: none;
		}
	}

	.stat-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex: 1;
		justify-content: center;
	}

	.stat-icon {
		width: 44px;
		height: 44px;
		background: color-mix(in srgb, var(--primary-color) 10%, transparent);
		color: var(--primary-color);
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
	}

	.stat-info {
		display: flex;
		flex-direction: column;
	}

	.stat-value {
		font-size: 1.25rem;
		font-weight: 800;
		color: var(--text-primary);
	}

	.stat-label {
		font-size: 0.8rem;
		color: var(--text-secondary);
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-divider {
		width: 1px;
		height: 32px;
		background: var(--border-color);
	}

	/* --- Hero Section (Recently Updated) --- */
	.hero-section {
		position: relative;
		border-radius: var(--radius-lg);
		overflow: hidden;
		color: white;
		min-height: 280px;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		padding: 2.5rem 2rem 2rem;
		box-shadow: var(--shadow-lg);
		background-color: var(--surface-color);
	}

	@media (min-width: 640px) {
		.hero-section {
			min-height: 380px;
		}
	}

	.hero-bg {
		position: absolute;
		inset: 0;
		z-index: 0;
	}

	.hero-bg img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.hero-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to top,
			var(--theme-overlay, rgba(0, 0, 0, 0.95)) 0%,
			color-mix(
					in srgb,
					var(--theme-overlay, rgba(0, 0, 0, 0.6)) 80%,
					transparent
				)
				60%,
			transparent 100%
		);
	}

	@media (prefers-color-scheme: dark) {
		.hero-overlay:not(:global(.has-theme) *) {
			background: linear-gradient(
				to top,
				rgba(0, 0, 0, 0.95) 0%,
				rgba(0, 0, 0, 0.6) 60%,
				rgba(0, 0, 0, 0.3) 100%
			);
		}
	}

	@media (prefers-color-scheme: light) {
		.hero-overlay:not(:global(.has-theme) *) {
			background: linear-gradient(
				to top,
				rgba(255, 255, 255, 0.95) 0%,
				rgba(255, 255, 255, 0.7) 60%,
				rgba(255, 255, 255, 0.4) 100%
			);
		}
	}

	.hero-content {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 700px;
		display: grid;
		align-items: end;
	}

	.hero-content-inner {
		grid-area: 1 / 1;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.hero-badge {
		display: inline-flex;
		align-items: center;
		align-self: flex-start;
		gap: 0.4rem;
		background-color: var(--primary-color);
		color: var(--primary-action-text);
		padding: 6px 14px;
		border-radius: 99px;
		font-size: 0.85rem;
		font-weight: 600;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	.hero-section h1 {
		font-size: 1.75rem;
		font-weight: 800;
		margin: 0;
		line-height: 1.2;
		color: #ffffff;
		text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
	}

	@media (min-width: 640px) {
		.hero-section h1 {
			font-size: 2.5rem;
		}
	}

	.hero-cta {
		display: inline-flex;
		align-items: center;
		align-self: flex-start;
		gap: 0.5rem;
		background-color: var(--primary-color);
		color: var(--primary-action-text);
		padding: 10px 20px;
		border-radius: 99px;
		font-weight: 700;
		font-size: 0.95rem;
		text-decoration: none;
		transition: transform 0.2s;
	}

	.hero-cta:hover {
		transform: translateY(-2px);
	}

	.hero-performance {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.perf-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 6px 12px;
		background: rgba(0, 0, 0, 0.6);
		color: white;
		border-radius: 8px;
		font-size: 0.85rem;
		font-weight: 600;
		backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.hero-controls {
		position: relative;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	@media (max-width: 640px) {
		.hero-controls {
			justify-content: center;
			gap: 2rem;
		}
		.indicators {
			display: none;
		}
	}

	.control-btn {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: white;
		border-radius: 50%;
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s;
	}

	.control-btn:hover {
		background: rgba(255, 255, 255, 0.25);
		transform: scale(1.1);
	}

	.section-badge {
		position: absolute;
		top: 1.5rem;
		left: 1.5rem;
		z-index: 10;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(8px);
		padding: 6px 12px;
		border-radius: 8px;
		font-size: 0.8rem;
		font-weight: 600;
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.indicators {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.indicator-counter {
		font-size: 0.85rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.9);
		background: rgba(0, 0, 0, 0.4);
		padding: 4px 10px;
		border-radius: 99px;
		backdrop-filter: blur(4px);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.indicator-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background-color: rgba(255, 255, 255, 0.3);
		border: none;
		cursor: pointer;
	}

	.indicator-dot.active {
		background-color: var(--primary-color);
		width: 24px;
		border-radius: 4px;
	}

	/* --- General --- */
	.section-title {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 2rem;
	}

	.section-title h2 {
		margin: 0;
		font-size: 1.5rem;
	}

	.discover-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
		gap: 1rem;
	}

	.discover-item {
		aspect-ratio: 1;
		border-radius: 12px;
		overflow: hidden;
		background: var(--surface-color);
		border: 1px solid var(--border-color);
		transition: all 0.2s;
	}

	.discover-item:hover {
		transform: scale(1.1);
		border-color: var(--primary-color);
		z-index: 1;
	}

	.discover-item img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.results-section {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.section-header-wrapper {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.results-container.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1.5rem;
	}

	.results-container.list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	/* --- Controls & Buttons --- */
	.view-switcher {
		display: flex;
		background: var(--input-bg);
		padding: 4px;
		border-radius: 12px;
		border: 1px solid var(--border-color);
	}

	.view-switcher button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border: none;
		background: transparent;
		color: var(--text-secondary);
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.view-switcher button:hover {
		color: var(--text-primary);
		background: rgba(255, 255, 255, 0.05);
	}

	.view-switcher button.active {
		background: var(--primary-color);
		color: white;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.pagination {
		display: flex;
		justify-content: center;
		gap: 1.5rem;
		align-items: center;
		margin-top: 3rem;
		padding: 2rem 0;
		border-top: 1px solid var(--border-color);
	}

	.pagination button {
		padding: 10px 20px;
		border-radius: 99px;
		background: var(--surface-color);
		border: 1px solid var(--border-color);
		color: var(--text-primary);
		font-weight: 600;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.pagination button:hover:not(:disabled) {
		background: var(--input-bg);
		border-color: var(--primary-color);
		transform: translateY(-1px);
	}

	.pagination button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.pagination span {
		font-size: 0.9rem;
		color: var(--text-secondary);
		font-weight: 500;
	}
</style>
