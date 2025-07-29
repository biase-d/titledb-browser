<script>
	import Icon from '@iconify/svelte'

	let {
		initialGroup = [],
		onUpdate = (/** @type {{ id: string; name: string; }[]} */ group) => {}
	} = $props()

	let searchInput = $state('')
	let searchResults = $state([])
	let searchLoading = $state(false)
	let debounceTimer

	let currentGroup = $state([...initialGroup])

	async function performSearch () {
		if (searchInput.length < 3) {
			searchResults = []
			return
		}
		searchLoading = true
		try {
			const res = await fetch(`/api/v1/games/search?q=${encodeURIComponent(searchInput)}`)
			if (res.ok) {
				searchResults = await res.json()
			}
		} catch (e) {
			console.error('Search failed', e)
		} finally {
			searchLoading = false
		}
	}

	function handleSearchInput () {
		clearTimeout(debounceTimer)
		debounceTimer = setTimeout(performSearch, 300)
	}

	function isAlreadyInGroup (title) {
		return currentGroup.some((t) => t.id === title.id)
	}

	function addToGroup (title) {
		if (!isAlreadyInGroup(title)) {
			currentGroup.push(title)
			onUpdate(currentGroup)
			searchInput = ''
			searchResults = []
		}
	}

	function removeFromGroup (titleId) {
		const originalTitleId = new URL(window.location.href).pathname.split('/')[2]
		if (titleId === originalTitleId) {
			return // Prevent removing the primary title for the contribution
		}

		const index = currentGroup.findIndex((t) => t.id === titleId)
		if (index > -1) {
			currentGroup.splice(index, 1)
			onUpdate(currentGroup)
		}
	}
</script>

<div class="grouping-controls-container">
	<p>Your submission will apply to all of the following titles. Add or remove titles to change the grouping for this entry.</p>

	<div class="current-group-list">
		{#each currentGroup as title (title.id)}
			<div class="group-item">
				<span>{title.name} ({title.id})</span>
				<button type="button" on:click={() => removeFromGroup(title.id)} title="Remove from group">
					<Icon icon="mdi:close" />
				</button>
			</div>
		{/each}
	</div>

	<div class="search-section">
		<label for="group-search">Add another title to this group</label>
		<div class="search-input-wrapper">
			<input
				id="group-search"
				type="text"
				bind:value={searchInput}
				on:input={handleSearchInput}
				placeholder="Search by name or Title ID..."
			/>
			{#if searchLoading}
				<div class="spinner"></div>
			{/if}
		</div>

		{#if searchResults.length > 0}
			<ul class="search-results">
				{#each searchResults as result}
					<li>
						<button
							type="button"
							on:click={() => addToGroup(result)}
							disabled={isAlreadyInGroup(result)}
						>
							<div class="result-info">
								<span class="result-name">{result.name}</span>
								<span class="result-id">{result.id}</span>
							</div>
							{#if isAlreadyInGroup(result)}
								<span>(In Group)</span>
							{/if}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

<style>
	.grouping-controls-container {
		background-color: var(--input-bg);
		border: 1px solid var(--border-color);
		border-left: 4px solid var(--primary-color);
		padding: 1rem 1.5rem;
		margin-bottom: 2rem;
		border-radius: var(--border-radius);
	}
	p {
		margin-top: 0;
		color: var(--text-secondary);
	}
	.current-group-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin: 1rem 0;
	}
	.group-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background-color: var(--surface-color);
		padding: 0.5rem 1rem;
		border-radius: var(--border-radius);
		font-size: 0.9rem;
	}
	.group-item button {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--text-secondary);
		padding: 0.25rem;
	}
	.group-item button:hover {
		color: var(--text-primary);
	}
	.search-section {
		margin-top: 1.5rem;
	}
	.search-section label {
		font-weight: 500;
		margin-bottom: 0.5rem;
		font-size: 0.9rem;
		color: var(--text-secondary);
		display: block;
	}
	.search-input-wrapper {
		position: relative;
	}
	.search-input-wrapper input {
		width: 100%;
		background-color: var(--surface-color);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		border-radius: 6px;
		padding: 10px 12px;
		font-size: 1rem;
		box-sizing: border-box;
	}
	.spinner {
		position: absolute;
		right: 12px;
		top: 50%;
		transform: translateY(-50%);
		width: 16px;
		height: 16px;
		border: 2px solid var(--border-color);
		border-top-color: var(--primary-color);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		to {
			transform: translateY(-50%) rotate(360deg);
		}
	}
	.search-results {
		list-style: none;
		padding: 0;
		margin: 0.5rem 0 0;
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
		max-height: 200px;
		overflow-y: auto;
		background-color: var(--surface-color);
	}
	.search-results li button {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding: 0.75rem 1rem;
		background: none;
		border: none;
		border-bottom: 1px solid var(--border-color);
		text-align: left;
		cursor: pointer;
		color: var(--text-primary);
	}
	.search-results li:last-child button {
		border-bottom: none;
	}
	.search-results li button:hover:not(:disabled) {
		background-color: var(--input-bg);
	}
	.search-results li button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.result-info {
		display: flex;
		flex-direction: column;
	}
	.result-name {
		font-weight: 500;
	}
	.result-id {
		font-size: 0.8rem;
		color: var(--text-secondary);
	}
</style>