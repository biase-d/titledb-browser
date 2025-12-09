<script>
	import Icon from '@iconify/svelte';
	import AuthButton from './AuthButton.svelte';
	import SettingsModal from './SettingsModal.svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { tick } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let { data } = $props();
	
	let isMobileMenuOpen = $state(false);
	let showSettings = $state(false);
	
	// Search State
	let searchValue = $state('');
	let searchResults = $state([]);
	let isSearchFocused = $state(false);
	let isSearching = $state(false);
	let searchDebounce;

	$effect(() => {
		const q = page.url.searchParams.get('q');
		if (q && !isSearchFocused && !searchValue) searchValue = q;
	});

	function handleInput() {
		clearTimeout(searchDebounce);
		if (searchValue.length < 2) {
			searchResults = [];
			return;
		}

		isSearching = true;
		searchDebounce = setTimeout(async () => {
			try {
				const res = await fetch(`/api/v1/games/search?q=${encodeURIComponent(searchValue)}`);
				if (res.ok) {
					searchResults = await res.json();
				}
			} catch (e) {
				console.error(e);
			} finally {
				isSearching = false;
			}
		}, 300);
	}

	function handleSearchSubmit(e) {
		e.preventDefault();
		isSearchFocused = false;
		isMobileMenuOpen = false;
		
		const url = new URL(window.location.href);
		url.pathname = '/';
		url.searchParams.set('q', searchValue);
		url.searchParams.delete('page');
		goto(url.toString());
	}

	function closeMenu() {
		isMobileMenuOpen = false;
	}

	function handleDocumentClick(e) {
		if (isSearchFocused && !e.target.closest('.search-container')) {
			isSearchFocused = false;
		}
	}
</script>

<svelte:window onclick={handleDocumentClick} />

<header class="app-header">
	<div class="header-inner">
		<!-- 1. Logo -->
		<a href="/" class="logo" onclick={closeMenu}>
			<span class="logo-text">Switch Performance</span>
		</a>

		<!-- 2. Search Bar (Desktop) -->
		<div class="search-container desktop-only">
			<form class="search-bar" class:focused={isSearchFocused} onsubmit={handleSearchSubmit}>
				<div class="icon-wrapper left">
					<Icon icon="mdi:magnify" width="20" height="20" />
				</div>
				
				<input 
					type="text" 
					placeholder="Search games..." 
					bind:value={searchValue}
					oninput={handleInput}
					onfocus={() => isSearchFocused = true}
				/>
				
				{#if searchValue}
					<button type="button" class="icon-wrapper right clear-btn" onclick={() => { searchValue = ''; searchResults = []; }}>
						<Icon icon="mdi:close-circle" width="18" height="18" />
					</button>
				{/if}
			</form>

			<!-- Dropdown Results -->
			{#if isSearchFocused && searchValue.length >= 2}
				<div class="search-dropdown" transition:fade={{ duration: 100 }}>
					{#if isSearching}
						<div class="dropdown-status">Searching...</div>
					{:else if searchResults.length > 0}
						<div class="results-list">
							{#each searchResults.slice(0, 6) as result}
								<a href="/title/{result.id}" class="dropdown-item" onclick={() => isSearchFocused = false}>
									<div class="item-info">
										<span class="item-name">{result.name}</span>
										<span class="item-id">{result.id}</span>
									</div>
									<Icon icon="mdi:chevron-right" class="item-arrow" />
								</a>
							{/each}
							<button class="view-all-btn" onclick={handleSearchSubmit}>
								View all results for "{searchValue}"
							</button>
						</div>
					{:else}
						<div class="dropdown-status">No results found</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- 3. Desktop Actions -->
		<nav class="desktop-nav">
			<a href="/favorites" class="nav-link" class:active={page.url.pathname === '/favorites'}>
				<Icon icon="mdi:star-outline" width="20" height="20" />
				<span>Favorites</span>
			</a>
			<a href="/contribute" class="nav-link" class:active={page.url.pathname === '/contribute'}>
				<Icon icon="mdi:plus-circle-outline" width="20" height="20" />
				<span>Contribute</span>
			</a>
			
			<div class="divider"></div>

			<button class="icon-btn" onclick={() => showSettings = true} title="Settings">
				<Icon icon="mdi:cog-outline" width="22" height="22" />
			</button>

			<AuthButton session={data.session} />
		</nav>

		<!-- 4. Mobile Toggle -->
		<button 
			class="mobile-toggle" 
			onclick={() => isMobileMenuOpen = !isMobileMenuOpen}
			aria-label="Toggle Menu"
		>
			<Icon icon={isMobileMenuOpen ? "mdi:close" : "mdi:menu"} width="28" height="28" />
		</button>
	</div>
</header>

<!-- Mobile Menu Overlay -->
{#if isMobileMenuOpen}
	<div class="mobile-overlay" transition:fade={{ duration: 200 }} onclick={closeMenu} role="button" tabindex="0">
		<div 
			class="mobile-menu" 
			transition:fly={{ y: 20, duration: 300, easing: cubicOut }}
			onclick={(e) => e.stopPropagation()}
			role="dialog"
		>
			<!-- Mobile Search -->
			<form class="mobile-search" onsubmit={handleSearchSubmit}>
				<div class="icon-wrapper left">
					<Icon icon="mdi:magnify" width="20" height="20" />
				</div>
				<input 
					type="text" 
					placeholder="Search titles..." 
					bind:value={searchValue}
				/>
			</form>

			<nav class="mobile-links">
				<a href="/" onclick={closeMenu}>
					<Icon icon="mdi:home-outline" /> Home
				</a>
				<a href="/favorites" onclick={closeMenu}>
					<Icon icon="mdi:star-outline" /> Favorites
				</a>
				<a href="/contribute" onclick={closeMenu}>
					<Icon icon="mdi:plus-circle-outline" /> Contribute
				</a>
				<button class="mobile-btn" onclick={() => { closeMenu(); showSettings = true; }}>
					<Icon icon="mdi:cog-outline" /> Settings
				</button>
			</nav>

			<div class="mobile-footer">
				<AuthButton session={data.session} />
			</div>
		</div>
	</div>
{/if}

<SettingsModal bind:show={showSettings} />

<style>
	/* --- Header Structure --- */
	.app-header {
		position: sticky;
		top: 0;
		z-index: 50;
		width: 100%;
		background-color: color-mix(in srgb, var(--surface-color) 85%, transparent);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-bottom: 1px solid var(--border-color);
	}

	.header-inner {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0.75rem 1.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		height: 70px;
	}

	/* --- Logo --- */
	.logo {
		text-decoration: none;
		flex-shrink: 0;
	}
	.logo-text {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	/* --- Search Bar (Desktop) --- */
	.search-container {
		position: relative;
		flex-grow: 1;
		max-width: 450px;
	}
	
	.desktop-only { display: none; }
	@media (min-width: 768px) {
		.desktop-only { display: block; }
	}

	.search-bar {
		position: relative;
		width: 100%;
		display: flex;
		align-items: center;
	}

	.search-bar input {
		width: 100%;
		height: 42px;
		padding: 0 40px 0 40px; /* Space for icons */
		border-radius: 99px;
		border: 1px solid var(--border-color);
		background-color: var(--input-bg);
		font-size: 0.95rem;
		color: var(--text-primary);
		transition: all 0.2s ease;
	}

	.search-bar input:focus {
		outline: none;
		border-color: var(--primary-color);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 15%, transparent);
		background-color: var(--surface-color);
	}

	/* Icon Positioning */
	.icon-wrapper {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-secondary);
		z-index: 2; /* Sit above input */
	}

	.icon-wrapper.left {
		left: 12px;
		pointer-events: none;
	}

	.icon-wrapper.right {
		right: 12px;
		background: none;
		border: none;
		cursor: pointer;
		padding: 4px;
		border-radius: 50%;
		transition: color 0.2s;
	}
	.icon-wrapper.right:hover {
		color: var(--text-primary);
		background-color: rgba(0,0,0,0.05);
	}

	/* --- Search Dropdown --- */
	.search-dropdown {
		position: absolute;
		top: calc(100% + 8px);
		left: 0;
		right: 0;
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		overflow: hidden;
		z-index: 100;
	}

	.dropdown-status {
		padding: 1rem;
		text-align: center;
		color: var(--text-secondary);
		font-size: 0.9rem;
	}

	.results-list {
		display: flex;
		flex-direction: column;
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		text-decoration: none;
		border-bottom: 1px solid var(--border-color);
		transition: background-color 0.2s;
	}

	.dropdown-item:last-child { border-bottom: none; }
	.dropdown-item:hover { background-color: var(--input-bg); }

	.item-info {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.item-name {
		font-weight: 500;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.item-id {
		font-size: 0.75rem;
		color: var(--text-secondary);
		font-family: var(--font-mono);
	}

	.item-arrow { color: var(--text-secondary); }

	.view-all-btn {
		width: 100%;
		padding: 0.75rem;
		background-color: var(--input-bg);
		border: none;
		color: var(--primary-color);
		font-weight: 600;
		font-size: 0.9rem;
		cursor: pointer;
		text-align: center;
	}
	.view-all-btn:hover { background-color: color-mix(in srgb, var(--primary-color) 10%, transparent); }

	/* --- Desktop Nav --- */
	.desktop-nav {
		display: none;
		align-items: center;
		gap: 1rem;
	}

	@media (min-width: 1024px) {
		.desktop-nav { display: flex; }
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.95rem;
		font-weight: 500;
		color: var(--text-secondary);
		text-decoration: none;
		transition: color 0.2s;
		padding: 0.5rem 0.75rem;
		border-radius: 8px;
	}

	.nav-link:hover { 
		color: var(--text-primary);
		background-color: var(--input-bg);
	}
	
	.nav-link.active { 
		color: var(--primary-color);
		background-color: color-mix(in srgb, var(--primary-color) 10%, transparent);
	}

	.divider {
		width: 1px;
		height: 24px;
		background-color: var(--border-color);
		margin: 0 0.5rem;
	}

	.icon-btn {
		background: none;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 50%;
		transition: all 0.2s;
		display: flex;
	}
	.icon-btn:hover {
		background-color: var(--input-bg);
		color: var(--text-primary);
	}

	/* --- Mobile Toggle --- */
	.mobile-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: none;
		border: none;
		cursor: pointer;
		color: var(--text-primary);
	}

	@media (min-width: 1024px) {
		.mobile-toggle { display: none; }
	}

	/* --- Mobile Menu --- */
	.mobile-overlay {
		position: fixed;
		inset: 0;
		top: 70px;
		background-color: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(4px);
		z-index: 40;
		display: flex;
		flex-direction: column;
	}

	.mobile-menu {
		background-color: var(--surface-color);
		border-bottom-left-radius: 24px;
		border-bottom-right-radius: 24px;
		padding: 1.5rem;
		box-shadow: var(--shadow-lg);
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		max-height: 80vh;
		overflow-y: auto;
		border-top: 1px solid var(--border-color);
	}

	.mobile-search {
		position: relative;
		width: 100%;
	}

	.mobile-search input {
		width: 100%;
		height: 44px;
		padding: 0 12px 0 44px;
		border-radius: 12px;
		border: 1px solid var(--border-color);
		background-color: var(--input-bg);
		font-size: 1rem;
		color: var(--text-primary);
	}

	.mobile-search .icon-wrapper.left {
		left: 14px;
	}

	.mobile-links {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.mobile-links a, .mobile-btn {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text-primary);
		text-decoration: none;
		border-radius: 16px;
		transition: background-color 0.2s;
		background: none;
		border: none;
		width: 100%;
		text-align: left;
		cursor: pointer;
	}

	.mobile-links a:active, .mobile-btn:active {
		background-color: var(--input-bg);
	}

	.mobile-links :global(svg) {
		color: var(--primary-color);
		font-size: 1.4rem;
	}

	.mobile-footer {
		margin-top: auto;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border-color);
		display: flex;
		justify-content: center;
	}
</style>