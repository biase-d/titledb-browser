<script>
import '../app.css'
import { titleIndex, fullTitleIndex } from '$lib/stores'
import { onMount } from 'svelte'
import { getCachedIndex, setCachedIndex, getCachedFullIndex } from '$lib/db.js'
import { mainUrl } from '$lib/index.js'
import AuthButton from './AuthButton.svelte'

export let data

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
		<a href="/" class="logo">
			<span class="logo-text">titledb-browser</span>
		</a>
		<nav>
			<a href="/stats">Stats</a>
			<a href="/favorites">Favorites</a>
			<div class="auth-wrapper">
				<AuthButton session={data.session} />
			</div>
		</nav>
	</header>
	<main>
		{#if isLoading}
			<p class="loading-message">Loading title database...</p>
		{:else}
			{@render children({ titleIndexStore: titleIndex })}
		{/if}
	</main>
	<footer>
		<p>a biase-d project</p>
	</footer>
</div>

<style>
	.loading-message { text-align: center; padding: 2rem; opacity: 0.8; }
	.app-container { max-width: 1024px; margin: 0 auto; padding: 1.5rem; }

	header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding-bottom: 0.5rem;
	border-bottom: 1px solid var(--border-color);
	margin-bottom: 1.5rem;
}

.logo {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	text-decoration: none;
}

.logo-icon {
	font-size: 1.25rem;
}

.logo-text {
	font-size: 1rem;
	font-weight: 500;
	color: var(--text-primary);
}

nav {
	display: flex;
	align-items: center;
	gap: 0.25rem;
}

nav a {
	font-size: 0.875rem;
	font-weight: 500;
	color: var(--text-secondary);
	text-decoration: none;
	padding: 0.25rem 0.5rem;
	border-radius: 4px;
	transition: all 0.2s ease;
}

nav a:hover {
	color: var(--text-primary);
	background-color: var(--input-bg);
}

.auth-wrapper {
	border-left: 1px solid var(--border-color);
	padding-left: 0.5rem;
	margin-left: 0.25rem;
}

</style>