<script>
import '../app.css'
import { titleIndex, fullTitleIndex } from '$lib/stores'
import { onMount } from 'svelte'
import { getCachedIndex, setCachedIndex, getCachedFullIndex } from '$lib/db.js'
import { mainUrl } from '$lib/index.js'

let isLoading = true

onMount(async () => {
	const cachedLite = await getCachedIndex()
	if (cachedLite) {
		$titleIndex = cachedLite
	} else {
		const res = await fetch(mainUrl)
		const data = await res.json()
		$titleIndex = data
		await setCachedIndex(data)
	}

	const cachedFull = await getCachedFullIndex()
	if (cachedFull) {
		$fullTitleIndex = cachedFull
	}

	isLoading = false
})
</script>

<svelte:head>
	<title>Titledb Browser</title>
	<meta name="description" content="A fast browser for the Titledb database." />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Titledb Browser" />
	<meta property="og:description" content="A fast browser for the Titledb database." />
	<meta property="og:image" content="/social-preview.png" />
	<meta property="twitter:card" content="summary_large_image" />
	<meta property="twitter:title" content="Titledb Browser" />
	<meta property="twitter:description" content="A fast browser for the Titledb database." />
	<meta property="twitter:image" content="/social-preview.png" />
</svelte:head>

<div class="app-container">
	<header>
		<a href="/">
			<h1>Titledb Browser</h1>
		</a>
		<p>A simple way to browse game titles.</p>
	</header>
	<main>
		{#if isLoading}
			<p class="loading-message">Loading title database...</p>
		{:else}
			<slot />
		{/if}
	</main>
	<footer>
		<p class="cache-notice">
			This site uses browser storage to cache game data for faster loads
		</p>
		<p>a biase-d project</p>
	</footer>
</div>

<style>
	.loading-message {
		text-align: center;
		padding: 2rem;
		opacity: 0.8;
	}

	.app-container {
		max-width: 900px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}

	header {
		margin-bottom: 3rem;
	}

	header h1 {
		font-size: 2rem;
		font-weight: 700;
		color: var(--primary-color);
		margin: 0;
	}

	header p {
		margin-top: 0.25rem;
		color: var(--text-color);
		opacity: 0.7;
	}

	footer {
		text-align: center;
		margin-top: 4rem;
		font-size: 0.9rem;
		opacity: 0.6;
	}
</style>