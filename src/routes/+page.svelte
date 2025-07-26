<script>
	import { slide } from 'svelte/transition';
	import FilterControls from './FilterControls.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	/** @type {import('./$types').PageData} */
	let { data } = $props();

	let results = $derived(data.results);
	let meta = $derived(data.meta);
	let pagination = $derived(data.pagination);

	let search = $state('');
	let selectedPublisher = $state('');
	let selectedMinYear = $state('');
	let selectedMaxYear = $state('');
	let minSizeMB = $state('');
	let maxSizeMB = $state('');
	let selectedSort = $state('date-desc');
	let showFilters = $state(false);
	let currentPage = $state(1);

	let debounceTimer;

	onMount(() => {
		const { searchParams } = $page.url;
		search = searchParams.get('q') || '';
		selectedPublisher = searchParams.get('publisher') || '';
		selectedMinYear = searchParams.get('minYear') || '';
		selectedMaxYear = searchParams.get('maxYear') || '';
		minSizeMB = searchParams.get('minSizeMB') || '';
		maxSizeMB = searchParams.get('maxSizeMB') || '';
		selectedSort = searchParams.get('sort') || 'date-desc';
		currentPage = parseInt(searchParams.get('page'), 10) || 1;

		if (selectedPublisher || selectedMinYear || selectedMaxYear || minSizeMB || maxSizeMB) {
			showFilters = true;
		}
	});

	function updateData({ resetPage = false } = {}) {
		if (!browser) return;

		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			const url = new URL(window.location.href);

			if (resetPage) {
				currentPage = 1;
			}

			const updateParam = (key, value, defaultValue = '') => {
				if (value && value.toString() !== defaultValue) url.searchParams.set(key, value);
				else url.searchParams.delete(key);
			};

			updateParam('q', search);
			updateParam('publisher', selectedPublisher);
			updateParam('minYear', selectedMinYear);
			updateParam('maxYear', selectedMaxYear);
			updateParam('minSizeMB', minSizeMB);
			updateParam('maxSizeMB', maxSizeMB);
			updateParam('sort', selectedSort, 'date-desc');
			updateParam('page', currentPage, '1');

			if (url.href !== window.location.href) {
				goto(url, { replaceState: true, noScroll: true, keepFocus: true });
			}
		}, 350);
	}

	function changePage(newPage) {
		currentPage = newPage;
		updateData({ resetPage: false });
	}

	let activeFilterCount = $derived((selectedPublisher ? 1 : 0) + (selectedMinYear ? 1 : 0) + (selectedMaxYear ? 1 : 0) + (minSizeMB ? 1 : 0) + (maxSizeMB ? 1 : 0));
</script>

<div class="search-container">
	<div class="search-input-wrapper">
		<input bind:value={search} on:input={() => updateData({ resetPage: true })} type="text" placeholder="Search the entire database..." class="search-input"/>
		{#if search}<button class="clear-button" on:click={() => { search = ''; updateData({ resetPage: true }); }} title="Clear search">×</button>{/if}
	</div>

	<div class="controls-bar">
		<button class="filter-button" on:click={() => (showFilters = !showFilters)} disabled={!meta?.publishers?.length}>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.692V13.5a.5.5 0 0 1-.342.474l-3 1.5A.5.5 0 0 1 6 14.5V8.692L1.628 3.834A.5.5 0 0 1 1.5 3.5z"/></svg>
			<span>Filters</span>
			{#if activeFilterCount > 0}
				<span class="filter-badge">{activeFilterCount}</span>
			{/if}
		</button>

		<select class="sort-select" bind:value={selectedSort} on:change={() => updateData({ resetPage: true })}>
			<option value="date-desc">Sort: Newest First</option>
			<option value="size-desc">Sort: Largest First</option>
			<option value="name-asc">Sort: Name (A-Z)</option>
		</select>
	</div>

	{#if showFilters}
		<div class="filter-panel" transition:slide={{ duration: 250 }}>
			<FilterControls
				on:change={() => updateData({ resetPage: true })}
				availablePublishers={meta?.publishers || []}
				years={meta?.years || []}
				bind:selectedPublisher
				bind:selectedMinYear
				bind:selectedMaxYear
				bind:minSizeMB
				bind:maxSizeMB
				on:close={() => (showFilters = false)}
			/>
		</div>
	{/if}

	<h2 class="list-header">
		{#if search || activeFilterCount > 0}
			Found {pagination?.totalItems?.toLocaleString() || 0} Matching Titles
		{:else}
			Showing {pagination?.totalItems?.toLocaleString() || 0} Titles with Performance Data
		{/if}
	</h2>

	<ul class="results-list">
		{#each results as item (item.id)}
			<li transition:slide|local>
				<a href={`/title/${item.id}`} data-sveltekit-preload-data="hover">
					<span class="title-name">{item.names[0]}</span>
					<span class="title-id">({item.id})</span>
				</a>
			</li>
		{:else}
			<li class="no-results">No titles found.</li>
		{/each}
	</ul>

	{#if pagination?.totalPages > 1}
		<div class="pagination">
			<button disabled={pagination.currentPage <= 1} on:click={() => changePage(pagination.currentPage - 1)}>
				← Previous
			</button>
			<span>Page {pagination.currentPage} of {pagination.totalPages}</span>
			<button disabled={pagination.currentPage >= pagination.totalPages} on:click={() => changePage(pagination.currentPage + 1)}>
				Next →
			</button>
		</div>
	{/if}
</div>

<style>
	.drafts-section {
		margin-top: 2.5rem;
	}
	.draft-link {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.continue-editing {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--secondary-color);
	}
	.search-container {
		max-width: 600px;
		margin: 0 auto;
	}

	.search-input-wrapper {
		position: relative;
	}

	.clear-button {
		position: absolute;
		right: 1px;
		top: 1px;
		bottom: 1px;
		border: none;
		background: transparent;
		padding: 0 15px;
		font-size: 1.5rem;
		color: var(--text-primary);
		opacity: 0.5;
		cursor: pointer;
	}

	.clear-button:hover {
		opacity: 1;
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

	.controls-bar {
		margin-top: 1.5rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.sort-select {
		-webkit-appearance: none;
		-moz-appearance: none;
		appearance: none;
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		color: var(--text-primary);
		padding: 10px 32px 10px 18px;
		font-size: 1rem;
		border-radius: var(--border-radius);
		cursor: pointer;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%2364748b' viewBox='0 0 16 16'%3E%3Cpath fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.75rem center;
	}

	.sort-select:hover {
		border-color: var(--primary-color);
	}

	.filter-button {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		color: var(--text-primary);
		padding: 10px 18px;
		font-size: 1rem;
		border-radius: var(--border-radius);
		cursor: pointer;
		transition: all 0.2s ease;
		user-select: none;
	}

	.filter-button:hover {
		border-color: var(--primary-color);
		color: var(--primary-color);
	}

	.filter-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.filter-badge {
		background-color: var(--primary-color);
		color: var(--primary-action-text);
		font-size: 0.75rem;
		font-weight: bold;
		padding: 3px 8px;
		border-radius: 999px;
		line-height: 1;
	}

	.filter-panel {
		margin-top: 1rem;
		overflow: hidden;
		padding: 1.5rem;
		background-color: var(--surface-color);
		border-radius: var(--border-radius);
		border: 1px solid var(--border-color);
	}

	.list-header {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 2rem 0 1rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--border-color);
	}

	.results-list {
		list-style: none;
		padding: 0;
		margin: 0;
		background: var(--surface-color);
		border-radius: var(--border-radius);
		overflow: hidden;
		box-shadow: var(--box-shadow);
	}

	.results-list li a {
		display: block;
		padding: 12px 16px;
		border-bottom: 1px solid var(--border-color);
		transition: background-color 0.2s ease;
	}

	.results-list li:last-child a {
		border-bottom: none;
	}

	.results-list li a:hover {
		background-color: rgba(0, 0, 0, 0.05);
		text-decoration: none;
	}

	.title-name {
		font-weight: 500;
	}

	.title-id {
		font-size: 0.8rem;
		opacity: 0.6;
		margin-left: 0.5rem;
	}

	.no-results {
		padding: 16px;
		text-align: center;
		color: var(--text-primary);
		opacity: 0.7;
		background-color: var(--surface-color);
	}
	.pagination { display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 2rem; }
	.pagination span { color: var(--text-secondary); font-size: 0.9rem; }
	.pagination button { background-color: var(--surface-color); border: 1px solid var(--border-color); color: var(--primary-color); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; }
	.pagination button:hover:not(:disabled) { background-color: var(--input-bg); }
	.pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
</style>