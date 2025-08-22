<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
    import ListItem from './ListItem.svelte';
    import GridItem from './GridItem.svelte';
    import Drafts from './Drafts.svelte';

	let { data } = $props();

	let results = $derived(data.results);
	let recentUpdates = $derived(data.recentUpdates || []);
	let pagination = $derived(data.pagination);

	let search = $state('');
	let dockedFps = $state('');
	let handheldFps = $state('');
	let resolutionType = $state('');
	let selectedSort = $state('date-desc');
	let currentPage = $state(1);
	let viewMode = $state('list'); // 'list' or 'grid'

	/**
     * @type {number | undefined}
     */
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

	/**
     * @param {number} newPage
     */
	function changePage(newPage) {
		currentPage = newPage;
		updateData({ resetPage: false });
		if (browser) window.scrollTo({ top: 0, behavior: 'smooth' });
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
	<div class="hero-section">
		<h1>Switch Performance</h1>
		<p>A community-driven database of game performance metrics, from framerates to resolution</p>
		<div class="search-input-wrapper">
			<Icon icon="mdi:magnify" class="search-icon" />
			<input bind:value={search} oninput={() => updateData({ resetPage: true })} type="text" placeholder="Search by game name or title ID..." class="search-input"/>
			{#if search}<button class="clear-button" onclick={() => { search = ''; updateData({ resetPage: true }); }} title="Clear search"><Icon icon="mdi:close"/></button>{/if}
		</div>
	</div>
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
		max-width: 1024px;
		margin: 0 auto;
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
