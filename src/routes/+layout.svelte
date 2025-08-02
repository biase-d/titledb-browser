<script>
    import Icon from '@iconify/svelte';
	import '../app.css'
	import AuthButton from './AuthButton.svelte'

	let { data, children } = $props()

	let isMobileMenuOpen = $state(false);
</script>

<div class="app-container">
	<header>
		<a href="/" class="logo">
			<span class="logo-text">titledb browser</span>
		</a>

		<nav class="desktop-nav">
			<!--
			<a href="/stats">Stats</a>
			-->
			<a href="/favorites">Favorites</a>
			<div class="auth-wrapper">
				<AuthButton session={data.session} />
			</div>
		</nav>

		<button class="mobile-menu-btn" onclick={() => isMobileMenuOpen = !isMobileMenuOpen} >
			{#if isMobileMenuOpen}
				<Icon icon='mdi:close' width='24px' height='24px'/>
			{:else}
				<Icon icon='mdi:menu' width='24px' height='24px'/>
			{/if}
		</button>
	</header>

	{#if isMobileMenuOpen}
		<nav class="mobile-nav">
			<a href="/stats" onclick={() => isMobileMenuOpen = false}>Stats</a>
			<a href="/favorites" onclick={() => isMobileMenuOpen = false}>Favorites</a>
			<div class="auth-wrapper">
				<AuthButton session={data.session} />
			</div>
		</nav>
	{/if}
	
	<main>
		{@render children?.()}
	</main>

	<footer>
		<p>🏗️ Work in progress</p>
		<p>a <a href='https://github.com/biase-d'>biase-d</a> project</p>
	</footer>
</div>

<style>
	.app-container { max-width: 1024px; margin: 0 auto; padding: 1.5rem; }

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--border-color);
		margin-bottom: 1.5rem;
	}

	.logo { display: flex; align-items: center; gap: 0.5rem; text-decoration: none; color: var(--text-primary)}
	.logo-text { font-size: 1rem; font-weight: 500; color: var(--text-primary); }


	.desktop-nav {
		display: none;
		align-items: center;
		gap: 0.25rem;
	}
	@media (min-width: 640px) {
		.desktop-nav {
			display: flex;
		}
	}
	
	.desktop-nav a {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-secondary);
		text-decoration: none;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		transition: all 0.2s ease;
	}
	.desktop-nav a:hover { color: var(--text-primary); background-color: var(--input-bg); }

	.desktop-nav .auth-wrapper {
		border-left: 1px solid var(--border-color);
		padding-left: 0.5rem;
		margin-left: 0.25rem;
	}

	.mobile-menu-btn {
		display: block;
		background: none;
		border: none;
		padding: 0.5rem;
		cursor: pointer;
		color: var(--text-primary);
	}
	@media (min-width: 640px) {
		.mobile-menu-btn {
			display: none;
		}
	}

	.mobile-nav {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 1.5rem 0;
		border-bottom: 1px solid var(--border-color);
		margin-bottom: 1.5rem;
	}
	.mobile-nav a {
		font-size: 1rem;
		font-weight: 500;
		color: var(--text-secondary);
		text-decoration: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		width: 100%;
		text-align: center;
		transition: all 0.2s ease;
	}
	.mobile-nav a:hover {
		color: var(--text-primary);
		background-color: var(--input-bg);
	}
	.mobile-nav .auth-wrapper {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border-color);
		width: 100%;
		display: flex;
		justify-content: center;
	}

	footer {
		text-align: center;
		font-size: 0.875rem;
		color: var(--text-secondary);
		margin-top: 4rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border-color);
	}

	footer a {
		text-decoration: none;
		color: var(--text-primary)
	}
</style>