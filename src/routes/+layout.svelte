<script>
    import "../app.css";
    import { page } from "$app/stores";
    import Header from "./Header.svelte";
    import Footer from "./Footer.svelte";
    import OnboardingModal from "./OnboardingModal.svelte";
    import AnnouncementBanner from "$lib/components/AnnouncementBanner.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";
    import { preferences } from "$lib/stores/preferences";
    import { fade } from "svelte/transition";

    let { data, children } = $props();

    $effect(() => {
        console.log("[Layout] Theme effect triggered:", {
            enabled: $preferences.adaptiveTheme,
            isActive: themeStore.isActive,
            hasColors: !!themeStore.colors,
        });

        if (
            $preferences.adaptiveTheme &&
            themeStore.isActive &&
            themeStore.colors
        ) {
            console.log(
                "[Layout] Applying theme colors:",
                themeStore.colors.primary,
            );
            const root = document.documentElement;
            root.style.setProperty(
                "--primary-color",
                themeStore.colors.primary,
            );
            root.style.setProperty("--accent-color", themeStore.colors.accent);
            root.style.setProperty(
                "--theme-overlay",
                themeStore.colors.overlay,
            );
        } else {
            console.log("[Layout] Removing theme properties");
            const root = document.documentElement;
            root.style.removeProperty("--primary-color");
            root.style.removeProperty("--accent-color");
            root.style.removeProperty("--theme-overlay");
        }
    });
</script>

<AnnouncementBanner />

{#if $preferences.adaptiveTheme && themeStore.backgroundImage}
    <div class="theme-background-wrapper" transition:fade={{ duration: 600 }}>
        <img
            src={themeStore.backgroundImage}
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

    {#if !$page.url.pathname.startsWith("/contribute/")}
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
        --surface-color: color-mix(
            in srgb,
            var(--background-color) 80%,
            var(--theme-overlay, transparent)
        );
    }
</style>
