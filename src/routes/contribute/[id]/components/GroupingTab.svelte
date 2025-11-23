<script>
	import Icon from '@iconify/svelte';
	let { updatedGroup = $bindable(), groupingSearchInput = $bindable(), groupingSearchResults = $bindable(), groupingSearchLoading = $bindable(), handleGroupingSearchInput, addToGroup, removeFromGroup, isAlreadyInGroup, id } = $props();
</script>

<section class="form-section">
	<div class="form-card">
		<div class="current-group-list">
			{#each updatedGroup as title (title.id)}
				<div class="group-item">
					<span>{title.name} ({title.id})</span>
					<button type="button" onclick={() => removeFromGroup(title.id)} title="Remove from group" disabled={title.id === id}>
						<Icon icon="mdi:close" />
					</button>
				</div>
			{/each}
		</div>
		<div class="search-section">
			<label for="group-search">Add another title to this group</label>
			<div class="search-input-wrapper">
				<input id="group-search" type="text" bind:value={groupingSearchInput} oninput={handleGroupingSearchInput} placeholder="Search by name or Title ID..." />
				{#if groupingSearchLoading}<div class="spinner"></div>{/if}
			</div>
			{#if groupingSearchResults.length > 0}
				<ul class="search-results">
					{#each groupingSearchResults as result}
						<li class:in-group={isAlreadyInGroup(result.id)}>
							<div class="result-info">
								<span class="result-name">{result.name}</span>
								<span class="result-id">{result.id}</span>
							</div>
							<button type="button" class="add-button" onclick={() => addToGroup(result)} disabled={isAlreadyInGroup(result.id)}>
								<Icon icon={isAlreadyInGroup(result.id) ? 'mdi:check' : 'mdi:plus'} /> {isAlreadyInGroup(result.id) ? 'Added' : 'Add'}
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
</section>

<style>
	.form-card {
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
	}
	.current-group-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}
	.group-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background-color: var(--surface-color);
		padding: 0.5rem 1rem;
		border-radius: var(--radius-md);
		font-size: 0.9rem;
	}
	.group-item button {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--text-secondary);
	}
	.group-item button[disabled] {
		opacity: 0.3;
		cursor: not-allowed;
	}
	.search-section label {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--text-secondary);
		display: block;
		margin-bottom: 0.25rem;
	}
	.search-input-wrapper { position: relative; }
	input {
		width: 100%;
		padding: 8px 12px;
		font-size: 1rem;
		font-family: inherit;
		color: var(--text-primary);
		background-color: var(--input-bg);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
	}
	.search-results {
		list-style: none;
		margin-top: 0.5rem;
		padding: 0;
		max-height: 200px;
		overflow-y: auto;
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
	}
	.search-results li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--border-color);
	}
	.add-button {
		background-color: var(--input-bg);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		padding: 0.5rem 1rem;
		border-radius: var(--radius-md);
		cursor: pointer;
	}
	.add-button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>