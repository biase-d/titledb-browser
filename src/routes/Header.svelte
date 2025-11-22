<script>
	import Icon from '@iconify/svelte';
	import AuthButton from './AuthButton.svelte';
    import SettingsModal from './SettingsModal.svelte';
	import { browser } from '$app/environment';
	import { tick } from 'svelte';

	let { data } = $props();
	let isMobileMenuOpen = $state(false);
    let showSettings = $state(false);

	let menuButton = $state(null);
	let mobileNav = $state(null);

	const ariaExpanded = $derived(isMobileMenuOpen.toString());
	const ariaLabel = $derived(isMobileMenuOpen ? 'Close menu' : 'Open menu');

	function closeMenu() {
		isMobileMenuOpen = false;
	}

	$effect(() => {
		if (!browser) return;

		const handleKeydown = (event) => {
			if (event.key === 'Escape') {
				closeMenu();
			}
		};

		if (isMobileMenuOpen) {
			document.body.style.overflow = 'hidden';
			document.addEventListener('keydown', handleKeydown);

			tick().then(() => {
				const firstFocusable = mobileNav?.querySelector('a, button');
				firstFocusable?.focus();
			});
		}

		return () => {
			document.body.style.overflow = '';
			document.removeEventListener('keydown', handleKeydown);

			menuButton?.focus();
		};
	});
</script>

<header>
	<div class="header-container">
		<a href="/" class="logo" onclick={closeMenu}>
			<span class="logo-text">Switch Performance</span>
		</a>

		<nav class="desktop-nav" aria-label="Main navigation">
			<a href="/favorites">Favorites</a>
			<a href="/contribute">Contribute</a>
            
            <button class="icon-btn" onclick={() => showSettings = true} title="Settings">
                <Icon icon="mdi:cog" width="20" height="20" />
            </button>

			<div class="auth-wrapper">
				<AuthButton session={data.session} />
			</div>
		</nav>

		<button
			class="mobile-menu-btn"
			onclick={() => (isMobileMenuOpen = !isMobileMenuOpen)}
			aria-label={ariaLabel}
			aria-expanded={ariaExpanded}
			aria-controls="mobile-nav-menu"
			bind:this={menuButton}
		>
			{#if isMobileMenuOpen}
				<Icon icon="mdi:close" width="28px" height="28px" aria-hidden="true" />
			{:else}
				<Icon icon="mdi:menu" width="28px" height="28px" aria-hidden="true" />
			{/if}
		</button>
	</div>
</header>

{#if isMobileMenuOpen}
	<div class="mobile-nav-overlay">
		<button class="overlay-close-btn" onclick={closeMenu} aria-label="Close menu"></button>
		<div
			class="mobile-nav"
			id="mobile-nav-menu"
			bind:this={mobileNav}
			role="dialog"
			aria-modal="true"
			aria-label="Mobile menu"
			tabindex="-1"
		>
			<nav>
				<a href="/favorites" onclick={closeMenu}>Favorites</a>
				<a href="/contribute" onclick={closeMenu}>Contribute</a>
                <button class="mobile-nav-btn" onclick={() => { closeMenu(); showSettings = true; }}>
                    Settings
                </button>
				<div class="auth-wrapper">
					<AuthButton session={data.session} />
				</div>
			</nav>
		</div>
	</div>
{/if}

<SettingsModal bind:show={showSettings} />

<style>
	header {
		position: sticky;
		top: 0;
		z-index: 50;
		width: 100%;
		background-color: color-mix(in srgb, var(--surface-color) 80%, transparent);
		border-bottom: 1px solid var(--border-color);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
	}

	.header-container,
	.desktop-nav a {
		will-change: color;
	}

	.header-container {
		display: flex;
		justify-content: space-between;
		align-items: center;
		max-width: 1200px;
		margin: 0 auto;
		padding: 0.75rem 1.5rem;
	}

	.logo {
		text-decoration: none;
	}
	.logo-text {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-primary);
	}
	.desktop-nav {
		display: none;
		align-items: center;
		gap: 1.5rem;
	}
	@media (min-width: 768px) {
		.desktop-nav {
			display: flex;
		}
	}

	.desktop-nav a {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text-secondary);
		text-decoration: none;
		transition: color 0.2s ease;
	}

	.desktop-nav a:hover,
	.desktop-nav a:focus-visible {
		color: var(--primary-color);
		text-decoration: none;
	}
	.logo:focus-visible,
	.desktop-nav a:focus-visible,
	.mobile-menu-btn:focus-visible {
		outline: 2px solid var(--accent-color, blue);
		outline-offset: 2px;
		border-radius: var(--radius-sm);
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
        align-items: center;
        justify-content: center;
    }
    .icon-btn:hover {
        background-color: var(--input-bg);
        color: var(--text-primary);
    }

	.desktop-nav .auth-wrapper {
		padding-left: 1.5rem;
		margin-left: 0.5rem;
		border-left: 1px solid var(--border-color);
	}
	.mobile-menu-btn {
		display: block;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		color: var(--text-primary);
	}
	@media (min-width: 768px) {
		.mobile-menu-btn {
			display: none;
		}
	}

	.mobile-nav-overlay {
		position: fixed;
		inset: 0;
		background-color: color-mix(in srgb, var(--background-color) 70%, transparent);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		z-index: 40;
		display: flex;
		justify-content: center;
	}

	.overlay-close-btn {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		background: transparent;
		border: none;
		cursor: default;
	}

	.mobile-nav {
		position: relative;
		z-index: 1;
		margin-top: 15vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		height: fit-content;
		width: 100%;
	}

    .mobile-nav nav {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2rem;
        width: 100%;
    }

	.mobile-nav nav a, .mobile-nav-btn {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary);
		text-decoration: none;
		padding: 0.5rem;
		transition: color 0.2s ease;
        background: none;
        border: none;
        cursor: pointer;
	}

	.mobile-nav nav a:hover,
	.mobile-nav nav a:focus-visible,
    .mobile-nav-btn:hover {
		color: var(--primary-color);
		text-decoration: none;
	}

	.mobile-nav nav a:focus-visible {
		outline: 2px solid var(--accent-color, blue);
		outline-offset: 2px;
		border-radius: var(--radius-sm);
	}

	.mobile-nav nav .auth-wrapper {
		margin-top: 2rem;
		padding-top: 2rem;
		border-top: 1px solid var(--border-color);
		width: 80%;
		max-width: 300px;
		display: flex;
		justify-content: center;
	}
</style>