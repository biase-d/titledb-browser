<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import ListItem from '../../ListItem.svelte';
	import GridItem from '../../GridItem.svelte';

	let { data } = $props();

	let results = $derived(data.results);
	let pagination = $derived(data.pagination);
	let publisherName = $derived(data.publisherName);

	let viewMode = $state('list');

	onMount(() => {
		const savedView = localStorage.getItem('viewMode');
		if (savedView === 'grid' || savedView === 'list') viewMode = savedView;
	});

	function changePage(newPage) {
		const url = new URL(window.location.href);
		url.searchParams.set('page', newPage.toString());
		goto(url, { noScroll: true });
		if (browser) window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function toggleView(mode) {
		viewMode = mode;
		if (browser) localStorage.setItem('viewMode', mode);
	}
</script>

<svelte:head>
	<title>{publisherName} Games - Switch Performance</title>
</svelte:head>

<main class="page-container">
	<div class="header">
		<a href="/" class="back-link">← Back to Search</a>
		<h1>{publisherName}</h1>
		<p class="subtitle">Showing {pagination.totalItems} games published by {publisherName}</p>
	</div>

	<div class="controls">
		<div class="view-switcher">
			<button class:active={viewMode === 'list'} onclick={() => toggleView('list')} title="List View"><Icon icon="mdi:view-list" /></button>
			<button class:active={viewMode === 'grid'} onclick={() => toggleView('grid')} title="Grid View"><Icon icon="mdi:view-grid" /></button>
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
				<h3>No Games Found</h3>
				<p>We couldn't find any games for this publisher in our database.</p>
			</div>
		{/each}
	</div>

	{#if pagination?.totalPages > 1}
		<div class="pagination">
			<button disabled={pagination.currentPage <= 1} onclick={() => changePage(pagination.currentPage - 1)}>← Previous</button>
			<span>Page {pagination.currentPage} of {pagination.totalPages}</span>
			<button disabled={pagination.currentPage >= pagination.totalPages} onclick={() => changePage(pagination.currentPage + 1)}>Next →</button>
		</div>
	{/if}
</main>

<style>
	.page-container {
		max-width: 1100px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}

	.header {
		margin-bottom: 2rem;
	}

	.back-link {
		display: inline-block;
		margin-bottom: 1rem;
		color: var(--text-secondary);
		text-decoration: none;
		font-size: 0.9rem;
	}
	.back-link:hover { text-decoration: underline; }

	h1 {
		font-size: 2.5rem;
		margin: 0 0 0.5rem;
		color: var(--text-primary);
	}

	.subtitle {
		color: var(--text-secondary);
		font-size: 1.1rem;
	}

	.controls {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 1.5rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--border-color);
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
		padding: 4rem 2rem;
		text-align: center;
		color: var(--text-secondary);
		background-color: var(--surface-color);
		border-radius: var(--radius-lg);
		border: 1px dashed var(--border-color);
	}

	.no-results h3 {
		margin: 0 0 0.5rem;
		font-size: 1.5rem;
		color: var(--text-primary);
	}

	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		margin-top: 3rem;
	}

	.pagination button {
		padding: 8px 16px;
		font-weight: 500;
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		color: var(--primary-color);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all 0.2s;
	}

	.pagination button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	
	.pagination button:not(:disabled):hover {
		background-color: var(--input-bg);
		border-color: var(--primary-color);
	}
</style>