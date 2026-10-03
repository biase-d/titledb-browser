<script>
	import { onMount } from 'svelte'
	import { fade } from 'svelte/transition'
	import { get } from 'svelte/store'
	import { createImageSet } from '$lib/image'
	import { preferences, isReducedMotion } from '$lib/stores/preferences'

	/**
	 * On a phone, once the hero cartridge has scrolled out of view it flies down to
	 * the bottom corner and keeps turning there, on its own: no bubble, no badge.
	 * Tapping it goes back to the top, and it flies back to its place
	 *
	 * The cartridge is drawn on the page's one WebGL canvas. This component only
	 * marks where it should land (an empty spot) and provides the tap target,
	 * which sits above the canvas so the tap reaches a button. Where there is no
	 * WebGL, a small drawn cartridge stands in
	 *
	 * @type {{
	 *   target: HTMLElement | undefined,
	 *   iconUrl: string | null,
	 *   name: string,
	 *   fallback?: boolean,
	 *   docked?: boolean,
	 *   dock?: HTMLElement | undefined
	 * }}
	 */
	let { target, iconUrl, name, fallback = false, docked = $bindable(false), dock = $bindable() } = $props()

	let phone = $state(false)
	let outOfView = $state(false)

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

	// Docked: the hero is out of view and there is a phone-sized screen to show it on
	$effect(() => { docked = phone && outOfView })

	function toTop () {
		window.scrollTo({ top: 0, behavior: isReducedMotion(get(preferences)) ? 'auto' : 'smooth' })
	}
</script>

{#if phone}
	{#if docked}
		<!-- Where the cartridge lands. Nothing is painted here when it is drawn in 3D -->
		<span class="spot" aria-hidden="true" out:fade={{ duration: 120 }}>
			<span class="slot" bind:this={dock}></span>
			{#if fallback}
				<span class="mini" in:fade={{ duration: 300, delay: 300 }}>
					<span class="mini-band"></span>
					{#if art}<img src={art.src} alt="" width="40" height="40" />{/if}
				</span>
			{/if}
		</span>
	{/if}

	<button
		class="hit"
		class:on={docked}
		onclick={toTop}
		tabindex={docked ? 0 : -1}
		aria-hidden={!docked}
		aria-label="Back to the top of {name}"
	></button>
{/if}

<style>
	/* The cartridge's place in the corner, and a tap target around it */
	.spot,
	.hit {
		position: fixed;
		right: 0.75rem;
		bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px));
	}

	.spot {
		z-index: 38;
		display: grid;
		place-items: center;
		width: 3.4rem;
		height: 4.6rem;
		pointer-events: none;
	}

	/* Where the cartridge is drawn: a card is 21 x 31, so this is its shape */
	.slot {
		width: 2.3rem;
		height: 3.4rem;
	}

	/* Over the canvas: nothing here is painted, it only takes the tap */
	.hit {
		z-index: 60;
		width: 3.4rem;
		height: 4.6rem;
		padding: 0;
		border: 0;
		border-radius: 0.75rem;
		background: transparent;
		cursor: pointer;
		pointer-events: none;
		-webkit-tap-highlight-color: transparent;
	}

	.hit.on { pointer-events: auto; }

	/* The cartridge, small, for where there is no WebGL */
	.mini {
		position: absolute;
		width: 2.3rem;
		height: 3.4rem;
		border-radius: 0.4rem;
		background: #111113;
		transform: rotate(-9deg);
		overflow: hidden;
		box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35);
	}

	.mini-band {
		position: absolute;
		left: 0.3rem;
		right: 0.3rem;
		top: 0.45rem;
		height: 0.62rem;
		background: #e11d2e;
		border-radius: 0.14rem 0.14rem 0 0;
	}

	.mini img {
		position: absolute;
		left: 0.3rem;
		width: calc(100% - 0.6rem);
		top: 1.07rem;
		height: 1.65rem;
		object-fit: cover;
		border-radius: 0 0 0.14rem 0.14rem;
	}
</style>
