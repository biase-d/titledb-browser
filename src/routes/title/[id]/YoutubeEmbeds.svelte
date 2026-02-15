<script>
	let { links } = $props()

	/**
	 * @param {string} url
	 */
	function getYouTubeID (url) {
		const regex =
			/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/ // eslint-disable-line no-useless-escape
		const match = url.match(regex)
		return match ? match[1] : null
	}
</script>

<div class="section-container">
	{#if links.length === 0}
		<p class="notice-card">
			No videos have been submitted for this title yet
		</p>
	{:else}
		<div class="videos-grid">
			{#each links as link}
				{@const videoId = getYouTubeID(link.url)}
				{#if videoId}
					<div class="video-container">
						<div class="video-wrapper">
							<iframe
								src="https://www.youtube.com/embed/{videoId}"
								title="YouTube video player"
								frameborder="0"
								allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
								allowfullscreen
							></iframe>
						</div>
						{#if link.notes}
							<p class="video-notes">{link.notes}</p>
						{/if}
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<style>
	.videos-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2rem;
	}
	@media (min-width: 1024px) {
		.videos-grid {
			grid-template-columns: 1fr 1fr;
		}
	}
	.video-container {
		background-color: var(--surface-color);
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-color);
		overflow: hidden;
	}
	.video-wrapper {
		position: relative;
		padding-bottom: 56.25%; /* 16:9 aspect ratio */
		height: 0;
	}
	.video-wrapper iframe {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		border: 0;
	}
	.video-notes {
		margin: 0;
		padding: 1rem;
		font-size: 0.9rem;
		color: var(--text-secondary);
		border-top: 1px solid var(--border-color);
	}
	.notice-card {
		padding: 2rem;
		text-align: center;
		background-color: var(--surface-color);
		border-radius: var(--radius-lg);
		border: 1px dashed var(--border-color);
	}
</style>
