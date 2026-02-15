<script>
	import Icon from '@iconify/svelte'
	let { youtubeLinks = $bindable(), addYoutubeLink, removeYoutubeLink } = $props()
</script>

<section class="form-section">
	<div class="form-card">
		<div class="links-list">
			{#each youtubeLinks as link, i (i)}
				<div class="link-entry">
					<div class="link-row">
						<input type="url" placeholder="https://www.youtube.com/watch?v=..." bind:value={link.url} />
						<button class="remove-btn" onclick={() => removeYoutubeLink(i)} title="Remove Link">
							<Icon icon="mdi:close" />
						</button>
					</div>
					<textarea placeholder="Optional notes (e.g., 'Docked gameplay', 'Comparison video')" bind:value={link.notes}></textarea>
				</div>
			{/each}
		</div>
		<button type="button" class="add-btn" onclick={addYoutubeLink}>
			<Icon icon="mdi:plus-circle" /> Add Another Video
		</button>
	</div>
</section>

<style>
	.form-card {
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
	}
	.links-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.link-entry {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.link-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	input, textarea {
		width: 100%;
		padding: 8px 12px;
		font-size: 1rem;
		font-family: inherit;
		color: var(--text-primary);
		background-color: var(--input-bg);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
	}
	textarea { min-height: 80px; resize: vertical; }
	.remove-btn {
		background: transparent;
		color: #ef4444;
		border: 1px solid transparent;
		border-radius: 50%;
		width: 38px;
		height: 38px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}
	.remove-btn:hover {
		background-color: color-mix(in srgb, #ef4444 10%, transparent);
		border-color: #ef4444;
	}
	.add-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		margin-top: 1.5rem;
		padding: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		color: var(--primary-color);
		background-color: var(--surface-color);
		border: 2px dashed var(--border-color);
		border-radius: var(--radius-lg);
		transition: all 0.2s;
	}
	.add-btn:hover {
		border-color: var(--primary-color);
		background-color: color-mix(in srgb, var(--primary-color) 5%, transparent);
	}
</style>