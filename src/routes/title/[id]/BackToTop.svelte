<script>
	import { onMount } from 'svelte'
	import { fly } from 'svelte/transition'
	import { get } from 'svelte/store'
	import Icon from '@iconify/svelte'
	import { createImageSet } from '$lib/image'
	import { preferences, isReducedMotion } from '$lib/stores/preferences'

	/**
	 * On a phone, once the hero cartridge has scrolled out of view, the game's
	 * cartridge follows in a round bubble at the bottom. Tapping it goes back up.
	 * The cartridge here is a small drawing, not the 3D one: it is a few dozen
	 * pixels across and the page already has its one WebGL view
	 *
	 * @type {{ target: HTMLElement | undefined, iconUrl: string | null, name: string }}
	 */
	let { target, iconUrl, name } = $props()

	let phone = $state(false)
	let outOfView = $state(false)
	let visible = $derived(phone && outOfView)

	let art = $derived(createImageSet(iconUrl, { thumbnailWidth: 96 }))

	onMount(() => {
		const query = window.matchMedia('(max-width: 767px)')
		const update = () => { phone = query.matches }
		update()
		query.addEventListener('change', update)
		return () => query.removeEventListener('change', update)
	})

	$effect(() => {
		if (!target || typeof IntersectionObserver === 'undefined') return
		const observer = new IntersectionObserver(([entry]) => {
			// Out of view above the screen, not merely not yet scrolled to
			outOfView = !entry.isIntersecting && entry.boundingClientRect.bottom < 0
		}, { threshold: 0 })
		observer.observe(target)
		return () => observer.disconnect()
	})

	function toTop () {
		window.scrollTo({ top: 0, behavior: isReducedMotion(get(preferences)) ? 'auto' : 'smooth' })
	}
</script>

{#if visible}
	<button
		class="bubble"
		onclick={toTop}
		aria-label="Back to the top of {name}"
		transition:fly={{ y: 28, duration: 220 }}
	>
		<span class="mini" aria-hidden="true">
			<span class="mini-band"></span>
			{#if art}
				<img src={art.src} alt="" width="40" height="40" />
			{/if}
		</span>
		<span class="up" aria-hidden="true"><Icon icon="mdi:chevron-up" /></span>
	</button>
{/if}

<style>
	.bubble {
		position: fixed;
		z-index: 120;
		right: 1rem;
		bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
		width: 3.75rem;
		height: 3.75rem;
		display: grid;
		place-items: center;
		padding: 0;
		border-radius: 50%;
		cursor: pointer;
		color: var(--text-primary);
		background: color-mix(in srgb, var(--surface-color) 82%, transparent);
		-webkit-backdrop-filter: blur(14px);
		backdrop-filter: blur(14px);
		border: 1px solid color-mix(in srgb, var(--primary-color) 40%, var(--border-color));
		box-shadow:
			0 8px 24px rgba(0, 0, 0, 0.22),
			0 0 0 4px color-mix(in srgb, var(--primary-color) 14%, transparent);
		-webkit-tap-highlight-color: transparent;
	}

	/* The cartridge, small: a black shell, the red band, the art */
	.mini {
		position: relative;
		width: 1.55rem;
		height: 2.29rem;
		border-radius: 0.28rem;
		background: #111113;
		transform: rotate(-9deg);
		overflow: hidden;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
	}

	.mini-band {
		position: absolute;
		left: 0.2rem;
		right: 0.2rem;
		top: 0.3rem;
		height: 0.42rem;
		background: #e11d2e;
		border-radius: 0.1rem 0.1rem 0 0;
	}

	.mini img {
		position: absolute;
		left: 0.2rem;
		width: calc(100% - 0.4rem);
		top: 0.72rem;
		height: 1.1rem;
		object-fit: cover;
		border-radius: 0 0 0.1rem 0.1rem;
	}

	.up {
		position: absolute;
		top: -0.3rem;
		right: -0.1rem;
		display: grid;
		place-items: center;
		width: 1.4rem;
		height: 1.4rem;
		font-size: 1.1rem;
		border-radius: 50%;
		color: var(--primary-action-text, #fff);
		background: var(--primary-color);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
	}
</style>
