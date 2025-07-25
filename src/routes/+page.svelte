<script>
	import { titleIndex, fullTitleIndex } from '$lib/stores'
	import { getCachedFullIndex, setCachedFullIndex } from '$lib/db.js'
	import { fullIndexUrl } from '$lib/index.js'
	import { slide } from 'svelte/transition'
	import FilterControls from './FilterControls.svelte'

	let search = ''
	let isFullIndexLoading = false
	let availablePublishers = []
	let selectedPublisher = ''
	let selectedYear = ''
	let defaultList = [] // shape: [{id, names}]

	$: filteringEnabled = $fullTitleIndex.length > 0

	$: if (filteringEnabled) {
		const publishers = new Set($fullTitleIndex.map(t => t.publisher).filter(p => p && p !== 'N/A'))
		availablePublishers = [...publishers].sort()
	}

	$: results = (() => {
		if (Object.keys($titleIndex).length === 0) return []

		const lowerCaseSearch = search.toLowerCase()
		const isSearching = !!lowerCaseSearch || !!selectedPublisher || !!selectedYear

		if (filteringEnabled) {
			return $fullTitleIndex.filter(item => {
				const nameMatch = lowerCaseSearch ? item.names.some(name => name.toLowerCase().includes(lowerCaseSearch)) : true
				const idMatch = lowerCaseSearch ? item.id.toLowerCase().includes(lowerCaseSearch) : true
				const publisherMatch = selectedPublisher ? item.publisher === selectedPublisher : true
				const yearMatch = selectedYear ? item.releaseDate?.toString().startsWith(selectedYear) : true

				return (nameMatch || idMatch) && publisherMatch && yearMatch
			})
		}

		if (!isSearching) {
			if (defaultList.length === 0) {
				const allEntries = Object.entries($titleIndex)
				const shuffled = shuffleArray(allEntries).slice(0, 50)
				defaultList = shuffled.map(([id, names]) => ({ id, names }))
			}
			return defaultList
		}

		const liteResults = Object.entries($titleIndex).filter(([id, names]) => {
			const nameMatch = names.some(name => name.toLowerCase().includes(lowerCaseSearch))
			const idMatch = id.toLowerCase().includes(lowerCaseSearch)
			return nameMatch || idMatch
		})

		return liteResults.map(([id, names]) => ({ id, names }))
	})();

	async function enableFiltering() {
		isFullIndexLoading = true
		const cached = await getCachedFullIndex()
		if (cached) {
			$fullTitleIndex = cached
		} else {
			const res = await fetch(fullIndexUrl)
			const data = await res.json()
			await setCachedFullIndex(data)
			$fullTitleIndex = data
		}
		isFullIndexLoading = false
	}

	function shuffleArray (array) {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]]
		}
		return array
	}
</script>

<div class="search-container">
	<div class="search-input-wrapper">
		<input bind:value={search} type="text" placeholder="Search by name or Title ID..." class="search-input"/>
		{#if search}<button class="clear-button" on:click={() => (search = '')} title="Clear search">×</button>{/if}
	</div>

	{#if filteringEnabled}
		<FilterControls
			{availablePublishers}
			bind:selectedPublisher
			bind:selectedYear
		/>
	{:else}
		<div class="enable-filters-box">
			<p>Want more power? Enable advanced filtering.</p>
			<button on:click={enableFiltering} disabled={isFullIndexLoading}>
				{isFullIndexLoading ? 'Loading Filter Data...' : 'Enable Filtering'}
			</button>
		</div>
	{/if}

	<h2 class="list-header">
		{#if search || selectedPublisher || selectedYear}
			{results.length} Matching Titles
		{:else}
			Featured Titles
		{/if}
	</h2>

	<ul class="results-list">
		{#each results.slice(0, 50) as item (item.id)}
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
</div>

<style>
	.search-container {
		max-width: 600px;
		margin: 0 auto;
	}

	.search-input {
		width: 100%;
		padding: 12px 16px;
		font-size: 1rem;
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
		background-color: var(--surface-color);
		color: var(--text-color);
		box-sizing: border-box;
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
		color: var(--text-color);
		opacity: 0.7;
		background-color: var(--surface-color);
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
		color: var(--text-color);
		opacity: 0.5;
		cursor: pointer;
	}
	.clear-button:hover {
		opacity: 1;
	}
		.filter-controls {
		display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1.5rem;
		padding: 1rem; background-color: var(--surface-color); border-radius: var(--border-radius);
	}
	.filter-select {
		border: 1px solid var(--border-color); background-color: var(--background-color); color: var(--text-color);
		padding: 8px; border-radius: 6px; font-size: 0.9rem;
	}
	.reset-button {
		padding: 8px 16px; border: 1px solid var(--primary-color); background: transparent;
		color: var(--primary-color); border-radius: 6px; cursor: pointer; margin-left: auto;
	}
	.enable-filters-box {
		margin-top: 1.5rem; padding: 1rem 1.5rem; text-align: center;
		background-color: var(--surface-color); border-radius: var(--border-radius);
	}
	.enable-filters-box p { margin: 0 0 0.75rem; }
	.enable-filters-box button {
		background-color: var(--primary-color); color: white; border: none;
		padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;
	}
	.enable-filters-box button:disabled { background-color: #888; }
</style>
