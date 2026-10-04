<script>
	import { onMount } from 'svelte'

	/**
	 * An easter egg for Nintendo games: a small piece from the game's franchise
	 * (a ? block, a rupee, a bell, a star, a Poké Ball) that bumps and pops a
	 * little treat when pressed, keeping a count; every tenth gets a cheer
	 *
	 * Nothing about it is needed to use the page: it is a plain button, the count
	 * is only remembered in this browser, and the motion stops when motion is reduced
	 *
	 * @type {{ kind?: 'block' | 'rupee' | 'bell' | 'star' | 'ball' }}
	 */
	let { kind = 'block' } = $props()

	const COPY = {
		block: { label: 'Hit the question block', cheer: '1-UP' },
		rupee: { label: 'Collect a rupee', cheer: 'FULL!' },
		bell: { label: 'Shake the tree for bells', cheer: 'BELLS!' },
		star: { label: 'Catch a star', cheer: 'YUM!' },
		ball: { label: 'Throw a ball', cheer: 'GOTCHA!' }
	}

	let copy = $derived(COPY[kind] ?? COPY.block)
	let coins = $state(0)
	let bumping = $state(false)
	let popped = $state(/** @type {Array<{ id: number, cheer: boolean }>} */ ([]))
	let next = 0

	onMount(() => {
		try { coins = Number(localStorage.getItem(`egg_${kind}`)) || 0 } catch { /* storage can be unavailable */ }
	})

	function hit () {
		coins += 1
		// Off, then on a frame later, so the bump replays on every press
		bumping = false
		requestAnimationFrame(() => { bumping = true; setTimeout(() => { bumping = false }, 230) })
		try { localStorage.setItem(`egg_${kind}`, String(coins)) } catch { /* as above */ }
		const entry = { id: next++, cheer: coins % 10 === 0 }
		popped = [...popped, entry]
		setTimeout(() => { popped = popped.filter(p => p.id !== entry.id) }, 1100)
	}
</script>

<div class="egg {kind}">
	{#each popped as p (p.id)}
		<span class="pop" class:cheer={p.cheer} aria-hidden="true">{#if p.cheer}{copy.cheer}{:else}<i class="treat"></i>{/if}</span>
	{/each}
	<button type="button" class="piece" class:hit={bumping} aria-label={copy.label} onclick={hit}>
		{#if kind === 'block'}?{/if}
	</button>
	{#if coins > 0}<span class="count" aria-live="polite">×{coins}</span>{/if}
</div>

<style>
	.egg { position: relative; display: inline-flex; flex-direction: column; align-items: center; gap: 0.2rem; --c1: #ffc43a; --c2: #e8960c; }
	.egg.rupee { --c1: #6ff08a; --c2: #12a64a; }
	.egg.bell { --c1: #ffe27a; --c2: #e0a800; }
	.egg.star { --c1: #ffd6f0; --c2: #ff7fc8; }
	.egg.ball { --c1: #ff6a5c; --c2: #d41f1f; }

	.piece {
		width: 2.1rem; height: 2.1rem; padding: 0; border: 0; cursor: pointer;
		font: 900 1.15rem/1 var(--font-mono, monospace); color: #fff8d6; text-shadow: 0 2px 0 #9a5b00;
		background: linear-gradient(180deg, var(--c1), var(--c2));
		box-shadow: inset 3px 3px 0 rgba(255, 255, 255, 0.35), inset -3px -3px 0 rgba(0, 0, 0, 0.2), 0 3px 8px rgba(0, 0, 0, 0.3);
		border-radius: 4px;
	}
	.block .piece { box-shadow: inset 0 0 0 2px #7a4a00, inset 3px 3px 0 rgba(255, 255, 255, 0.35), inset -3px -3px 0 rgba(0, 0, 0, 0.2), 0 3px 8px rgba(0, 0, 0, 0.3); }
	.rupee .piece { clip-path: polygon(50% 0, 100% 28%, 100% 72%, 50% 100%, 0 72%, 0 28%); border-radius: 0; width: 1.7rem; height: 2.3rem; filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.35)); }
	.bell .piece { border-radius: 50% 50% 45% 45%; background: radial-gradient(circle at 35% 30%, #fff3b0, var(--c1) 40%, var(--c2)); }
	.star .piece { clip-path: polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); border-radius: 0; width: 2.4rem; height: 2.4rem; }
	.ball .piece { border-radius: 50%; background: linear-gradient(180deg, var(--c1) 0 46%, #222 46% 54%, #fff 54%); box-shadow: inset 0 0 0 2px #222, 0 3px 8px rgba(0, 0, 0, 0.3); }
	.piece:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
	.piece.hit { animation: bump 0.22s ease-out; }
	.count { font: 800 0.7rem var(--font-mono, monospace); color: #ffd23f; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6); }

	.pop { position: absolute; left: 50%; top: -0.2rem; translate: -50% 0; pointer-events: none; animation: rise 1s cubic-bezier(0.2, 0.7, 0.3, 1) forwards; }
	.treat { display: block; width: 0.9rem; height: 1.2rem; border-radius: 50%; background: radial-gradient(circle at 30% 25%, #fff, var(--c1) 50%, var(--c2)); animation: flip 0.45s linear infinite; }
	.rupee .treat { border-radius: 0; clip-path: polygon(50% 0, 100% 28%, 100% 72%, 50% 100%, 0 72%, 0 28%); }
	.star .treat { border-radius: 0; width: 1.1rem; height: 1.1rem; clip-path: polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); }
	.cheer { font: 900 0.8rem var(--font-mono, monospace); color: #5cff7a; text-shadow: 0 1px 0 #064d14, 0 0 6px rgba(92, 255, 122, 0.6); white-space: nowrap; }

	@keyframes bump { 40% { transform: translateY(-7px); } }
	@keyframes rise { 0% { transform: translateY(0); opacity: 1; } 55% { transform: translateY(-2.4rem); opacity: 1; } 100% { transform: translateY(-1.2rem); opacity: 0; } }
	@keyframes flip { to { transform: rotateY(360deg); } }

	@media (prefers-reduced-motion: reduce) { .piece.hit, .pop, .treat { animation: none; } .pop { opacity: 0; } }
	:global(.reduce-motion) .egg .piece, :global(.reduce-motion) .egg .pop, :global(.reduce-motion) .egg .treat { animation: none !important; }
</style>
