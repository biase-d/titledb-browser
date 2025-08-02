<script>
	let { links } = $props();

	/**
     * @param {string} url
     */
	function getYouTubeID(url) {
		const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
		const match = url.match(regex);
		return match ? match[1] : null;
	}
</script>

<div class="section-container">
	{#if links.length === 0}
		<p class="no-data-message">No videos have been submitted for this title yet.</p>
	{:else}
		<div class="videos-grid">
			{#each links as link}
				{@const videoId = getYouTubeID(link.url)}
				{#if videoId}
					<div class="video-wrapper">
						<iframe
							src="https://www.youtube.com/embed/{videoId}"
							title="YouTube video player"
							frameborder="0"
							allow="fullscreen"
						></iframe>
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<style>
	.section-container {
		margin-top: 1rem;
	}
	.no-data-message {
	padding: 2rem;
	text-align: center;
	background-color: var(--surface-color);
	border-radius: var(--border-radius);
	border: 1px solid var(--border-color);
	}
	.videos-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.5rem;
	}
	@media (min-width: 768px) {
		.videos-grid {
			grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
		}
	}
	.video-wrapper {
		position: relative;
		padding-bottom: 56.25%; /* 16:9 aspect ratio */
		height: 0;
		overflow: hidden;
		border-radius: var(--border-radius);
	}
	.video-wrapper iframe {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		border: 0;
	}
</style>