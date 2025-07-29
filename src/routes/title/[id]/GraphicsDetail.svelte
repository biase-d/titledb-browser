<script>
	let { settings } = $props();
</script>

<div class="graphics-container">
	<h2>Graphics Settings</h2>
	{#if !settings || Object.keys(settings).length === 0}
		<p>No graphics settings have been submitted for this title yet.</p>
	{:else}
		{#each Object.entries(settings) as [sectionName, fields]}
			<div class="section">
				<h3>{sectionName}</h3>
				<div class="fields-grid">
					{#each Object.entries(fields) as [key, value]}
						<div class="field">
							<span class="field-key">{key}</span>
							<span class="field-value">{value}</span>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	{/if}
</div>

<style>
	.graphics-container {
		margin-top: 2rem;
		padding: 1.5rem;
		background-color: var(--surface-color);
		border-radius: var(--border-radius);
	}
	h2 {
		margin-top: 0;
		font-size: 1.5rem;
		border-bottom: 2px solid var(--primary-color);
		padding-bottom: 0.5rem;
		margin-bottom: 1.5rem;
	}
	.section {
		margin-bottom: 1.5rem;
	}
	.section:last-child {
		margin-bottom: 0;
	}
	.section h3 {
		margin: 0 0 1rem 0;
		font-size: 1.1rem;
		color: var(--text-secondary);
		border-bottom: 1px solid var(--border-color);
		padding-bottom: 0.5rem;
	}
	.fields-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 1rem;
	}
	.field {
		display: flex;
		flex-direction: column;
	}
	.field-key {
		font-size: 0.8rem;
		color: var(--text-secondary);
		font-weight: 500;
		margin-bottom: 0.25rem;
	}
	.field-value {
		font-size: 1rem;
		color: var(--text-primary);
	}
</style>