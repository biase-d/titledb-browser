<script>
	import '../app.css'
	import AuthButton from './AuthButton.svelte'

	export let data
</script>

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
		<slot />
	</main>
	<footer>
		<p>a biase-d project</p>
	</footer>
</div>

<style>
.app-container { 
	max-width: 1024px; margin: 0 auto; padding: 1.5rem; 
}

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