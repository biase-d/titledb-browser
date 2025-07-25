<script>
	import { titleIndex, fullTitleIndex } from '$lib/stores'
	import { getCachedFullIndex, setCachedFullIndex } from '$lib/db.js'
	import { fullIndexUrl, metadataUrl, publisherUrl } from '$lib/index.js'
	import { slide } from 'svelte/transition'
	import FilterControls from './FilterControls.svelte'
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { browser } from '$app/environment'

	let search = ''
	let defaultList = []
	let showFilters = false
	let debounceTimer
	let selectedSort = 'default'

	const itemsPerPage = 50
	let currentPage = 1

	let metadata = { publishers: [], years: [] }
	let selectedPublisher = ''
	let selectedMinYear = ''
	let selectedMaxYear = ''
	let minSizeMB = ''
	let maxSizeMB = ''

	let publisherData = []
	let isLoadingData = false

	onMount(async () => {
		try {
			const res = await fetch(metadataUrl)
			if (res.ok) metadata = await res.json()
		} catch (e) { console.error('Could not load filter metadata:', e) }

		const urlParams = $page.url.searchParams
		const initialSearch = urlParams.get('q')
		const initialPublisher = urlParams.get('publisher')
		const initialMinSize = urlParams.get('minSizeMB')
		const initialMaxSize = urlParams.get('maxSizeMB')

		if (initialSearch) search = initialSearch
		if (initialPublisher) selectedPublisher = initialPublisher
		if (initialMinSize) minSizeMB = initialMinSize
		if (initialMaxSize) maxSizeMB = initialMaxSize

		if (initialPublisher || initialMinSize || initialMaxSize) {
			showFilters = true
		}
	})

	$: if (selectedPublisher && browser) {
		(async () => {
			isLoadingData = true
			const fileName = selectedPublisher.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.json'
			try {
				const res = await fetch(`${publisherUrl}/${fileName}`)
				if (res.ok) publisherData = await res.json()
			} catch (e) { console.error('Failed to fetch publisher data:', e); publisherData = [] }
			finally { isLoadingData = false }
		})()
	} else {
		publisherData = []
	}

	$: if ((selectedMinYear || selectedMaxYear || minSizeMB || maxSizeMB || selectedSort === 'date-desc' || selectedSort === 'size-desc') && !selectedPublisher && browser) {
		ensureFullIndexLoaded()
	}

	async function ensureFullIndexLoaded () {
		if ($fullTitleIndex.length > 0 || isLoadingData) return
		isLoadingData = true
		try {
			const cached = await getCachedFullIndex()
			if (cached) {
				$fullTitleIndex = cached
				return
			}
			const res = await fetch(fullIndexUrl)
			if (res.ok) {
				const data = await res.json()
				await setCachedFullIndex(data)
				$fullTitleIndex = data
			}
		} catch (e) { console.error('Failed to load full index', e) }
		finally { isLoadingData = false }
	}

	$: isSearchingOrFiltering = !!search || !!selectedPublisher || !!selectedMinYear || !!selectedMaxYear || !!minSizeMB || !!maxSizeMB
	$: activeFilterCount = (selectedPublisher ? 1 : 0) + (selectedMinYear ? 1 : 0) + (selectedMaxYear ? 1 : 0) + (minSizeMB ? 1 : 0) + (maxSizeMB ? 1 : 0)

	$: results = (() => {
		if (Object.keys($titleIndex).length === 0) return []
		const needsRichData = !!selectedPublisher || !!selectedMinYear || !!selectedMaxYear || !!minSizeMB || !!maxSizeMB || selectedSort === 'date-desc' || selectedSort === 'size-desc'
		const lowerCaseSearch = search.toLowerCase()

		let sourceData
		if (selectedPublisher) sourceData = publisherData
		else if (needsRichData) sourceData = $fullTitleIndex
		else sourceData = Object.entries($titleIndex).map(([id, names]) => ({ id, names }))

		if (!isSearchingOrFiltering && selectedSort === 'default') {
			if (defaultList.length === 0) {
				defaultList = shuffleArray(Object.entries($titleIndex)).slice(0, 50).map(([id, names]) => ({ id, names }))
			}
			return defaultList
		}

		const minBytes = minSizeMB ? parseFloat(minSizeMB) * 1024 * 1024 : null
		const maxBytes = maxSizeMB ? parseFloat(maxSizeMB) * 1024 * 1024 : null

		let filteredData = sourceData.filter(item => {
			if (lowerCaseSearch) {
				const nameMatch = item.names.some(name => name.toLowerCase().includes(lowerCaseSearch))
				const idMatch = item.id?.toLowerCase().includes(lowerCaseSearch)
				if (!(nameMatch || idMatch)) return false
			}
			if (needsRichData) {
				const itemYear = item.releaseDate ? parseInt(item.releaseDate.toString().substring(0, 4)) : null
				if (selectedMinYear && (!itemYear || itemYear < parseInt(selectedMinYear))) return false
				if (selectedMaxYear && (!itemYear || itemYear > parseInt(selectedMaxYear))) return false
				if (minBytes !== null && (item.sizeInBytes === undefined || item.sizeInBytes < minBytes)) return false
				if (maxBytes !== null && (item.sizeInBytes === undefined || item.sizeInBytes > maxBytes)) return false
			}
			return true
		})

		if (selectedSort !== 'default') {
			filteredData = [...filteredData]
			switch (selectedSort) {
				case 'name-asc':
					filteredData.sort((a, b) => a.names[0].localeCompare(b.names[0]))
					break
				case 'date-desc':
					if (needsRichData) filteredData.sort((a, b) => (b.releaseDate || 0) - (a.releaseDate || 0))
					break
				case 'size-desc':
					if (needsRichData) filteredData.sort((a, b) => (b.sizeInBytes || 0) - (a.sizeInBytes || 0))
					break
			}
		}

		return filteredData
	})();

	$: totalPages = Math.ceil(results.length / itemsPerPage)
	$: paginatedResults = isSearchingOrFiltering || selectedSort !== 'default'
		? results.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
		: results

	$: if (isSearchingOrFiltering || selectedSort !== 'default') {
		currentPage = 1
	}

	$: if (browser) {
		clearTimeout(debounceTimer)
		debounceTimer = setTimeout(() => {
			const url = new URL($page.url)
			if (search) url.searchParams.set('q', search)
			else url.searchParams.delete('q')
			goto(url, { keepFocus: true, noScroll: true, replaceState: true })
		}, 300)
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

	<div class="controls-bar">
		<button class="filter-button" on:click={() => (showFilters = !showFilters)} disabled={metadata.publishers.length === 0}>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.692V13.5a.5.5 0 0 1-.342.474l-3 1.5A.5.5 0 0 1 6 14.5V8.692L1.628 3.834A.5.5 0 0 1 1.5 3.5z"/></svg>
			<span>Filters</span>
			{#if activeFilterCount > 0}
				<span class="filter-badge">{activeFilterCount}</span>
			{/if}
		</button>

		<select class="sort-select" bind:value={selectedSort}>
			<option value="default">Sort by...</option>
			<option value="name-asc">Name (A-Z)</option>
			<option value="date-desc">Newest First</option>
			<option value="size-desc">Largest First</option>
		</select>
	</div>

	{#if showFilters}
		<div class="filter-panel" transition:slide={{ duration: 250 }}>
			<FilterControls
				availablePublishers={metadata.publishers}
				years={metadata.years}
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
		{#if isLoadingData}
			Loading Data...
		{:else if isSearchingOrFiltering || selectedSort !== 'default'}
			{results.length} Matching Titles
		{:else}
			Featured Titles
		{/if}
	</h2>

	<ul class="results-list">
		{#each paginatedResults as item (item.id)}
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

	{#if totalPages > 1}
		<div class="pagination">
			<button disabled={currentPage === 1} on:click={() => currentPage--}>
				← Previous
			</button>
			<span>Page {currentPage} of {totalPages}</span>
			<button disabled={currentPage === totalPages} on:click={() => currentPage++}>
				Next →
			</button>
		</div>
	{/if}
</div>

<style>
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

	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		margin-top: 2rem;
	}

	.pagination span {
		color: var(--text-secondary);
		font-size: 0.9rem;
	}

	.pagination button {
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		color: var(--primary-color);
		padding: 8px 16px;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
	}

	.pagination button:hover:not(:disabled) {
		background-color: var(--input-bg);
	}

	.pagination button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>