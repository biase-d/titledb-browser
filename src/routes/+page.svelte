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
		featuredGame ? createImageSet(featuredGame.bannerUrl) : null,
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

	function clearAllFilters() {
		dockedFps = "";
		handheldFps = "";
		resolutionType = "";
		regionFilter = "";
		updateData({ resetPage: true });
	}

	// --- Performance Filters ---
	const quickFilters = [
		{ label: "60 FPS", type: "fps", value: "60", icon: "mdi:speedometer" },
		{
			label: "30 FPS",
			type: "fps",
			value: "30",
			icon: "mdi:speedometer-slow",
		},
		{
			label: "Unlocked",
			type: "fps",
			value: "Unlocked",
			icon: "mdi:lock-open-variant",
		},
		{
			label: "Dynamic Res",
			type: "res",
			value: "Dynamic",
			icon: "mdi:arrow-expand-all",
		},
		{
			label: "Fixed Res",
			type: "res",
			value: "Fixed",
			icon: "mdi:monitor-screenshot",
		},
	];

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

	function handlePillFilter(filter) {
		search = "";
		dockedFps = "";
		handheldFps = "";
		resolutionType = "";
		regionFilter = "";

		if (filter.type === "q") search = filter.value;
		if (filter.type === "fps") {
			dockedFps = filter.value;
			handheldFps = filter.value;
		}
		if (filter.type === "res") {
			resolutionType = filter.value;
		}
		updateData({ resetPage: true });
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
	<title>Switch Performance</title>
	{#if featuredGame && !search && !hasActiveFilters}
		{@html `<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "VideoGame",
			"name": "${featuredName}",
			"gamePlatform": "Nintendo Switch",
			"image": "${featuredGame.bannerUrl || featuredGame.iconUrl}",
			"url": "${page.url.origin}/title/${featuredGame.id}",
			"applicationCategory": "Game",
			"operatingSystem": "Nintendo Switch OS"
		}
		<\/script>`}
	{/if}
</svelte:head>

<main class="main-content">
	{#if featuredGame && !search && !hasActiveFilters}
		<section
			class="hero-section"
			onmouseenter={() => (isPaused = true)}
			onmouseleave={() => (isPaused = false)}
			aria-label="Featured recently updated games"
			in:fade
		>
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
							<Icon icon="mdi:star-four-points" /> Recently Updated
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

	<Drafts />

	<section class="filter-bar">
		<div class="quick-filters">
			{#if hasActiveFilters}
				<button
					class="filter-chip clear-chip"
					onclick={clearAllFilters}
					transition:fade={{ duration: 150 }}
				>
					<Icon icon="mdi:filter-off" /> Clear
				</button>
				<div
					class="filter-separator"
					transition:fade={{ duration: 150 }}
				></div>
			{/if}

			{#each quickFilters as filter}
				<button
					class="filter-chip"
					class:active={(filter.type === "fps" &&
						dockedFps === filter.value) ||
						(filter.type === "res" &&
							resolutionType === filter.value)}
					onclick={() => handlePillFilter(filter)}
				>
					<Icon icon={filter.icon} />
					{filter.label}
				</button>
			{/each}
		</div>
	</section>

	<!-- Results Section -->
	<section class="results-section">
		<div class="section-header-wrapper">
			<h2 class="section-header">{searchResultText}</h2>

			<div class="controls-row">
				<!--
				<div class="filter-dropdown">
					<select bind:value={regionFilter} onchange={() => updateData({ resetPage: true })}>
						<option value="">All Regions</option>
						<optgroup label="Continents">
							<option value="Americas">The Americas</option>
							<option value="Europe">Europe</option>
							<option value="Asia">Asia</option>
						</optgroup>
						<optgroup label="Specific Countries">
							<option value="JP">Japan</option>
							<option value="KR">Korea</option>
							<option value="CN">China</option>
							<option value="US">USA</option>
						</optgroup>
					</select>
					<Icon icon="mdi:chevron-down" class="dropdown-icon" />
				</div>
			-->
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

	/* --- Hero Section --- */
	.hero-section {
		position: relative;
		border-radius: var(--radius-lg);
		overflow: hidden;
		color: white;
		min-height: 280px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 2rem 1.5rem 1.5rem;
		box-shadow: var(--shadow-lg);
		background-color: var(--surface-color);
	}

	@media (min-width: 640px) {
		.hero-section {
			min-height: 320px;
			padding: 2.5rem 2rem 2rem;
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
	}

	@media (prefers-color-scheme: dark) {
		.hero-overlay {
			background: linear-gradient(
				to top,
				rgba(0, 0, 0, 0.95) 0%,
				rgba(0, 0, 0, 0.6) 60%,
				rgba(0, 0, 0, 0.3) 100%
			);
		}
	}

	@media (prefers-color-scheme: light) {
		.hero-overlay {
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
		flex: 1;
		display: grid;
		align-items: end;
	}

	.hero-content-inner {
		grid-area: 1 / 1;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
		max-width: 100%;
		min-width: 0;
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
		color: var(--text-primary);
		text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
		min-width: 0;
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
		transition:
			transform 0.2s,
			box-shadow 0.2s;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	.hero-cta:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
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
		background: color-mix(
			in srgb,
			var(--primary-color, rgba(0, 0, 0, 0.6)) 70%,
			black
		);
		color: white;
		border-radius: 8px;
		font-size: 0.85rem;
		font-weight: 600;
		backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
	}

	.perf-badge :global(svg) {
		opacity: 0.9;
	}

	/* --- Carousel Controls --- */
	.hero-controls {
		position: relative;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 2rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
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

	.indicators {
		display: none;
		gap: 0.4rem;
		justify-content: center;
		max-width: 300px;
		overflow: hidden;
	}

	@media (min-width: 640px) {
		.indicators {
			display: flex;
		}
	}

	.indicator-counter {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.8);
		font-weight: 500;
		min-width: 50px;
		text-align: center;
	}

	@media (min-width: 640px) {
		.indicator-counter {
			display: none;
		}
	}

	.indicator-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background-color: rgba(255, 255, 255, 0.3);
		border: none;
		padding: 0;
		cursor: pointer;
		transition: all 0.3s;
	}

	.indicator-dot:hover {
		background-color: rgba(255, 255, 255, 0.6);
	}

	.indicator-dot.active {
		background-color: var(--primary-color);
		transform: scale(1.2);
		width: 24px; /* Elongate active dot */
		border-radius: 4px;
	}

	/* --- Filter Bar --- */
	.filter-bar {
		overflow-x: auto;
		padding-bottom: 0.5rem;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}
	.filter-bar::-webkit-scrollbar {
		display: none;
	}

	.quick-filters {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	.clear-chip {
		background-color: color-mix(in srgb, #ef4444 8%, transparent);
		color: #ef4444;
		border-color: color-mix(in srgb, #ef4444 20%, transparent);
	}

	.clear-chip:hover {
		background-color: color-mix(in srgb, #ef4444 15%, transparent);
		border-color: #ef4444;
	}

	.filter-separator {
		width: 1px;
		height: 20px;
		background-color: var(--border-color);
		margin: 0 0.25rem;
	}

	.filter-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 8px 16px;
		font-size: 0.9rem;
		font-weight: 500;
		background-color: var(--surface-color);
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
		border-radius: 999px;
		cursor: pointer;
		transition: all 0.2s;
		white-space: nowrap;
	}

	.filter-chip:hover {
		border-color: var(--primary-color);
		color: var(--primary-color);
		background-color: color-mix(
			in srgb,
			var(--primary-color) 5%,
			transparent
		);
	}

	.filter-chip.active {
		background-color: var(--primary-color);
		color: var(--primary-action-text);
		border-color: var(--primary-color);
	}

	/* --- Results Section --- */
	.section-header-wrapper {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--border-color);
		flex-wrap: wrap;
		gap: 1rem;
	}

	.section-header {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
	}

	.controls-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.filter-dropdown {
		position: relative;
	}

	.filter-dropdown select {
		appearance: none;
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 8px 36px 8px 12px;
		font-size: 0.9rem;
		color: var(--text-secondary);
		cursor: pointer;
	}

	.filter-dropdown .dropdown-icon {
		position: absolute;
		right: 10px;
		top: 50%;
		transform: translateY(-50%);
		pointer-events: none;
		color: var(--text-secondary);
	}

	.view-switcher {
		display: flex;
		gap: 0.5rem;
	}

	.view-switcher button {
		padding: 0.5rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		background: none;
		color: var(--text-secondary);
		cursor: pointer;
		line-height: 1;
		transition: all 0.2s;
	}

	.view-switcher button.active {
		background-color: var(--primary-color);
		border-color: var(--primary-color);
		color: white;
	}

	.results-container.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 1.5rem;
	}

	.results-container.list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.no-results {
		grid-column: 1 / -1;
		padding: 3rem;
		text-align: center;
		color: var(--text-secondary);
		background-color: var(--surface-color);
		border-radius: var(--radius-lg);
		border: 1px dashed var(--border-color);
	}

	.no-results h3 {
		margin: 0 0 0.5rem;
	}

	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		margin-top: 2rem;
	}

	.pagination button {
		padding: 8px 16px;
		font-weight: 500;
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		color: var(--primary-color);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition:
			background-color 0.2s ease,
			opacity 0.2s ease;
	}

	.pagination button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
