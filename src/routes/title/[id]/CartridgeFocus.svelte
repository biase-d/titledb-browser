<script>
	import { onMount } from 'svelte'
	import { fade } from 'svelte/transition'
	import Icon from '@iconify/svelte'
	import { sensorsPossible, requestPermission, followTilt } from '$lib/sensors'

	/**
	 * Looking at the cartridge up close. The hero flies to the middle of the screen
	 * over a dimmed page, and can be turned by dragging (both ways), or, on a phone,
	 * by tilting it
	 *
	 * The cartridge itself is drawn by the page's WebGL canvas, lifted above the
	 * header while this is open. This supplies the dimmer, the spot it lands in,
	 * the surface that takes the drag (above the canvas), and the controls
	 *
	 * @type {{
	 *   open: boolean,
	 *   onclose: () => void,
	 *   handle: any,
	 *   name: string,
	 *   slot?: HTMLElement | undefined
	 * }}
	 */
	let { open, onclose, handle, name, slot = $bindable() } = $props()

	/** 'off' | 'on' | 'denied' | 'unavailable' */
	let tilt = $state('off')
	let canTilt = $state(false)
	/** @type {HTMLButtonElement | undefined} */
	let closeButton = $state()
	/** @type {(() => void) | null} */
	let stopTilt = null
	/** @type {Element | null} */
	let returnTo = null

	onMount(() => {
		// Offered on a touch screen with the event; a desktop has nothing to read
		canTilt = sensorsPossible() && window.matchMedia('(pointer: coarse)').matches
	})

	$effect(() => {
		if (!open || !handle) return
		returnTo = document.activeElement
		handle.setFocus(true)
		const overflow = document.documentElement.style.overflow
		document.documentElement.style.overflow = 'hidden'
		closeButton?.focus()

		return () => {
			handle.setFocus(false)
			endTilt()
			document.documentElement.style.overflow = overflow
			if (returnTo instanceof HTMLElement) returnTo.focus()
		}
	})

	function endTilt () {
		stopTilt?.()
		stopTilt = null
		handle?.setSensor(0, 0)
		if (tilt === 'on') tilt = 'off'
	}

	async function toggleTilt () {
		if (tilt === 'on') return endTilt()
		// From a tap, which is what iOS insists on before it will ask
		const answer = await requestPermission()
		if (answer === 'denied') { tilt = 'denied'; return }
		if (answer === 'unsupported') { tilt = 'unavailable'; return }
		tilt = 'on'
		stopTilt = followTilt(
			({ yaw, pitch }) => handle?.setSensor(yaw, pitch),
			() => { tilt = 'unavailable'; stopTilt?.(); stopTilt = null }
		)
	}

	/** Dragging the cartridge round */
	let dragFrom = /** @type {{ x: number, y: number } | null} */ (null)

	/** @param {PointerEvent} e */
	function dragStart (e) {
		if (!handle) return
		dragFrom = { x: e.clientX, y: e.clientY }
		slot?.setPointerCapture(e.pointerId)
		handle.beginDrag()
	}

	/** @param {PointerEvent} e */
	function dragMove (e) {
		if (!dragFrom || !handle) return
		handle.dragBy(e.clientX - dragFrom.x, e.clientY - dragFrom.y)
		dragFrom = { x: e.clientX, y: e.clientY }
	}

	/** @param {PointerEvent} e */
	function dragEnd (e) {
		if (!dragFrom) return
		dragFrom = null
		slot?.releasePointerCapture(e.pointerId)
		handle?.endDrag()
	}
</script>

<svelte:window onkeydown={(e) => { if (open && e.key === 'Escape') onclose() }} />

{#if open}
	<div class="focus" role="dialog" aria-modal="true" aria-label="Inspect {name}" transition:fade={{ duration: 200 }}>
		<button class="dim" aria-label="Close" tabindex="-1" onclick={onclose}></button>

		<!-- Where the cartridge lands, and the surface that turns it. It paints nothing:
		     the cartridge is drawn beneath it, on the canvas -->
		<div
			class="slot"
			bind:this={slot}
			role="application"
			aria-label="The {name} cartridge. Drag to turn it."
			onpointerdown={dragStart}
			onpointermove={dragMove}
			onpointerup={dragEnd}
			onpointercancel={dragEnd}
		></div>

		<button class="close" bind:this={closeButton} onclick={onclose} aria-label="Close">
			<Icon icon="mdi:close" />
		</button>

		<div class="controls">
			<p class="hint">{canTilt ? 'Drag to turn it, or tilt your phone' : 'Drag to turn it'}</p>
			{#if canTilt}
				<button class="tilt" class:on={tilt === 'on'} onclick={toggleTilt} disabled={tilt === 'denied' || tilt === 'unavailable'}>
					<Icon icon="mdi:screen-rotation" />
					{#if tilt === 'on'}Tilt is on
					{:else if tilt === 'denied'}Motion access was declined
					{:else if tilt === 'unavailable'}No motion sensor found
					{:else}Tilt your phone to turn it{/if}
				</button>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* Above the page and its header, below the canvas (70) while it is open */
	.dim {
		position: fixed;
		inset: 0;
		z-index: 65;
		border: 0;
		padding: 0;
		cursor: default;
		background: rgba(6, 8, 12, 0.76);
		-webkit-backdrop-filter: blur(6px);
		backdrop-filter: blur(6px);
	}

	/* Over the canvas: it takes the drag and paints nothing */
	.slot {
		position: fixed;
		z-index: 75;
		left: 50%;
		top: 46%;
		transform: translate(-50%, -50%);
		width: min(62vw, calc(54vh * 21 / 31), 320px);
		aspect-ratio: 21 / 31;
		touch-action: none;
		cursor: grab;
		user-select: none;
		-webkit-user-select: none;
		outline: none;
	}

	.slot:active { cursor: grabbing; }

	.close {
		position: fixed;
		z-index: 80;
		top: calc(0.9rem + env(safe-area-inset-top, 0px));
		right: 0.9rem;
		display: grid;
		place-items: center;
		width: 2.75rem;
		height: 2.75rem;
		font-size: 1.4rem;
		color: #fff;
		background: rgba(255, 255, 255, 0.12);
		border: 1px solid rgba(255, 255, 255, 0.22);
		border-radius: 50%;
		cursor: pointer;
	}

	.close:hover { background: rgba(255, 255, 255, 0.2); }

	.controls {
		position: fixed;
		z-index: 80;
		left: 0;
		right: 0;
		bottom: calc(1.4rem + env(safe-area-inset-bottom, 0px));
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 0 1rem;
		pointer-events: none;
	}

	.hint {
		margin: 0;
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.72);
		text-align: center;
	}

	.tilt {
		pointer-events: auto;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.7rem 1.1rem;
		font: inherit;
		font-size: 0.9rem;
		font-weight: 600;
		color: #fff;
		background: rgba(255, 255, 255, 0.12);
		border: 1px solid rgba(255, 255, 255, 0.24);
		border-radius: 999px;
		cursor: pointer;
	}

	.tilt.on {
		background: var(--primary-color);
		border-color: var(--primary-color);
	}

	.tilt:disabled {
		opacity: 0.6;
		cursor: default;
	}
</style>
