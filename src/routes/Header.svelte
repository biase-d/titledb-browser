<script>
	import Icon from '@iconify/svelte'
	import Logo from '$lib/components/Logo.svelte'
	import AuthButton from './AuthButton.svelte'
	import SettingsModal from './SettingsModal.svelte'
	import { uiStore } from '$lib/stores/ui.svelte'
	import { goto } from '$app/navigation'
	import { page } from '$app/state'
	import { fade, fly } from 'svelte/transition'
	import { cubicOut } from 'svelte/easing'

	let { data } = $props()

	/** Scrolled a little: the bar slims and gains a shadow */
	let condensed = $state(false)

	let isMobileMenuOpen = $state(false)

	// Search State
	let searchValue = $state('')
	let searchResults = $state([])
	let isSearchFocused = $state(false)
	let isSearching = $state(false)
	let searchDebounce
	let searchInput = $state()

	$effect(() => {
		const q = page.url.searchParams.get('q')
		if (q && !isSearchFocused && !searchValue) searchValue = q
	})

	function handleInput () {
		clearTimeout(searchDebounce)
		const isHomepage = page.url.pathname === '/' || page.url.pathname === '/switch-2'

		if (searchValue.length >= 2 || (isHomepage && searchValue === '')) {
			isSearching = !isHomepage
			searchDebounce = setTimeout(async () => {
				if (isHomepage) {
		const url = new URL(window.location.href)
					if (searchValue) url.searchParams.set('q', searchValue)
					else url.searchParams.delete('q')
					url.searchParams.delete('page')
					goto(url.toString(), {
						replaceState: true,
						noScroll: true,
						keepFocus: true,
					})
					searchResults = []
					return
				}

				try {
					const res = await fetch(
						`/api/v1/games/search?q=${encodeURIComponent(searchValue)}`,
					)
					if (res.ok) {
						searchResults = await res.json()
					}
				} catch (e) {
					console.error(e)
				} finally {
					isSearching = false
				}
			}, 300)
		} else {
			searchResults = []
		}
	}

	function handleSearchSubmit (e) {
		e.preventDefault()
		isSearchFocused = false
		isMobileMenuOpen = false

		// Local to this handler, never reactive state
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const url = new URL(window.location.href)
		// Stay on the Switch 2 listing when searching from it
		url.pathname = window.location.pathname === '/switch-2' ? '/switch-2' : '/'
		url.searchParams.set('q', searchValue)
		url.searchParams.delete('page')
		goto(url.toString())
	}

	function closeMenu () {
		isMobileMenuOpen = false
	}

	function handleDocumentClick (e) {
		if (isSearchFocused && !e.target.closest('.search-container')) {
			isSearchFocused = false
		}
	}

	function handleKeydown (e) {
		const isTyping =
			['INPUT', 'TEXTAREA', 'SELECT'].includes(
				document.activeElement.tagName,
			) || document.activeElement.isContentEditable
		if (e.key === '/' && !isTyping) {
			e.preventDefault()
			searchInput?.focus()
		}
	}
</script>

<svelte:window
	onclick={handleDocumentClick}
	onkeydown={handleKeydown}
	onscroll={() => (condensed = window.scrollY > 24)}
/>

<header class="app-header" class:condensed>
	<div class="header-inner">
		<!-- Left: Logo -->
		<div class="header-left">
			<a href="/" class="logo" onclick={closeMenu} aria-label="Switch Performance, home">
				<!-- The cartridge is the logo. It lifts when pointed at and seats when pressed -->
				<span class="logo-cart"><Logo size="2.4rem" /></span>
				<span class="logo-words desktop-only" aria-hidden="true">
					<span class="w1">Switch</span>
					<span class="w2">Performance</span>
				</span>
			</a>
		</div>

		<!-- Center: Search -->
		<div class="header-center">
			<div class="search-container">
				<form
					class="search-bar"
					class:focused={isSearchFocused}
					onsubmit={handleSearchSubmit}
				>
					<div class="icon-wrapper left">
						<Icon icon="mdi:magnify" width="18" height="18" />
					</div>

					<input
						bind:this={searchInput}
						type="text"
						placeholder="Search games..."
						bind:value={searchValue}
						oninput={handleInput}
						onfocus={() => (isSearchFocused = true)}
						role="combobox"
						aria-autocomplete="list"
						aria-expanded={isSearchFocused &&
							searchResults.length > 0}
						aria-haspopup="listbox"
						aria-controls="search-results-listbox"
						aria-label="Search across all games"
					/>

					{#if !searchValue && !isSearchFocused}
						<kbd class="key-hint desktop-only" aria-hidden="true">/</kbd>
					{/if}

					{#if searchValue}
						<button
							type="button"
							class="icon-wrapper right clear-btn"
							onclick={() => {
								searchValue = ''
								searchResults = []
								handleInput()
							}}
						>
							<Icon
								icon="mdi:close-circle"
								width="16"
								height="16"
							/>
						</button>
					{/if}
				</form>

				<!-- Dropdown Results -->
				{#if isSearchFocused && searchValue.length >= 2 && page.url.pathname !== '/' && page.url.pathname !== '/switch-2'}
					<div
						id="search-results-listbox"
						class="search-dropdown"
						transition:fade={{ duration: 100 }}
						role="listbox"
						aria-label="Search results"
					>
						{#if isSearching}
							<div class="dropdown-status">Searching...</div>
						{:else if searchResults.length > 0}
							<div class="results-list">
								{#each searchResults.slice(0, 5) as result}
									<a
										href="/title/{result.id}"
										class="dropdown-item"
										onclick={() =>
											(isSearchFocused = false)}
									>
										<div class="item-info">
											<span class="item-name"
												>{result.name}</span
											>
											<span class="item-id"
												>{result.id}</span
											>
											{#if result.platform === 'switch2'}
												<span class="item-s2">Switch 2</span>
											{/if}
										</div>
										<Icon
											icon="mdi:chevron-right"
											class="item-arrow"
										/>
									</a>
								{/each}
								<button
									class="view-all-btn"
									onclick={handleSearchSubmit}
								>
									View all results
								</button>
							</div>
						{:else}
							<div class="dropdown-status">No results found</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<!-- Right: Quick Access + Menu -->
		<div class="header-right">
			<nav class="quick-nav">
				<a
					href="/"
					class="quick-link desktop-only"
					class:active={page.url.pathname === '/'}
				>
					<Icon icon="mdi:home-outline" width="20" height="20" />
					<span>Home</span>
				</a>
				<a
					href="/contribute"
					class="quick-link"
					class:active={page.url.pathname === '/contribute'}
				>
					<Icon
						icon="mdi:plus-circle-outline"
						width="20"
						height="20"
					/>
					<span class="desktop-only">Contribute</span>
				</a>
			</nav>

			<button
				class="menu-toggle"
				onclick={() => (isMobileMenuOpen = !isMobileMenuOpen)}
				aria-label="Open Menu"
			>
				<Icon
					icon={isMobileMenuOpen ? 'mdi:close' : 'mdi:menu'}
					width="24"
					height="24"
				/>
			</button>
		</div>
	</div>
</header>

<!-- Global Menu Drawer -->
{#if isMobileMenuOpen}
	<div
		class="drawer-overlay"
		transition:fade={{ duration: 200 }}
		onclick={closeMenu}
		onkeydown={(e) => e.key === 'Escape' && closeMenu()}
		role="presentation"
	>
		<div
			class="drawer"
			transition:fly={{ x: 300, duration: 300, easing: cubicOut }}
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			tabindex="-1"
		>
			<div class="drawer-header">
				<span class="drawer-title">Navigation</span>
				<button class="close-drawer" onclick={closeMenu}>
					<Icon icon="mdi:close" width="24" height="24" />
				</button>
			</div>

			<nav class="drawer-links">
				<a
					href="/"
					onclick={closeMenu}
					class:active={page.url.pathname === '/'}
				>
					<Icon icon="mdi:home-outline" /> Home
				</a>
				<a
					href="/switch-2"
					onclick={closeMenu}
					class:active={page.url.pathname === '/switch-2'}
				>
					<Icon icon="mdi:nintendo-switch" /> Switch 2
				</a>
				<a
					href="/contribute"
					onclick={closeMenu}
					class:active={page.url.pathname === '/contribute'}
				>
					<Icon icon="mdi:plus-circle-outline" /> Contribute
				</a>
				<a
					href="/favorites"
					onclick={closeMenu}
					class:active={page.url.pathname === '/favorites'}
				>
					<Icon icon="mdi:star-outline" /> Favorites
				</a>
				<a
					href="/stats"
					onclick={closeMenu}
					class:active={page.url.pathname === '/stats'}
				>
					<Icon icon="mdi:chart-bar" /> Insights
				</a>
				<a
					href="/pending-verification"
					onclick={closeMenu}
					class:active={page.url.pathname === '/pending-verification'}
				>
					<Icon icon="mdi:clock-outline" /> Pending Verification
				</a>

				<div class="drawer-divider"></div>

				<button
					class="drawer-btn"
					onclick={() => {
						closeMenu()
						uiStore.openSettings()
					}}
				>
					<Icon icon="mdi:cog-outline" /> Settings
				</button>
			</nav>

			<div class="drawer-footer">
				<AuthButton session={data.session} />
			</div>
		</div>
	</div>
{/if}

<SettingsModal bind:show={uiStore.showSettings} />

<style>
	.app-header {
		position: sticky;
		top: 0;
		z-index: 50;
		width: 100%;
		background-color: color-mix(
			in srgb,
			var(--surface-color) 80%,
			transparent
		);
		-webkit-backdrop-filter: blur(20px);
		backdrop-filter: blur(20px);
		border-bottom: 1px solid var(--border-color);
		transition: box-shadow 0.25s ease;
	}

	/* A lit lip along the bottom edge, like the ledge in the footer: faint at rest,
	   brighter once the page has scrolled and the bar has slimmed */
	.app-header::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: -1px;
		height: 2px;
		pointer-events: none;
		background: linear-gradient(
			90deg,
			transparent,
			color-mix(in srgb, var(--primary-color) 60%, transparent) 18%,
			color-mix(in srgb, var(--primary-color) 60%, transparent) 82%,
			transparent
		);
		opacity: 0.28;
		transition: opacity 0.25s ease;
	}

	.app-header.condensed {
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
	}

	.app-header.condensed::after { opacity: 0.8; }

	.header-inner {
		max-width: 1400px;
		margin: 0 auto;
		height: 72px;
		display: grid;
		grid-template-columns: 1fr 2fr 1fr;
		align-items: center;
		padding: 0 1.5rem;
		gap: 1.5rem;
		transition: height 0.25s ease;
	}

	.condensed .header-inner {
		height: 60px;
	}

	@media (max-width: 768px) {
		.header-inner {
			grid-template-columns: auto 1fr auto;
			gap: 1rem;
			padding: 0 1rem;
		}
	}

	.header-left {
		display: flex;
		align-items: center;
	}

	.logo {
		text-decoration: none;
		display: flex;
		align-items: center;
		gap: 0.8rem;
		color: var(--text-primary);
	}

	.logo-cart {
		display: block;
		filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.28));
		transform-origin: 50% 100%;
		transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), scale 0.25s ease;
	}

	.condensed .logo-cart { scale: 0.88; }
	.logo:hover .logo-cart, .logo:focus-visible .logo-cart { transform: translateY(-3px) rotate(-5deg); }
	.logo:active .logo-cart { transform: translateY(1px); }
	.logo:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 4px; border-radius: 8px; }

	.logo-words {
		flex-direction: column;
		gap: 0.28rem;
		line-height: 1;
	}

	.w1 {
		font-size: 1.2rem;
		font-weight: 900;
		letter-spacing: -0.02em;
	}

	.w2 {
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	.header-center {
		display: flex;
		justify-content: center;
		width: 100%;
	}

	.search-container {
		position: relative;
		width: 100%;
		max-width: 500px;
	}

	.search-bar {
		position: relative;
		width: 100%;
	}

	.search-bar input {
		width: 100%;
		height: 42px;
		padding: 0 40px;
		border-radius: 12px;
		border: 1px solid var(--border-color);
		background: var(--input-bg);
		color: var(--text-primary);
		font-size: 0.9rem;
		/* A screen set into the bar */
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.12);
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.key-hint {
		position: absolute;
		right: 12px;
		top: 50%;
		translate: 0 -50%;
		min-width: 1.35rem;
		height: 1.35rem;
		display: grid;
		place-items: center;
		padding: 0 0.3rem;
		border-radius: 5px;
		border: 1px solid var(--border-color);
		border-bottom-width: 2px;
		background: var(--surface-color);
		color: var(--text-secondary);
		font: 700 0.7rem var(--font-mono, ui-monospace, monospace);
		pointer-events: none;
	}

	.search-bar input:focus {
		outline: none;
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.2);
		box-shadow: 0 8px 16px -4px rgba(0, 0, 0, 0.2);
	}

	.icon-wrapper {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		color: var(--text-secondary);
		opacity: 0.6;
	}

	.icon-wrapper.left {
		left: 14px;
	}
	.icon-wrapper.right {
		right: 12px;
		background: none;
		border: none;
		cursor: pointer;
		padding: 4px;
	}

	.search-dropdown {
		position: absolute;
		top: calc(100% + 8px);
		left: 0;
		right: 0;
		background: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: 16px;
		box-shadow: var(--shadow-lg);
		overflow: hidden;
		z-index: 100;
	}

	.dropdown-status {
		padding: 1.5rem;
		text-align: center;
		color: var(--text-secondary);
		font-size: 0.85rem;
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.85rem 1.25rem;
		text-decoration: none;
		border-bottom: 1px solid var(--border-color);
		transition: background 0.2s;
	}

	.dropdown-item:hover {
		background: var(--input-bg);
	}

	.item-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.item-name {
		color: var(--text-primary);
		font-weight: 600;
		font-size: 0.9rem;
	}
	.item-id {
		color: var(--text-secondary);
		font-size: 0.7rem;
		font-family: monospace;
	}
	.item-s2 {
		margin-left: 0.4rem;
		padding: 0.05rem 0.35rem;
		border-radius: 999px;
		background: #dc2626;
		color: #fff;
		font-size: 0.6rem;
		font-weight: 800;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.dropdown-item :global(.item-arrow) {
		color: var(--text-secondary);
		opacity: 0.3;
	}

	.view-all-btn {
		width: 100%;
		padding: 0.85rem;
		background: var(--input-bg);
		border: none;
		color: var(--primary-color);
		font-weight: 700;
		font-size: 0.8rem;
		cursor: pointer;
	}

	.header-right {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.75rem;
	}

	.quick-nav {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.quick-link {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.85rem;
		border-radius: 10px;
		color: var(--text-secondary);
		text-decoration: none;
		font-size: 0.85rem;
		font-weight: 600;
		transition: all 0.2s;
	}

	.quick-link:hover {
		color: var(--text-primary);
		background: var(--input-bg);
	}

	/* The page you are on: the accent colour and a short notch under it, like a
	   cartridge seated in its slot */
	.quick-link.active {
		color: var(--primary-color);
		background: none;
	}

	.quick-link.active::after {
		content: '';
		position: absolute;
		left: 50%;
		bottom: -0.2rem;
		width: 1.2rem;
		height: 2px;
		border-radius: 2px;
		translate: -50% 0;
		background: var(--primary-color);
	}

	.menu-toggle {
		width: 42px;
		height: 42px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--input-bg);
		border: 1px solid var(--border-color);
		border-radius: 12px;
		color: var(--text-primary);
		cursor: pointer;
		transition: all 0.2s;
	}

	.menu-toggle:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	/* Drawer Overlay and Container */
	.drawer-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(8px);
		z-index: 1000;
		display: flex;
		justify-content: flex-end;
	}

	.drawer {
		width: 100%;
		max-width: 340px;
		height: 100%;
		background: var(--surface-color);
		border-left: 1px solid var(--border-color);
		display: flex;
		flex-direction: column;
		padding: 1.5rem;
		box-shadow: -10px 0 30px rgba(0, 0, 0, 0.1);
	}

	.drawer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.drawer-title {
		font-size: 1.1rem;
		font-weight: 800;
		color: var(--text-primary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.close-drawer {
		background: none;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 4px;
	}

	.drawer-links {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.drawer-links a,
	.drawer-btn {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.9rem 1.25rem;
		border-radius: 12px;
		color: var(--text-secondary);
		text-decoration: none;
		font-weight: 600;
		font-size: 1rem;
		background: none;
		border: none;
		width: 100%;
		text-align: left;
		cursor: pointer;
		transition: all 0.2s;
	}

	.drawer-links a:hover,
	.drawer-btn:hover {
		background: var(--input-bg);
		color: var(--text-primary);
	}

	.drawer-links :global(svg) {
		font-size: 1.4rem;
		color: var(--primary-color);
	}

	.drawer-links a.active {
		background: color-mix(in srgb, var(--primary-color) 15%, transparent);
		color: var(--primary-color);
	}

	.drawer-divider {
		height: 1px;
		background: rgba(255, 255, 255, 0.05);
		margin: 1rem 0;
	}

	.drawer-footer {
		margin-top: auto;
		padding-top: 2rem;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
		display: flex;
		justify-content: center;
	}

	.desktop-only {
		display: none;
	}
	.mobile-only {
		display: flex;
	}

	@media (min-width: 1024px) {
		.desktop-only {
			display: flex;
		}
		.mobile-only {
			display: none;
		}
	}

	@media (max-width: 768px) {
		.header-center {
			transition: all 0.3s ease;
		}

		.header-center:has(.search-bar.focused) {
			position: absolute;
			left: 0;
			top: 0;
			height: 100%;
			background: var(--surface-color);
			z-index: 100;
			padding: 0 1rem;
			display: flex;
			align-items: center;
		}

		.search-container {
			max-width: none;
		}
	}
</style>
