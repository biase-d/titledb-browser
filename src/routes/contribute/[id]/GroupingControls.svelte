<script>
	import Icon from '@iconify/svelte'

	let {
		initialGroup = [],
		onUpdate = (/** @type {{ id: string; name: string; }[]} */ group) => {}
	} = $props()

	let isVisible = $state(false);

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
	<div class="header">
		<h3>Game Grouping</h3>
		<button type="button" class="toggle-visibility-btn" onclick={() => isVisible = !isVisible}>
			{isVisible ? 'Hide' : 'Show'}
		</button>
	</div>

	{#if isVisible}
		<p>Link different regional versions or editions of a game together. Future performance and graphics submissions for any game in this group will apply to all of them.</p>

		<div class="current-group-list">
		{#each currentGroup as title (title.id)}
			<div class="group-item">
				<span>{title.name} ({title.id})</span>
				<button type="button" onclick={() => removeFromGroup(title.id)} title="Remove from group">
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
				oninput={handleSearchInput}
				placeholder="Search by name or Title ID..."
			/>
			{#if searchLoading}
				<div class="spinner"></div>
			{/if}
		</div>

		{#if searchResults.length > 0}
			<ul class="search-results">
				{#each searchResults as result}
					<li class:in-group={isAlreadyInGroup(result)}>
						<div class="result-info">
							<span class="result-name">{result.name}</span>
							<span class="result-id">{result.id}</span>
						</div>
						<button
							type="button"
							class="add-button"
							onclick={() => addToGroup(result)}
							disabled={isAlreadyInGroup(result)}
						>
							{#if isAlreadyInGroup(result)}
								<Icon icon="mdi:check" /> Added
							{:else}
								<Icon icon="mdi:plus" /> Add
							{/if}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
	{/if}
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
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.header h3 {
		margin: 0;
	}
	.toggle-visibility-btn {
		background: none;
		border: 1px solid var(--border-color);
		color: var(--text-secondary);
		padding: 4px 12px;
		border-radius: var(--border-radius);
		font-weight: 500;
		cursor: pointer;
	}
	p {
		font-size: 0.9rem;
		color: var(--text-secondary);
		margin-bottom: 1.5rem;
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
	.search-results li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--border-color);
	}
	.search-results li:last-child {
		border-bottom: none;
	}
	.search-results li.in-group .result-name {
		opacity: 0.6;
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
	.add-button {
		background-color: var(--button-bg);
		color: var(--button-text);
		border: none;
		padding: 0.5rem 1rem;
		border-radius: var(--border-radius);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-weight: 500;
		font-size: 0.9rem;
	}
	.add-button:disabled {
		background-color: var(--input-bg);
		color: var(--text-secondary);
		cursor: not-allowed;
	}
</style>