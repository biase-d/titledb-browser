<script>
    import Icon from '@iconify/svelte';
    import AuthButton from './AuthButton.svelte';
    import { browser } from '$app/environment';

    let { data } = $props();
    let isMobileMenuOpen = $state(false);

    function closeMenu() {
        isMobileMenuOpen = false;
    }

    $effect(() => {
        if (!browser) return;

        document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';

        return () => {
            if (browser) {
                document.body.style.overflow = '';
            }
        };
    });
</script>

<header>
    <div class="header-container">
        <a href="/" class="logo" onclick={closeMenu}>
            <span class="logo-text">Switch Performance</span>
        </a>

        <nav class="desktop-nav">
            <a href="/favorites">Favorites</a>
            <a href="/contribute">Contribute</a>
            <div class="auth-wrapper">
                <AuthButton session={data.session} />
            </div>
        </nav>

        <button class="mobile-menu-btn" onclick={() => isMobileMenuOpen = !isMobileMenuOpen} aria-label="Toggle menu">
            {#if isMobileMenuOpen}
                <Icon icon='mdi:close' width='28px' height='28px'/>
            {:else}
                <Icon icon='mdi:menu' width='28px' height='28px'/>
            {/if}
        </button>
    </div>
</header>

{#if isMobileMenuOpen}
    <div class="mobile-nav-overlay" onclick={closeMenu} role="button" tabindex="0">
        <nav class="mobile-nav" onclick={(e) => e.stopPropagation()}>
            <a href="/favorites" onclick={closeMenu}>Favorites</a>
            <a href="/contribute" onclick={closeMenu}>Contribute</a>
            <div class="auth-wrapper">
                <AuthButton session={data.session} />
            </div>
        </nav>
    </div>
{/if}

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

    .desktop-nav a:hover {
        color: var(--primary-color);
        text-decoration: none;
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

    /* Mobile Nav Overlay and Panel */
    .mobile-nav-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: color-mix(in srgb, var(--background-color) 70%, transparent);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 40;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .mobile-nav {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2rem;
        padding: 2rem;
        width: 100%;
    }

    .mobile-nav a {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--text-primary);
        text-decoration: none;
        padding: 0.5rem;
        transition: color 0.2s ease;
    }

    .mobile-nav a:hover {
        color: var(--primary-color);
        text-decoration: none;
    }

    .mobile-nav .auth-wrapper {
        margin-top: 2rem;
        padding-top: 2rem;
        border-top: 1px solid var(--border-color);
        width: 100%;
        display: flex;
        justify-content: center;
    }
</style>