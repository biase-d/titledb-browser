<script>
	import { page } from '$app/state'
	import { goto } from '$app/navigation'
	import { browser } from '$app/environment'
	import { onMount } from 'svelte'
	import { fade } from 'svelte/transition'
	import Icon from '@iconify/svelte'
	import ListItem from './ListItem.svelte'
	import GridItem from './GridItem.svelte'
	import CompactItem from './CompactItem.svelte'
	import TableItem from './TableItem.svelte'
	import GalleryItem from './GalleryItem.svelte'
	import DetailedItem from './DetailedItem.svelte'
	import ActivityItem from './ActivityItem.svelte'
	import NoResults from './NoResults.svelte'
	import Drafts from './Drafts.svelte'
	import HeroCarousel from '$lib/components/HeroCarousel.svelte'
	import { createImageSet, proxyImage } from '$lib/image'
	import { preferences } from '$lib/stores/preferences'
	import SkeletonCard from '$lib/components/SkeletonCard.svelte'
	import { navigating } from '$app/stores'

	import { isFeatureEnabled } from '$lib/services/versionService'

	let { data } = $props()
	let { randomGames = [] } = $derived(data)

	let results = $derived(data.results)
	let recentUpdates = $derived(data.recentUpdates || [])
	let pagination = $derived(data.pagination)

	// --- State ---
	let search = $state('')
	let dockedFps = $state('')
	let handheldFps = $state('')
	let resolutionType = $state('')
	let regionFilter = $state('')
	let selectedSort = $state('date-desc')
	let currentPage = $state(1)
	/** @type {"list" | "grid" | "table" | "detailed" | "gallery" | "compact" | "activity"} */
	let viewMode = $state('grid')
	let preferredRegion = $state('US')
	let isViewPickerOpen = $state(false)
	let scrollTop = $state(0)
	let viewportHeight = $state(0)
	let resultsContainer = $state()

	let debounceTimer

	onMount(() => {
		const { searchParams } = page.url
		search = searchParams.get('q') || ''
		dockedFps = searchParams.get('docked_fps') || ''
		handheldFps = searchParams.get('handheld_fps') || ''
		resolutionType = searchParams.get('res_type') || ''
		regionFilter = searchParams.get('region_filter') || ''
		selectedSort =
			searchParams.get('sort') ||
			(search ? 'relevance-desc' : 'date-desc')
		currentPage = parseInt(searchParams.get('page') || '1', 10) || 1

		const savedView = localStorage.getItem('viewMode')
		/** @type {any[]} */
		const validModes = [
			'list',
			'grid',
			'table',
			'detailed',
			'gallery',
			'compact',
			'activity',
		]
		if (savedView && validModes.includes(savedView))
			viewMode = /** @type {any} */ (savedView)

		preferences.subscribe((p) => (preferredRegion = p.region))
	})

	$effect(() => {
		if (browser) {
			localStorage.setItem('viewMode', viewMode)
			isViewPickerOpen = false // Close dropdown when mode changes

			// Reset scroll tracking when view mode changes
			scrollTop = window.scrollY
			viewportHeight = window.innerHeight
		}
	})

	function handleScroll () {
		scrollTop = window.scrollY
	}

	function handleResize () {
		viewportHeight = window.innerHeight
	}

	// Virtualization Metrics (Aligned with CSS in <style>)
	const GRID_MIN_WIDTH = 200
	const GALLERY_MIN_WIDTH = 300
	const GRID_GAP = 24 // 1.5rem
	const FLEX_GAP = 12 // 0.75rem

	const columns = $derived.by(() => {
		if (!resultsContainer) return 1
		const width = resultsContainer.clientWidth

		if (viewMode === 'grid') {
			return Math.max(
				1,
				Math.floor((width + GRID_GAP) / (GRID_MIN_WIDTH + GRID_GAP)),
			)
		}
		if (viewMode === 'gallery') {
			return Math.max(
				1,
				Math.floor((width + GRID_GAP) / (GALLERY_MIN_WIDTH + GRID_GAP)),
			)
		}
		return 1
	})

	const itemHeight = $derived.by(() => {
		switch (viewMode) {
			case 'grid':
				return 320 + GRID_GAP
			case 'list':
				return 110 + FLEX_GAP
			case 'compact':
				return 48 + FLEX_GAP
			case 'table':
				return 49 // 48px + 1px border
			case 'gallery':
				return 360 + GRID_GAP
			case 'detailed':
				return 300 + FLEX_GAP
			case 'activity':
				return 120 + FLEX_GAP
			default:
				return 100
		}
	})

	$effect(() => {
		const q = page.url.searchParams.get('q') || ''
		if (search !== q) search = q
	})

	let showSkeletons = $derived($navigating?.to?.url.pathname === '/')

	function updateData ({ resetPage = false } = {}) {
		if (!browser) return
		clearTimeout(debounceTimer)
		debounceTimer = setTimeout(() => {
			const url = new URL(window.location.href)
			if (resetPage) currentPage = 1

			const updateParam = (key, value, defaultValue = '') => {
				if (value && value.toString() !== defaultValue)
					url.searchParams.set(key, value)
				else url.searchParams.delete(key)
			}

			updateParam('q', search)
			updateParam('docked_fps', dockedFps)
			updateParam('handheld_fps', handheldFps)
			updateParam('res_type', resolutionType)
			updateParam('region_filter', regionFilter)
			updateParam('sort', selectedSort, 'date-desc')
			updateParam('page', currentPage, '1')

			if (url.href !== window.location.href) {
				goto(url, {
					replaceState: true,
					noScroll: true,
					keepFocus: true,
				})
			}
		}, 350)
	}

	function changePage (newPage) {
		currentPage = newPage
		updateData({ resetPage: false })
		if (browser) window.scrollTo({ top: 0, behavior: 'smooth' })
	}

	function clearFilters () {
		search = ''
		dockedFps = ''
		handheldFps = ''
		resolutionType = ''
		regionFilter = ''
		selectedSort = 'date-desc'
		currentPage = 1
		updateData({ resetPage: true })
	}

	let hasActiveFilters = $derived(
		dockedFps || handheldFps || resolutionType || regionFilter,
	)

	let searchResultText = $derived(
		(() => {
			const count = pagination?.totalItems?.toLocaleString() || 0
			if (search || hasActiveFilters) {
				return `Found ${count} titles`
			}
			return 'All Titles'
		})(),
	)
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
		<link
			rel="preload"
			as="image"
			href={proxyImage(recentUpdates[0].bannerUrl, 1000)}
		/>
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
	${'<'}/script>`}
</svelte:head>

<svelte:window onscroll={handleScroll} onresize={handleResize} />

<main class="main-content">
	{#if data.isLandingPage}
		<!-- Recently Updated Carousel -->
		<HeroCarousel {recentUpdates} {preferredRegion} />

		<!-- Discovery Section -->
		{#if isFeatureEnabled('discoverSection') && randomGames.length > 0}
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
				<div class="view-picker">
					<button
						class="picker-btn"
						onclick={() => (isViewPickerOpen = !isViewPickerOpen)}
						aria-expanded={isViewPickerOpen}
						aria-haspopup="menu"
						aria-label="Change view mode"
					>
						<Icon
							icon={viewMode === 'list'
								? 'mdi:view-list'
								: viewMode === 'grid'
									? 'mdi:view-grid'
									: viewMode === 'table'
										? 'mdi:table'
										: viewMode === 'compact'
											? 'mdi:view-headline'
											: viewMode === 'detailed'
												? 'mdi:text-box-search-outline'
												: viewMode === 'gallery'
													? 'mdi:view-gallery'
													: 'mdi:clock-outline'}
						/>
						<span class="picker-label"
							>{viewMode.charAt(0).toUpperCase() +
								viewMode.slice(1)} View</span
						>
						<Icon icon="mdi:chevron-down" class="chevron" />
					</button>

					{#if isViewPickerOpen}
						<div
							class="picker-menu"
							transition:fade={{ duration: 100 }}
							role="menu"
						>
							<div class="menu-section">
								<span class="section-title">Standard</span>
								<button
									class:active={viewMode === 'grid'}
									onclick={() => (viewMode = 'grid')}
									role="menuitem"
								>
									<Icon icon="mdi:view-grid" />
									<span>Grid</span>
								</button>
								<button
									class:active={viewMode === 'list'}
									onclick={() => (viewMode = 'list')}
									role="menuitem"
								>
									<Icon icon="mdi:view-list" />
									<span>List</span>
								</button>
							</div>
							<div class="menu-section">
								<span class="section-title">Advanced</span>
								<button
									class:active={viewMode === 'table'}
									onclick={() => (viewMode = 'table')}
									role="menuitem"
								>
									<Icon icon="mdi:table" />
									<span>Table</span>
								</button>
								<button
									class:active={viewMode === 'detailed'}
									onclick={() => (viewMode = 'detailed')}
									role="menuitem"
								>
									<Icon icon="mdi:text-box-search-outline" />
									<span>Detailed View</span>
								</button>
							</div>
							<div class="menu-section">
								<span class="section-title">Specialized</span>
								<button
									class:active={viewMode === 'gallery'}
									onclick={() => (viewMode = 'gallery')}
									role="menuitem"
								>
									<Icon icon="mdi:view-gallery" />
									<span>Gallery</span>
								</button>
								<button
									class:active={viewMode === 'compact'}
									onclick={() => (viewMode = 'compact')}
									role="menuitem"
								>
									<Icon icon="mdi:view-headline" />
									<span>Compact</span>
								</button>
								<button
									class:active={viewMode === 'activity'}
									onclick={() => (viewMode = 'activity')}
									role="menuitem"
								>
									<Icon icon="mdi:clock-outline" />
									<span>Recent Activity</span>
								</button>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<div class="results-wrapper {viewMode}">
			{#if viewMode === 'table'}
				<div class="table-header">
					<div class="col col-icon"></div>
					<div class="col col-name">Title Name</div>
					<div class="col col-id">Title ID</div>
					<div class="col col-region">Region</div>
					<div class="col col-fps">Performance</div>
				</div>
			{/if}

			<div
				bind:this={resultsContainer}
				class="results-container {viewMode}"
			>
				{#if showSkeletons}
					{#each Array(viewMode === 'grid' || viewMode === 'gallery' ? 12 : 8) as _}
						<SkeletonCard {viewMode} />
					{/each}
				{:else}
					{#each results as item (item.id)}
						{#if viewMode === 'list'}
							<ListItem titleData={item} query={search} />
						{:else if viewMode === 'grid'}
							<GridItem titleData={item} query={search} />
						{:else if viewMode === 'compact'}
							<CompactItem titleData={item} query={search} />
						{:else if viewMode === 'table'}
							<TableItem titleData={item} query={search} />
						{:else if viewMode === 'gallery'}
							<GalleryItem titleData={item} />
						{:else if viewMode === 'detailed'}
							<DetailedItem titleData={item} query={search} />
						{:else if viewMode === 'activity'}
							<ActivityItem titleData={item} />
						{/if}
					{:else}
						<NoResults onClear={clearFilters} />
					{/each}
				{/if}
			</div>
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

	.results-container.gallery {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.results-container.list,
	.results-container.compact,
	.results-container.activity,
	.results-container.detailed {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.results-wrapper.table {
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		overflow: hidden;
		background: var(--surface-color);
	}

	.results-container.table {
		display: flex;
		flex-direction: column;
		gap: 0;
		border: none;
	}

	.table-header {
		display: grid;
		grid-template-columns: 48px 1fr 160px 120px 140px;
		align-items: center;
		padding: 0.75rem 1rem;
		background-color: var(--input-bg);
		border-bottom: 2px solid var(--border-color);
		font-weight: 700;
		font-size: 0.75rem;
		text-transform: uppercase;
		color: var(--text-secondary);
		letter-spacing: 0.05em;
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

	@media (max-width: 900px) {
		.table-header {
			grid-template-columns: 40px 1fr 120px;
		}
		.table-header .col-id,
		.table-header .col-region {
			display: none;
		}
	}

	@media (max-width: 640px) {
		.table-header {
			grid-template-columns: 40px 1fr;
		}
		.table-header .col-fps {
			display: none;
		}
	}

	/* --- View Picker Dropdown --- */
	.view-picker {
		position: relative;
		z-index: 100;
	}

	.picker-btn {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 1rem;
		background: var(--input-bg);
		border: 1px solid var(--border-color);
		border-radius: 12px;
		color: var(--text-primary);
		font-weight: 600;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.picker-btn:hover {
		border-color: var(--primary-color);
		background: var(--surface-color);
	}

	.picker-btn .chevron {
		opacity: 0.5;
		margin-left: 0.25rem;
	}

	.picker-menu {
		position: absolute;
		top: calc(100% + 0.5rem);
		right: 0;
		width: 200px;
		background: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: 12px;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
		overflow: hidden;
		animation: slideUp 0.15s ease-out;
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.menu-section {
		padding: 0.5rem 0;
	}

	.menu-section:not(:last-child) {
		border-bottom: 1px solid var(--border-color);
	}

	.section-title {
		display: block;
		padding: 0.25rem 1rem;
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		color: var(--text-secondary);
		opacity: 0.5;
	}

	.menu-section button {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 1rem;
		border: none;
		background: none;
		color: var(--text-primary);
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.15s ease;
		text-align: left;
	}

	.menu-section button:hover {
		background: var(--input-bg);
		color: var(--primary-color);
	}

	.menu-section button.active {
		background: color-mix(in srgb, var(--primary-color) 10%, transparent);
		color: var(--primary-color);
		font-weight: 700;
	}

	.picker-label {
		white-space: nowrap;
	}

	@media (max-width: 640px) {
		.picker-label {
			display: none;
		}
		.picker-btn {
			padding: 0.5rem 0.75rem;
		}
	}

	/* --- Controls & Buttons --- */
	.view-switcher-group {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.5rem;
	}

	.view-switcher {
		display: flex;
		background: var(--input-bg);
		padding: 4px;
		border-radius: 12px;
		border: 1px solid var(--border-color);
	}

	.view-switcher.secondary {
		border-style: dashed;
		opacity: 0.8;
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
