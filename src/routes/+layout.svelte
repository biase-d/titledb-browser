<script>
    import '../app.css'
    import { page, navigating } from '$app/stores'
    import Header from './Header.svelte'
    import Footer from './Footer.svelte'
    import OnboardingModal from './OnboardingModal.svelte'
    import AnnouncementBanner from '$lib/components/AnnouncementBanner.svelte'
    import { themeStore } from '$lib/stores/theme.svelte'
    import { preferences } from '$lib/stores/preferences'
    import { fade } from 'svelte/transition'
    import { createImageSet } from '$lib/image'

    let { data, children } = $props()

    $effect(() => {
        const root = document.documentElement

        if (
            $preferences.adaptiveTheme &&
            themeStore.isActive &&
            themeStore.colors
        ) {
            root.style.setProperty(
                '--primary-color',
                themeStore.colors.primary,
            )
            root.style.setProperty('--accent-color', themeStore.colors.accent)
            root.style.setProperty(
                '--theme-overlay',
                themeStore.colors.overlay,
            )
            root.style.setProperty(
                '--primary-color-hover',
                `color-mix(in srgb, ${themeStore.colors.primary} 80%, white)`,
            )
        } else {
            root.style.setProperty(
                '--primary-color',
                $preferences.favoriteColor,
            )
            root.style.setProperty(
                '--primary-color-hover',
                `color-mix(in srgb, ${$preferences.favoriteColor} 80%, white)`,
            )
            root.style.removeProperty('--accent-color')
            root.style.removeProperty('--theme-overlay')
        }
    })
</script>

<AnnouncementBanner />

{#if $navigating}
    <div class="nav-progress-bar">
        <div class="nav-progress-inner"></div>
    </div>
{/if}

{#if $preferences.adaptiveTheme && themeStore.backgroundImage}
    <div class="theme-background-wrapper" transition:fade={{ duration: 600 }}>
        <img
            src={createImageSet(themeStore.backgroundImage, {
                highRes: false,
                thumbnailWidth: 100,
            })?.src}
            alt=""
            class="theme-background-image"
        />
        <div class="theme-background-overlay"></div>
    </div>
{/if}

<div
    class="app-shell"
    class:has-theme={themeStore.isActive && $preferences.adaptiveTheme}
>
    <Header {data} />

    <main class="app-container">
        {@render children?.()}
    </main>

    {#if !$page.url.pathname.startsWith('/contribute/')}
        <Footer />
    {/if}
</div>

<OnboardingModal />

<style>
    .app-shell {
        position: relative;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        z-index: 1;
        transition: background-color 0.5s ease;
    }

    .theme-background-wrapper {
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        overflow: hidden;
        background-color: var(--background-color);
    }

    .theme-background-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        filter: blur(80px) saturate(1.5);
        opacity: 0.25;
        transform: scale(1.1);
    }

    .theme-background-overlay {
        position: absolute;
        inset: 0;
        background: radial-gradient(
            circle at center,
            transparent 0%,
            var(--background-color) 100%
        );
        opacity: 0.8;
    }

    .app-container {
        width: 100%;
        max-width: 1100px;
        margin: 0 auto;
        flex: 1;
    }

    :global(.has-theme) {
        /* When theme is active, use a dark-primary hybrid background for immersion */
        --background-color: color-mix(
            in srgb,
            var(--theme-overlay, #0d1117) 80%,
            #000000
        );
        --surface-color: color-mix(
            in srgb,
            var(--background-color) 90%,
            var(--primary-color)
        );

        /* Force light-mode variants of text when theme is active */
        --text-primary: var(--color-text-header-dark);
        --text-secondary: var(--color-text-muted-dark);
        --text-body: var(--color-text-body-dark);
        --border-color: color-mix(
            in srgb,
            var(--primary-color) 20%,
            var(--color-border-dark)
        );
        --input-bg: rgba(0, 0, 0, 0.2);
    }

    .nav-progress-bar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        z-index: 9999;
        background: rgba(255, 255, 255, 0.1);
    }

    .nav-progress-inner {
        height: 100%;
        background: var(--primary-color);
        width: 0%;
        animation: progress 2s ease-in-out infinite;
        box-shadow: 0 0 10px var(--primary-color);
    }

    @keyframes progress {
        0% {
            width: 0%;
            margin-left: 0%;
        }
        50% {
            width: 50%;
            margin-left: 25%;
        }
        100% {
            width: 100%;
            margin-left: 100%;
        }
    }
</style>
