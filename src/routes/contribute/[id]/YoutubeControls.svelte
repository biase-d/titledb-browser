<script>
	import Icon from '@iconify/svelte';

	let {
		initialLinks = [],
		onUpdate = (/** @type {{url: string, notes: string}[]} */ links) => {}
	} = $props();

	// Handle old drafts with string arrays and new data with object arrays
	const normalizedLinks = initialLinks.map(link => 
		typeof link === 'string' ? { url: link, notes: '' } : link
	);
	let links = $state([...normalizedLinks]);

	function hideAndReset() {
		links = [];
		onUpdate(links);
	}

	function addInitialLink() {
		if (links.length === 0) {
			links.push({ url: '', notes: '' });
			onUpdate(links);
		}
	}

	function addLink() {
		links.push({ url: '', notes: '' });
		onUpdate(links);
	}

	function removeLink(index) {
		links.splice(index, 1);
		onUpdate(links);
	}

	function updateUrl(index, value) {
		links[index].url = value;
		onUpdate(links);
	}

	function updateNotes(index, value) {
		links[index].notes = value;
		onUpdate(links);
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
		<button type="button" class="add-initial-btn" onclick={() => {
			addInitialLink()
		}}>
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
						value={link.url}
						oninput={(e) => updateUrl(i, e.currentTarget.value)}
					/>
					{#if links.length > 1}
						<button class="remove-btn" onclick={() => removeLink(i)} title="Remove Link">
							<Icon icon="mdi:minus-circle" />
						</button>
					{/if}
				</div>
				<textarea 
					placeholder="Optional notes (e.g., 'Docked gameplay', 'Comparison video')"
					value={link.notes}
					oninput={(e) => updateNotes(i, e.currentTarget.value)}
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
		border-radius: var(--border-radius);
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
		border-radius: 6px;
		color: var(--text-primary);
	}
	.link-entry textarea {
		width: 100%;
		min-height: 60px;
		resize: vertical;
		padding: 10px 12px;
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
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
		border-radius: var(--border-radius);
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
		background-color: var(--button-bg);
		color: var(--button-text);
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: var(--border-radius);
		cursor: pointer;
		font-weight: 600;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>