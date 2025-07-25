<script>
	export let availablePublishers = []
	export let selectedPublisher = ''
	export let selectedYear = ''

	function resetFilters() {
		selectedPublisher = ''
		selectedYear = ''
	}
</script>

<div class="filter-controls">
	<select bind:value={selectedPublisher} class="filter-select">
		<option value="">All Publishers</option>
		{#each availablePublishers as publisher}
			<option value={publisher}>{publisher}</option>
		{/each}
	</select>

	<select bind:value={selectedYear} class="filter-select">
		<option value="">All Years</option>
		<!-- Create a list of the last 10 years -->
		{#each Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i) as year}
			<option value={year}>{year}</option>
		{/each}
	</select>

	<button on:click={resetFilters} class="reset-button">Reset</button>
</div>

<style>
	.filter-controls {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin-top: 1.5rem;
		padding: 1rem;
		background-color: var(--surface-color);
		border-radius: var(--border-radius);
	}
	.filter-select {
		flex-grow: 1;
		border: 1px solid var(--border-color);
		background-color: var(--background-color);
		color: var(--text-color);
		padding: 8px;
		border-radius: 6px;
		font-size: 0.9rem;
	}
	.reset-button {
		padding: 8px 16px;
		border: 1px solid var(--primary-color);
		background: transparent;
		color: var(--primary-color);
		border-radius: 6px;
		cursor: pointer;
	}
</style>