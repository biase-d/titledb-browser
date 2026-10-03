<script>
	import { onMount } from 'svelte'
	import { isBot } from '$lib/utils/bot'

	/**
	 * One bar of the timeline, as a pile of cartridges: taller for more games, built
	 * up one at a time when it first scrolls into view. Drawn on the page's WebGL
	 * canvas. The element itself is the bar everywhere else: for a crawler, with no
	 * WebGL, and for the first moment before the 3D one is ready, it is a plain
	 * striped column of the same height, so the chart always reads
	 *
	 * @type {{ height: number, dim?: boolean, delay?: number }}
	 */
	let { height, dim = false, delay = 0 } = $props()

	/** @type {HTMLElement | undefined} */
	let bar = $state()
	let drawn = $state(false)
	/** @type {any} */
	let handle = null
	/** @type {any} */
	let stageModule = null

	$effect(() => { handle?.setDim(dim) })

	onMount(() => {
		if (!bar || isBot()) return
		let cancelled = false
		;(async () => {
			try {
				stageModule = await import('$lib/webgl/cartridgeStage')
				const stage = await stageModule.getStage()
				if (cancelled || !bar || !stage) return
				handle = stage.registerStack(bar, { delay })
				handle.setDim(dim)
				drawn = true
			} catch {
				// Stays the plain column
			}
		})()
		return () => {
			cancelled = true
			if (handle) {
				handle.dispose()
				handle = null
				stageModule?.releaseStage()
			}
		}
	})
</script>

<div bind:this={bar} class="bar" class:drawn class:dim style:height="{height}px"></div>

<style>
	.bar {
		width: 100%;
		border-radius: 0.2rem 0.2rem 0 0;
		/* Edge-on cartridges: black, with the thin lighter line between each */
		background:
			linear-gradient(#d80f20, #d80f20) top / 100% 0.28rem no-repeat,
			repeating-linear-gradient(0deg, #0e0e10 0 0.32rem, #24262c 0.32rem 0.4rem);
	}

	.bar.dim { opacity: 0.45; }

	/* Where the 3D pile is drawn, nothing is painted here */
	.bar.drawn { background: none; }
</style>
