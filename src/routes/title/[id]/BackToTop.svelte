<script>
	import { onMount } from 'svelte'
	import { fade, scale } from 'svelte/transition'
	import { get } from 'svelte/store'
	import Icon from '@iconify/svelte'
	import { createImageSet } from '$lib/image'
	import { preferences, isReducedMotion } from '$lib/stores/preferences'

	/**
	 * On a phone, once the hero cartridge has scrolled out of view it flies down
	 * into a round bubble at the bottom corner and keeps turning there; tapping
	 * the bubble goes back to the top, and the cartridge flies back to its place
	 *
	 * The bubble is two layers on purpose. The 3D cartridge is drawn on the page's
	 * one WebGL canvas, which sits between them: the glass circle is under it (so
	 * the cartridge is seen in front of the glass) and the tap target is over it
	 * (so the tap reaches a button). Where there is no WebGL, a small drawn
	 * cartridge is shown in the circle instead
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
		<!-- The glass: under the canvas, so the cartridge flies in over it. It arrives
		     a beat after the cartridge starts, and goes the moment it leaves -->
		<span
			class="glass"
			aria-hidden="true"
			in:scale={{ start: 0.55, duration: 320, delay: 380 }}
			out:fade={{ duration: 120 }}
		>
			<span class="slot" bind:this={dock}></span>
			{#if fallback}
				<span class="mini">
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
	>
		<span class="up" aria-hidden="true"><Icon icon="mdi:chevron-up" /></span>
	</button>
{/if}

<style>
	/* Both layers share one place and size */
	.glass,
	.hit {
		position: fixed;
		right: 1rem;
		bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
		width: 3.75rem;
		height: 3.75rem;
		border-radius: 50%;
	}

	/* Under the WebGL canvas (40) */
	.glass {
		z-index: 38;
		display: grid;
		place-items: center;
		pointer-events: none;
		background: color-mix(in srgb, var(--surface-color) 82%, transparent);
		-webkit-backdrop-filter: blur(14px);
		backdrop-filter: blur(14px);
		border: 1px solid color-mix(in srgb, var(--primary-color) 40%, var(--border-color));
		box-shadow:
			0 8px 24px rgba(0, 0, 0, 0.22),
			0 0 0 4px color-mix(in srgb, var(--primary-color) 14%, transparent);
	}

	/* Where the cartridge lands: the size it is drawn at */
	.slot {
		width: 1.55rem;
		height: 2.29rem;
	}

	/* Over the canvas and the seasonal layer: nothing here is painted, it only takes the tap */
	.hit {
		z-index: 60;
		padding: 0;
		border: 0;
		background: transparent;
		cursor: pointer;
		pointer-events: none;
		-webkit-tap-highlight-color: transparent;
	}

	.hit.on { pointer-events: auto; }

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
		opacity: 0;
		transform: scale(0.6);
		transition: opacity 0.25s ease 0.9s, transform 0.25s ease 0.9s;
	}

	.hit.on .up {
		opacity: 1;
		transform: scale(1);
	}

	/* The cartridge, small, for where there is no WebGL */
	.mini {
		position: absolute;
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
</style>
