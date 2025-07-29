<script>
	import Icon from '@iconify/svelte';

	let {
		initialLinks = [],
		onUpdate = (/** @type {string[]} */ links) => {}
	} = $props();

	let links = $state([...initialLinks]);

	function removeAllLinks() {
		links = [];
		onUpdate(links);
	}

	function addInitialLink() {
		if (links.length === 0) {
			links.push('');
			onUpdate(links);
		}
	}

	function addLink() {
		links.push('');
		onUpdate(links);
	}

	function removeLink(index) {
		links.splice(index, 1);
		onUpdate(links);
	}

	function updateLink(index, value) {
		links[index] = value;
		onUpdate(links);
	}
</script>

<div class="youtube-controls-container">
	<div class="header">
		<h3>YouTube Links</h3>
		{#if links.length > 0}
			<button type="button" class="remove-section-btn" onclick={removeAllLinks}>
				<Icon icon="mdi:delete-outline" /> Remove Section
			</button>
		{/if}
	</div>
	<p>Add YouTube videos showcasing performance, graphical comparisons, or gameplay.</p>

	{#if links.length === 0}
		<button type="button" class="add-initial-btn" onclick={addInitialLink}>
			<Icon icon="mdi:plus" /> Add YouTube Videos
		</button>
	{:else}
		<div class="links-list">
			{#each links as link, i (i)}
				<div class="link-row">
					<input
					type="url"
					placeholder="https://www.youtube.com/watch?v=..."
					value={link}
					oninput={(e) => updateLink(i, e.currentTarget.value)}
				/>
				{#if links.length > 1}
					<button class="remove-btn" onclick={() => removeLink(i)} title="Remove Link">
						<Icon icon="mdi:minus-circle" />
					</button>
				{/if}
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
	.remove-section-btn {
		background: none;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		font-size: 0.8rem;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		border-radius: var(--border-radius);
	}
	.remove-section-btn:hover {
		color: #e53e3e;
		background-color: rgba(229, 62, 62, 0.1);
	}
	.youtube-controls-container p {
		font-size: 0.9rem;
		color: var(--text-secondary);
		margin-bottom: 1.5rem;
	}
	.links-list {
		display: flex;
		flex-direction column;
		gap: 0.75rem;
		margin-bottom: 1rem;
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