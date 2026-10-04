<script>
	import { onMount } from 'svelte'

	/**
	 * An easter egg for the Mario games: a "?" block that bumps and pops a coin
	 * when it is pressed, keeping a running count (every ten is a 1-UP). Nothing
	 * about it is needed to use the page: it is a plain button, the count is only
	 * remembered in this browser, and the motion stops when motion is reduced
	 */
	let coins = $state(0)
	let bumping = $state(false)
	let popped = $state(/** @type {Array<{ id: number, oneUp: boolean }>} */ ([]))
	let next = 0

	onMount(() => {
		try { coins = Number(localStorage.getItem('mario_coins')) || 0 } catch { /* storage can be unavailable */ }
	})

	function hit () {
		coins += 1
		// Off, then on a frame later, so the bump replays on every press
		bumping = false
		requestAnimationFrame(() => { bumping = true; setTimeout(() => { bumping = false }, 230) })
		try { localStorage.setItem('mario_coins', String(coins)) } catch { /* as above */ }
		const entry = { id: next++, oneUp: coins % 10 === 0 }
		popped = [...popped, entry]
		setTimeout(() => { popped = popped.filter(p => p.id !== entry.id) }, 1100)
	}
</script>

<div class="egg">
	{#each popped as p (p.id)}
		<span class="pop" class:up={p.oneUp} aria-hidden="true">{#if p.oneUp}1-UP{:else}<i class="coin"></i>{/if}</span>
	{/each}
	<button type="button" class="block" class:hit={bumping} aria-label="Hit the question block" onclick={hit}>
		?
	</button>
	{#if coins > 0}<span class="count" aria-live="polite">×{coins}</span>{/if}
</div>

<style>
	.egg { position: relative; display: inline-flex; flex-direction: column; align-items: center; gap: 0.2rem; }
	.block {
		width: 2.1rem; height: 2.1rem; padding: 0; border: 0; cursor: pointer;
		font: 900 1.15rem/1 var(--font-mono, monospace); color: #fff8d6; text-shadow: 0 2px 0 #9a5b00;
		background: linear-gradient(180deg, #ffc43a, #e8960c);
		box-shadow: inset 0 0 0 2px #7a4a00, inset 3px 3px 0 rgba(255, 255, 255, 0.35), inset -3px -3px 0 rgba(0, 0, 0, 0.2), 0 3px 8px rgba(0, 0, 0, 0.3);
		border-radius: 4px;
	}
	.block:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
	.block.hit { animation: bump 0.22s ease-out; }
	.count { font: 800 0.7rem var(--font-mono, monospace); color: #ffd23f; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6); }

	.pop { position: absolute; left: 50%; top: -0.2rem; translate: -50% 0; pointer-events: none; animation: rise 1s cubic-bezier(0.2, 0.7, 0.3, 1) forwards; }
	.coin { display: block; width: 0.9rem; height: 1.2rem; border-radius: 50%; background: radial-gradient(circle at 30% 25%, #fff3a6, #f5c518 55%, #b8860b); box-shadow: inset 0 0 0 2px #d9a60c; animation: flip 0.45s linear infinite; }
	.up { font: 900 0.8rem var(--font-mono, monospace); color: #5cff7a; text-shadow: 0 1px 0 #064d14, 0 0 6px rgba(92, 255, 122, 0.6); }

	@keyframes bump { 40% { transform: translateY(-7px); } }
	@keyframes rise { 0% { transform: translateY(0); opacity: 1; } 55% { transform: translateY(-2.4rem); opacity: 1; } 100% { transform: translateY(-1.2rem); opacity: 0; } }
	@keyframes flip { to { transform: rotateY(360deg); } }

	@media (prefers-reduced-motion: reduce) { .block.hit, .pop, .coin { animation: none; } .pop { opacity: 0; } }
	:global(.reduce-motion) .egg .block, :global(.reduce-motion) .egg .pop, :global(.reduce-motion) .egg .coin { animation: none !important; }
</style>
