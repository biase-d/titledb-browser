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

	let headerText = $derived((() => {
		const count = pagination?.totalItems?.toLocaleString() || 0;
		if (search && hasActiveFilters) {
			return `Found ${count} titles matching your search and filters`;
		} else if (search) {
			return `Found ${count} titles for your search`;
		} else if (hasActiveFilters) {
			return `Found ${count} titles matching your filters`;
		} else {
			return 'All Titles with Performance Data';
		}
	})());

	let activeFilterSummary = $derived((() => {
		const summary = [];
		if (dockedFps) summary.push(`Docked: ${dockedFps} FPS`);
		if (handheldFps) summary.push(`Handheld: ${handheldFps} FPS`);
		if (resolutionType) summary.push(`Resolution: ${resolutionType}`);
		return summary;
	})());
</script>

<svelte:head>
	<title>Titledb Browser</title>
</svelte:head>

<div class="page-container">
	<div class="search-input-wrapper">
		<input bind:value={search} oninput={() => updateData({ resetPage: true })} type="text" placeholder="Search by game name or title ID..." class="search-input"/>
		{#if search}<button class="clear-button" onclick={() => { search = ''; updateData({ resetPage: true }); }} title="Clear search">×</button>{/if}
	</div>

	{#if stats}
		<div class="stats-bar">
			<div class="stat-item">
				<span class="stat-value">{stats.totalGames.toLocaleString()}</span>
				<span class="stat-label">Games Tracked</span>
			</div>
			<div class="stat-item">
				<span class="stat-value">{stats.totalProfiles.toLocaleString()}</span>
				<span class="stat-label">Performance Profiles</span>
			</div>
			<div class="stat-item">
				<span class="stat-value">{stats.totalContributors.toLocaleString()}</span>
				<span class="stat-label">Contributors</span>
			</div>
		</div>
	{/if}

	<div class="controls-bar">
		<div class="filter-controls">
			<select bind:value={dockedFps} onchange={() => updateData({ resetPage: true })}>
				<option value="">Docked FPS</option>
				<option value="60">60 FPS</option>
				<option value="30">30 FPS</option>
			</select>
			<select bind:value={handheldFps} onchange={() => updateData({ resetPage: true })}>
				<option value="">Handheld FPS</option>
				<option value="60">60 FPS</option>
				<option value="30">30 FPS</option>
			</select>
			<select bind:value={resolutionType} onchange={() => updateData({ resetPage: true })}>
				<option value="">Resolution</option>
				<option value="Dynamic">Dynamic</option>
				<option value="Fixed">Fixed</option>
				<option value="Multiple Fixed">Multiple Fixed</option>
			</select>
			{#if hasActiveFilters}
				<button class="reset-filters-btn" onclick={resetFilters}>Reset</button>
			{/if}
		</div>
		
		<select class="sort-select" bind:value={selectedSort} onchange={() => updateData({ resetPage: true })}>
			<option value="relevance-desc" disabled={!search}>Sort: Relevance</option>
			<option value="date-desc">Sort: Newest First</option>
			<option value="name-asc">Sort: Name (A-Z)</option>
		</select>
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
							<span class="continue-editing">Continue Editing →</span>
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
		<div class="recent-updates-section">
			<div class='section-header-wrapper'>
				<h2 class="section-header">Recently Added Performance Data</h2>
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
		</div>
	{/if}

	<div class="main-results-section">
		<div class="section-header-wrapper">
			<div>
				<h2 class="section-header">
					{headerText}
				</h2>
				{#if activeFilterSummary.length > 0}
					<p class="active-filters-summary">
						{activeFilterSummary.join(' / ')}
					</p>
				{/if}
			</div>
			<div class="view-switcher">
				<button class:active={viewMode === 'list'} onclick={() => viewMode = 'list'} title="List View"><Icon icon="mdi:view-list" /></button>
				<button class:active={viewMode === 'grid'} onclick={() => viewMode = 'grid'} title="Grid View"><Icon icon="mdi:view-grid" /></button>
			</div>
		</div>

		<div class="results-container {viewMode}">
			{#each results as item (item.id)}
				{#if viewMode === 'list'}
					<a href={`/title/${item.id}`} class="list-item" transition:slide|local data-sveltekit-preload-data="hover">
						<span class="title-name">{item.names[0]}</span>
						<span class="title-id">({item.id})</span>
					</a>
				{:else}
					<a href={`/title/${item.id}`} class="game-card" transition:slide|local data-sveltekit-preload-data="hover">
						<div class="card-icon" style="background-image: url({item.iconUrl || '/favicon.svg'})"></div>
						<div class="card-info">
							<p class="card-title">{item.names[0]}</p>
							<p class="card-publisher">{item.publisher || 'N/A'}</p>
						</div>
						{#if item.performance}
							<div class="card-perf-badge">
								<Icon icon="mdi:gamepad-variant-outline" />
								<span>{item.performance.docked.target_fps || 'N/A'} FPS</span>
							</div>
						{/if}
					</a>
				{/if}
			{:else}
				<div class="no-results">No titles found for your criteria</div>
			{/each}
		</div>
	</div>

	{#if pagination?.totalPages > 1}
		<div class="pagination">
			<button disabled={pagination.currentPage <= 1} onclick={() => changePage(pagination.currentPage - 1)}>← Previous</button>
			<span>Page {pagination.currentPage} of {pagination.totalPages}</span>
			<button disabled={pagination.currentPage >= pagination.totalPages} onclick={() => changePage(pagination.currentPage + 1)}>Next →</button>
		</div>
	{/if}
</div>

<style>
	.page-container {
		max-width: 1024px;
		margin: 0 auto;
	}

	.search-input-wrapper {
		position: relative;
	}

	.search-input {
		width: 100%;
		padding: 12px 16px;
		font-size: 1rem;
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
		background-color: var(--input-bg);
		color: var(--text-primary);
		box-sizing: border-box;
	}

	.clear-button {
		position: absolute;
		top: 1px;
		right: 1px;
		bottom: 1px;
		padding: 0 15px;
		font-size: 1.5rem;
		border: none;
		background: transparent;
		color: var(--text-primary);
		opacity: 0.5;
		cursor: pointer;
	}

	.stats-bar {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
		margin-top: 2rem;
		padding: 1rem;
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
	}

	.stat-item {
		text-align: center;
	}

	.stat-value {
		font-size: 1.75rem;
		font-weight: 600;
		color: var(--primary-color);
	}

	.stat-label {
		font-size: 0.8rem;
		color: var(--text-secondary);
		text-transform: uppercase;
	}

	.controls-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.filter-controls {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.filter-controls select,
	.sort-select {
		padding: 8px 14px;
		font-size: 0.9rem;
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		color: var(--text-primary);
		border-radius: var(--border-radius);
		cursor: pointer;
	}

	.reset-filters-btn {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--primary-color);
		background: none;
		border: none;
		cursor: pointer;
	}

	.sort-select {
		-webkit-appearance: none;
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%2364748b' viewBox='0 0 16 16'%3E%3Cpath fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.75rem center;
		padding-right: 2.5rem;
	}

	.section-header-wrapper {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin: 2.5rem 0 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--border-color);
	}

	.section-header {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.active-filters-summary {
		margin: 0.25rem 0 0;
		font-size: 0.8rem;
		color: var(--text-secondary);
	}

	.drafts-section,
	.recent-updates-section,
	.main-results-section {
		margin-top: 2.5rem;
	}

	.drafts-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0;
		margin: 0;
		list-style: none;
	}

	.draft-item {
		display: flex;
		align-items: center;
		background: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
	}

	.draft-link {
		flex-grow: 1;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
	}

	.continue-editing {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--primary-color);
	}

	.draft-delete {
		padding: 0.75rem;
		border: none;
		border-left: 1px solid var(--border-color);
		background: none;
		color: var(--text-secondary);
		cursor: pointer;
	}

	.draft-delete:hover {
		color: #e53e3e;
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

	.results-container.list {
		display: flex;
		flex-direction: column;
		background: var(--surface-color);
		border-radius: var(--border-radius);
		overflow: hidden;
		box-shadow: var(--box-shadow);
	}

	.list-item {
		display: block;
		padding: 12px 16px;
		border-bottom: 1px solid var(--border-color);
		transition: background-color 0.2s;
	}

	.list-item:hover {
		background-color: var(--input-bg);
	}

	.list-item:last-child {
		border-bottom: none;
	}

	.title-name {
		font-weight: 500;
	}

	.title-id {
		margin-left: 0.5rem;
		font-size: 0.8rem;
		color: var(--text-secondary);
	}

	.results-container.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 1.5rem;
	}

	.game-card {
		position: relative;
		display: flex;
		flex-direction: column;
		background-color: var(--surface-color);
		border-radius: var(--border-radius);
		overflow: hidden;
		box-shadow: var(--box-shadow);
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.game-card:hover {
		transform: translateY(-3px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
	}

	.card-icon {
		aspect-ratio: 1 / 1;
		background-size: cover;
		background-position: center;
		background-color: var(--input-bg);
	}

	.card-info {
		flex-grow: 1;
		padding: 0.75rem;
	}

	.card-title {
		margin: 0 0 0.25rem;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.card-publisher {
		margin: 0;
		font-size: 0.8rem;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.card-perf-badge {
		position: absolute;
		top: 8px;
		right: 8px;
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 4px 8px;
		font-size: 0.75rem;
		font-weight: 500;
		background: rgba(0, 0, 0, 0.6);
		color: white;
		border-radius: 999px;
	}

	.no-results {
		grid-column: 1 / -1;
		padding: 2rem;
		text-align: center;
		color: var(--text-secondary);
		background-color: var(--surface-color);
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

	.delete-all-drafts-btn {
		background: none;
		border: none;
		color: #ef4444;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		border-radius: var(--border-radius);
	}
	.delete-all-drafts-btn:hover {
		background-color: rgba(239, 68, 68, 0.1);
	}
</style>
