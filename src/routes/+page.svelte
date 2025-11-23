<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import ListItem from './ListItem.svelte';
	import GridItem from './GridItem.svelte';
	import Drafts from './Drafts.svelte';
	import SearchHero from './SearchHero.svelte';
	import { createImageSet } from '$lib/image';

	let { data } = $props();

	let results = $derived(data.results);
	let recentUpdates = $derived(data.recentUpdates || []);
	let pagination = $derived(data.pagination);
	let stats = $derived(data.stats);

	let search = $state('');
	let dockedFps = $state('');
	let handheldFps = $state('');
	let resolutionType = $state('');
	let selectedSort = $state('date-desc');
	let currentPage = $state(1);
	let viewMode = $state('list');

	// Dynamic Hero Background based on the latest update
	let heroBanner = $derived(recentUpdates.length > 0 ? createImageSet(recentUpdates[0].iconUrl) : null);

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

	function changePage(newPage) {
		currentPage = newPage;
		updateData({ resetPage: false });
		if (browser) window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function handlePillFilter(filter) {
		// Reset all filters first
		search = '';
		dockedFps = '';
		handheldFps = '';
		resolutionType = '';
		
		if (filter.type === 'q') search = filter.value;
		if (filter.type === 'fps') {
			dockedFps = filter.value;
			handheldFps = filter.value;
		}
		updateData({ resetPage: true });
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

<main class="main-content">
	<SearchHero 
		stats={stats}
		heroImage={heroBanner}
		bind:searchValue={search}
		onSearch={() => updateData({ resetPage: true })}
		onFilter={handlePillFilter}
	/>

	<Drafts />

	{#if !search && !hasActiveFilters && recentUpdates.length > 0}
		<section class="results-section">
			<div class='section-header-wrapper'>
				<h2 class="section-header">Recently Updated</h2>
			</div>
			<div class="results-container grid">
				{#each recentUpdates as item (item.id)}
					<GridItem titleData = { item } />
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
					<ListItem titleData = { item } />
				{:else}
					<GridItem titleData = { item } />
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
			<button disabled={pagination.currentPage <= 1} onclick={() => changePage(pagination.currentPage - 1)}>← Previous</button>
			<span>Page {pagination.currentPage} of {pagination.totalPages}</span>
			<button disabled={pagination.currentPage >= pagination.totalPages} onclick={() => changePage(pagination.currentPage + 1)}>Next →</button>
		</div>
	{/if}
</main>

<style>
	.main-content {
		display: flex;
		flex-direction: column;
		gap: 3rem;
		padding: 1rem;
		margin: 0 auto;
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

	.results-section {
		margin-top: 0;
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
		transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
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
		transition: background-color 0.2s ease, opacity 0.2s ease;
	}

	.pagination button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>