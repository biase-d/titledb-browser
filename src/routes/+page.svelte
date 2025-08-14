<script>
	import { slide } from 'svelte/transition';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { draftsStore } from '$lib/stores';
	import Icon from '@iconify/svelte';

	let { data } = $props();

	let results = $derived(data.results);
	let recentUpdates = $derived(data.recentUpdates || []);
	let pagination = $derived(data.pagination);
	let stats = $derived(data.stats);
	let drafts = $state([]);

	let search = $state('');
	let dockedFps = $state('');
	let handheldFps = $state('');
	let resolutionType = $state('');
	let selectedSort = $state('date-desc');
	let currentPage = $state(1);
	let viewMode = $state('list'); // 'list' or 'grid'

	let isFilterVisible = $state(false);

	let debounceTimer;

	onMount(() => {
		const { searchParams } = page.url;
		search = searchParams.get('q') || '';
		dockedFps = searchParams.get('docked_fps') || '';
		handheldFps = searchParams.get('handheld_fps') || '';
		resolutionType = searchParams.get('res_type') || '';
		selectedSort = searchParams.get('sort') || (search ? 'relevance-desc' : 'date-desc');
		currentPage = parseInt(searchParams.get('page'), 10) || 1;

		const savedView = localStorage.getItem('viewMode');
		if (savedView === 'grid' || savedView === 'list') viewMode = savedView;

		draftsStore.subscribe(d => { drafts = d; });
	});

	$effect(() => {
		if (browser) localStorage.setItem('viewMode', viewMode);
	});

	function updateData({ resetPage = false } = {}) {
		if (!browser) return;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			const url = new URL(window.location.href);
			if (resetPage) currentPage = 1;

			const updateParam = (key, value, defaultValue = '') => {
				if (value && value.toString() !== defaultValue) url.searchParams.set(key, value);
				else url.searchParams.delete(key);
			};

			updateParam('q', search);
			updateParam('docked_fps', dockedFps);
			updateParam('handheld_fps', handheldFps);
			updateParam('res_type', resolutionType);
			updateParam('sort', selectedSort, 'date-desc');
			updateParam('page', currentPage, '1');

			if (url.href !== window.location.href) {
				goto(url, { replaceState: true, noScroll: true, keepFocus: true });
			}
		}, 350);
	}

	function resetFilters() {
		dockedFps = '';
		handheldFps = '';
		resolutionType = '';
		updateData({ resetPage: true });
	}

	function changePage(newPage) {
		currentPage = newPage;
		updateData({ resetPage: false });
		if (browser) window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function deleteAllDrafts() {
		if (confirm('Are you sure you want to delete all drafts? This cannot be undone.')) {
			// Loop through a copy because the original array might change during iteration
			for (const draft of [...drafts]) {
				draftsStore.delete(draft.id);
			}
		}
	}

	let hasActiveFilters = $derived(dockedFps || handheldFps || resolutionType);

	let searchResultText = $derived((() => {
		const count = pagination?.totalItems?.toLocaleString() || 0;
		if (search || hasActiveFilters) {
			return `Found ${count} titles`;
		}
		return 'All Titles';
	})());

</script>

<svelte:head>
	<title>Switch Performance</title>
</svelte:head>

<div class="page-layout">
	<aside class="sidebar">
		<div class="sidebar-sticky-content">
			<div class="sidebar-content" class:visible={isFilterVisible}>
				{#if stats}
					<div class="filter-group stats-group">
						<h3 class="filter-title">Project Stats</h3>
						<div class="stats-grid">
							<div class="stat-item">
								<span class="stat-value">{stats.totalGames.toLocaleString()}</span>
								<span class="stat-label">Games Tracked</span>
							</div>
							<div class="stat-item">
								<span class="stat-value">{stats.totalContributors.toLocaleString()}</span>
								<span class="stat-label">Contributors</span>
							</div>
						</div>
					</div>
				{/if}
				<div class="form-group">
					<label for="docked_fps">Work in Progress 🔨 <br/> Almost there :p</label>
				</div>
				<!--
				<div class="filter-group">
					<h3 class="filter-title">Filters</h3>
					<div class="form-group">
						<label for="docked_fps">Docked FPS</label>
						<select id="docked_fps" bind:value={dockedFps} onchange={() => updateData({ resetPage: true })}>
							<option value="">Any</option>
							<option value="60">60 FPS</option>
							<option value="30">30 FPS</option>
						</select>
					</div>
					<div class="form-group">
						<label for="handheld_fps">Handheld FPS</label>
						<select id="handheld_fps" bind:value={handheldFps} onchange={() => updateData({ resetPage: true })}>
							<option value="">Any</option>
							<option value="60">60 FPS</option>
							<option value="30">30 FPS</option>
						</select>
					</div>
					<div class="form-group">
						<label for="res_type">Resolution</label>
						<select id="res_type" bind:value={resolutionType} onchange={() => updateData({ resetPage: true })}>
							<option value="">Any</option>
							<option value="Dynamic">Dynamic</option>
							<option value="Fixed">Fixed</option>
							<option value="Multiple Fixed">Multiple Fixed</option>
						</select>
					</div>
					{#if hasActiveFilters}
						<button class="reset-filters-btn" onclick={resetFilters}>Reset Filters</button>
					{/if}
				</div>

				<div class="filter-group">
					<h3 class="filter-title">Sort By</h3>
					<div class="form-group">
						<select class="sort-select" bind:value={selectedSort} onchange={() => updateData({ resetPage: true })}>
							<option value="relevance-desc" disabled={!search}>Relevance</option>
							<option value="date-desc">Newest First</option>
							<option value="name-asc">Name (A-Z)</option>
						</select>
					</div>
				</div>
				-->

			</div>
		</div>
	</aside>

	<main class="main-content">
		<div class="hero-section">
			<h1>Switch Performance</h1>
			<p>A community-driven database of game performance metrics, from framerates to resolution.</p>
			<div class="search-input-wrapper">
				<Icon icon="mdi:magnify" class="search-icon" />
				<input bind:value={search} oninput={() => updateData({ resetPage: true })} type="text" placeholder="Search by game name or title ID..." class="search-input"/>
				{#if search}<button class="clear-button" onclick={() => { search = ''; updateData({ resetPage: true }); }} title="Clear search"><Icon icon="mdi:close"/></button>{/if}
			</div>
		</div>

		<div class="mobile-filter-toggle">
			<button onclick={() => isFilterVisible = !isFilterVisible}>
				<Icon icon="mdi:filter-variant" />
				<span>Filter & Sort</span>
				<Icon icon="mdi:chevron-down" class="chevron"/>
			</button>
		</div>

		{#if drafts.length > 0 && data.session?.user}
			<div class="drafts-section">
				<div class='section-header-wrapper'>
					<h2 class="section-header">Saved Drafts</h2>
					<button class="delete-all-drafts-btn" onclick={deleteAllDrafts} title="Delete all drafts">Delete All</button>
				</div>
				<ul class="drafts-list">
					{#each drafts as draft (draft.id)}
						<li class='draft-item'>
							<a href={`/contribute/${draft.id}?from_draft=true`} class="draft-link">
								<div>
									<span class="title-name">{draft.data.name || 'Untitled Draft'}</span>
									<span class="title-id">({draft.id})</span>
								</div>
								<span class="continue-editing">Continue Editing <Icon icon="mdi:arrow-right" /></span>
							</a>
							<button class='draft-delete' onclick={() => draftsStore.delete(draft.id)} title="Delete draft">
								<Icon icon='mdi:delete' height='20px' width='20px'/>
							</button>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if !search && !hasActiveFilters && recentUpdates.length > 0}
			<section class="results-section">
				<div class='section-header-wrapper'>
					<h2 class="section-header">Recently Updated</h2>
				</div>
				<div class="results-container grid">
					{#each recentUpdates as item (item.id)}
						<a href={`/title/${item.id}`} class="game-card" data-sveltekit-preload-data="hover">
							<div class="card-icon" style="background-image: url({item.iconUrl || '/favicon.svg'})"></div>
							<div class="card-info">
								<p class="card-title">{item.names[0]}</p>
								<p class="card-publisher">{item.publisher || 'N/A'}</p>
							</div>
						</a>
					{/each}
				</div>
			</section>
		{/if}

		<section class="results-section">
			<div class="section-header-wrapper">
				<h2 class="section-header">{searchResultText}</h2>
				<div class="view-switcher">
					<button class:active={viewMode === 'list'} onclick={() => viewMode = 'list'} title="List View"><Icon icon="mdi:view-list" /></button>
					<button class:active={viewMode === 'grid'} onclick={() => viewMode = 'grid'} title="Grid View"><Icon icon="mdi:view-grid" /></button>
				</div>
			</div>

			<div class="results-container {viewMode}">
				{#each results as item (item.id)}
					{#if viewMode === 'list'}
						<a href={`/title/${item.id}`} class="list-item" transition:slide|local data-sveltekit-preload-data="hover">
							<div class="list-item-info">
								<span class="title-name">{item.names[0]}</span>
								<span class="title-id">{item.id}</span>
							</div>
							{#if item.performance}
								<div class="perf-tags">
									{#if item.performance.docked.target_fps}
										<span class="perf-tag"><Icon icon="mdi:television" /> {item.performance.docked.target_fps} FPS</span>
									{/if}
									{#if item.performance.handheld.target_fps}
										<span class="perf-tag"><Icon icon="mdi:nintendo-switch" /> {item.performance.handheld.target_fps} FPS</span>
									{/if}
								</div>
							{/if}
						</a>
					{:else}
						<a href={`/title/${item.id}`} class="game-card" transition:slide|local data-sveltekit-preload-data="hover">
							<div class="card-icon" style="background-image: url({item.iconUrl || '/favicon.svg'})"></div>
							<div class="card-info">
								<p class="card-title">{item.names[0]}</p>
								<p class="card-publisher">{item.publisher || 'N/A'}</p>
							</div>
							{#if item.performance.docked.target_fps || item.performance.handheld.target_fps}
								<div class="card-perf-badge">
									{#if item.performance.docked.target_fps}
										<span><Icon icon="mdi:television" /> {item.performance.docked.target_fps}</span>
									{/if}
									{#if item.performance.handheld.target_fps}
										<span><Icon icon="mdi:nintendo-switch" /> {item.performance.handheld.target_fps}</span>
									{/if}
								</div>
							{/if}
						</a>
					{/if}
				{:else}
					<div class="no-results">
						<h3>No Titles Found</h3>
						<p>Try adjusting your search or filter criteria.</p>
					</div>
				{/each}
			</div>
		</section>

		{#if pagination?.totalPages > 1}
			<div class="pagination">
				<button disabled={pagination.currentPage <= 1} onclick={() => changePage(pagination.currentPage - 1)}>← Previous</button>
				<span>Page {pagination.currentPage} of {pagination.totalPages}</span>
				<button disabled={pagination.currentPage >= pagination.totalPages} onclick={() => changePage(pagination.currentPage + 1)}>Next →</button>
			</div>
		{/if}
	</main>
</div>

<style>
	.page-layout {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2rem;
		max-width: 1200px;
		margin: 0 auto;
		padding: 1.5rem;
	}

	@media (min-width: 1024px) {
		.page-layout {
			grid-template-columns: 280px 1fr;
			gap: 3rem;
		}
	}

	@media (min-width: 1280px) {
		.page-layout {
			max-width: 1400px;
		}
	}


	/* Sidebar */
	.sidebar-sticky-content {
		position: sticky;
		top: 80px; /* Header height + some margin */
	}

	.mobile-filter-toggle {
		display: none;
	}

	@media (max-width: 1023px) {
		.sidebar {
			display: none;
		}
	}
	
	.mobile-filter-toggle button {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem;
		font-size: 1rem;
		font-weight: 500;
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		color: var(--text-primary);
		cursor: pointer;
	}
	.mobile-filter-toggle .chevron {
		transition: transform 0.2s ease-in-out;
	}
	.mobile-filter-toggle .chevron.rotated {
		transform: rotate(180deg);
	}


	.sidebar-content {
		display: none;
		flex-direction: column;
		gap: 2rem;
	}
	.sidebar-content.visible {
		display: flex;
	}

	@media (min-width: 1024px) {
		.sidebar-content {
			display: flex;
		}
		.mobile-filter-toggle {
			display: none;
		}
	}


	.filter-group {
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
	}

	.filter-title {
		font-size: 1.125rem;
		margin: 0 0 1.5rem 0;
		border-bottom: 1px solid var(--border-color);
		padding-bottom: 0.75rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.form-group label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-secondary);
	}

	select {
		width: 100%;
		padding: 0.6rem 0.8rem;
		font-size: 0.9rem;
		background-color: var(--input-bg);
		border: 1px solid var(--border-color);
		color: var(--text-primary);
		border-radius: var(--radius-md);
		cursor: pointer;
		-webkit-appearance: none;
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.75rem center;
		padding-right: 2.5rem;
	}

	.reset-filters-btn {
		width: 100%;
		margin-top: 0.5rem;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--primary-color);
		background: none;
		border: 1px solid var(--border-color);
		padding: 0.5rem;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all 0.2s ease;
	}
	.reset-filters-btn:hover {
		border-color: var(--primary-color);
		background-color: color-mix(in srgb, var(--primary-color) 10%, transparent);
	}

	/* Stats */
	.stats-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
	}
	.stat-item { text-align: left; }
	.stat-value {
		font-size: 1.75rem;
		font-weight: 600;
		color: var(--text-primary);
	}
	.stat-label {
		font-size: 0.8rem;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* Main Content */
	.main-content {
		display: flex;
		flex-direction: column;
		gap: 3rem;
	}

	.hero-section {
		text-align: center;
		padding: 2rem 0;
	}

	@media (min-width: 1024px) {
		.hero-section {
			padding-top: 0;
		}
	}

	.hero-section h1 {
		font-size: 2.5rem;
		font-weight: 700;
		margin: 0 0 0.5rem;
	}
	.hero-section p {
		font-size: 1.125rem;
		color: var(--text-secondary);
		max-width: 600px;
		margin: 0 auto 2rem;
	}

	.search-input-wrapper {
		position: relative;
		max-width: 600px;
		margin: 0 auto;
	}
	.search-input-wrapper :global(svg.search-icon) {
		position: absolute;
		left: 16px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--text-secondary);
		pointer-events: none;
	}
	.search-input {
		width: 100%;
		padding: 14px 16px 14px 48px;
		font-size: 1rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		background-color: var(--surface-color);
		color: var(--text-primary);
		transition: border-color 0.2s, box-shadow 0.2s;
	}
	.search-input:focus {
		outline: none;
		border-color: var(--primary-color);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 20%, transparent);
	}

	.clear-button {
		position: absolute;
		top: 50%;
		right: 8px;
		transform: translateY(-50%);
		padding: 8px;
		border: none;
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
	}
	.clear-button:hover {
		color: var(--text-primary);
	}

	.section-header-wrapper {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--border-color);
	}

	.section-header {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
	}

	.drafts-section,
	.results-section {
		margin-top: 0;
	}

	/* Drafts */
	.drafts-list {
		display: flex; flex-direction: column; gap: 0.75rem; padding: 0; margin: 0; list-style: none;
	}
	.draft-item {
		display: flex; align-items: center; background: var(--surface-color); border: 1px solid var(--border-color); border-radius: var(--radius-md);
	}
	.draft-link {
		flex-grow: 1; display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem;
	}
	.draft-link:hover { text-decoration: none; }
	.draft-item:hover {
		border-color: var(--primary-color);
		box-shadow: 0 0 0 1px var(--primary-color);
	}
	.continue-editing { font-size: 0.9rem; font-weight: 500; color: var(--primary-color); display: inline-flex; align-items: center; gap: 0.25rem; }
	.draft-delete { padding: 0.75rem; border: none; border-left: 1px solid var(--border-color); background: none; color: var(--text-secondary); cursor: pointer; }
	.draft-delete:hover { color: #e53e3e; }
	.delete-all-drafts-btn { background: none; border: none; color: #ef4444; font-size: 0.9rem; font-weight: 500; cursor: pointer; padding: 0.25rem 0.5rem; border-radius: var(--radius-sm); }
	.delete-all-drafts-btn:hover { background-color: rgba(239, 68, 68, 0.1); }

	/* View Switcher */
	.view-switcher { display: flex; gap: 0.5rem; }
	.view-switcher button { padding: 0.5rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: none; color: var(--text-secondary); cursor: pointer; line-height: 1; }
	.view-switcher button.active { background-color: var(--primary-color); border-color: var(--primary-color); color: white; }

	/* Results Grid */
	.results-container.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 1.5rem;
	}
	.game-card {
		position: relative; display: flex; flex-direction: column; background-color: var(--surface-color); border-radius: var(--radius-lg); border: 1px solid var(--border-color); overflow: hidden; box-shadow: var(--shadow-sm); transition: transform 0.2s, box-shadow 0.2s;
	}
	.game-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); text-decoration: none; }
	.card-icon { aspect-ratio: 1 / 1; background-size: cover; background-position: center; background-color: var(--input-bg); border-bottom: 1px solid var(--border-color); }
	.card-info { flex-grow: 1; padding: 0.75rem; }
	.card-title { margin: 0 0 0.25rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary); }
	.card-publisher { margin: 0; font-size: 0.8rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.card-perf-badge { position: absolute; top: 8px; right: 8px; display: flex; align-items: center; gap: 0.5rem; padding: 4px 8px; font-size: 0.75rem; font-weight: 500; background: rgba(0, 0, 0, 0.6); color: white; border-radius: 999px; backdrop-filter: blur(4px); }
	.card-perf-badge span { display: inline-flex; align-items: center; gap: 0.25rem; }

	/* Results List */
	.results-container.list { display: flex; flex-direction: column; gap: 0.5rem; }
	.list-item { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1rem; background-color: var(--surface-color); border: 1px solid var(--border-color); border-radius: var(--radius-md); transition: all 0.2s ease; }
	.list-item:hover { border-color: var(--primary-color); background-color: color-mix(in srgb, var(--primary-color) 5%, transparent); text-decoration: none; }
	.list-item-info { flex-grow: 1; }
	.title-name { font-weight: 500; color: var(--text-primary); }
	.title-id { display: block; margin-top: 0.1rem; font-size: 0.8rem; color: var(--text-secondary); }
	.perf-tags { display: none; }
	@media (min-width: 640px) {
		.perf-tags { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }
	}
	.perf-tag { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.8rem; color: var(--text-secondary); background-color: var(--input-bg); padding: 0.25rem 0.5rem; border-radius: var(--radius-sm); }

	/* Generic States */
	.no-results {
		grid-column: 1 / -1; padding: 3rem; text-align: center; color: var(--text-secondary); background-color: var(--surface-color); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);
	}
	.no-results h3 { margin: 0 0 0.5rem; }

	.pagination { display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 2rem; }
	.pagination button { padding: 8px 16px; font-weight: 500; background-color: var(--surface-color); border: 1px solid var(--border-color); color: var(--primary-color); border-radius: var(--radius-md); cursor: pointer; }
	.pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
</style>