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

<div class="youtube-container">
	<h2>Gameplay & Performance Videos</h2>
	{#if links.length === 0}
		<p>No videos have been submitted for this title yet.</p>
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
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
							allowfullscreen
						></iframe>
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<style>
	.youtube-container {
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
	.videos-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
		gap: 1.5rem;
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