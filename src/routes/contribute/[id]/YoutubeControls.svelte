<script>
	import Icon from '@iconify/svelte';

	let { links = $bindable() } = $props();

	function hideAndReset() {
		links = [];
	}

	function addInitialLink() {
		if (links.length === 0) {
			links = [{ url: '', notes: '' }];
		}
	}

	function addLink() {
		links = [...links, { url: '', notes: '' }];
	}

	function removeLink(index) {
		links.splice(index, 1);
		links = links;
	}
</script>

<div class="youtube-controls-container">
	<div class="header">
		<h3>YouTube Links</h3>
		{#if links.length > 0}
			<button type="button" class="toggle-btn" onclick={hideAndReset}>Reset</button>
		{/if}
	</div>

	<p>Add YouTube videos showcasing performance or graphical comparisons</p>

	{#if links.length === 0}
		<button type="button" class="add-initial-btn" onclick={addInitialLink}>
			<Icon icon="mdi:plus" /> Add YouTube Video
		</button>
	{:else}
		<div class="links-list">
		{#each links as link, i (i)}
			<div class="link-entry">
				<div class="link-row">
					<input
						type="url"
						placeholder="https://www.youtube.com/watch?v=..."
						bind:value={link.url}
					/>
					{#if links.length > 1}
						<button class="remove-btn" onclick={() => removeLink(i)} title="Remove Link">
							<Icon icon="mdi:minus-circle" />
						</button>
					{/if}
				</div>
				<textarea
					placeholder="Optional notes (e.g., 'Docked gameplay', 'Comparison video')"
					bind:value={link.notes}
				></textarea>
			</div>
		{/each}
		</div>

		<button type="button" class="add-link-btn" onclick={addLink}>
			<Icon icon="mdi:plus-circle" /> Add Another Video
		</button>
	{/if}
</div>

<style>
	.youtube-controls-container {
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border-color);
	}
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.25rem;
	}
	.header h3 {
		margin: 0;
	}
	.toggle-btn {
		background: none;
		border: 1px solid var(--border-color);
		color: var(--text-secondary);
		padding: 4px 12px;
		border-radius: var(--radius-md);
		font-weight: 500;
		cursor: pointer;
	}
	.youtube-controls-container p {
		font-size: 0.9rem;
		color: var(--text-secondary);
		margin-bottom: 1.5rem;
	}
	.links-list {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		margin-bottom: 1rem;
	}
	.link-entry {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.link-row {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.link-row input {
		flex-grow: 1;
		padding: 10px 12px;
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		color: var(--text-primary);
	}
	.link-entry textarea {
		width: 100%;
		min-height: 60px;
		resize: vertical;
		padding: 10px 12px;
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		color: var(--text-primary);
	}
	.remove-btn {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--text-secondary);
		padding: 0.25rem;
		line-height: 1;
	}
	.remove-btn:hover {
		color: #e53e3e;
	}
	.add-link-btn {
		background-color: transparent;
		color: var(--primary-color);
		border: 1px solid var(--primary-color);
		padding: 0.5rem 1rem;
		border-radius: var(--radius-md);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 500;
	}
	.add-link-btn:hover {
		background-color: var(--primary-color);
		color: white;
	}
	.add-initial-btn {
		background-color: transparent;
		color: var(--primary-color);
		border: 2px dashed var(--border-color);
		border-radius: var(--radius-lg);
		padding: 0.75rem 1.5rem;
		cursor: pointer;
		font-weight: 600;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>