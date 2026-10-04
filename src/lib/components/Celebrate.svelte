<script>
	import { onMount } from 'svelte'
	import { get } from 'svelte/store'
	import { fade, scale } from 'svelte/transition'
	import Coin from '$lib/components/Coin.svelte'
	import { preferences, isReducedMotion } from '$lib/stores/preferences'

	/**
	 * A celebration: a burst of confetti in the badge's colours from behind a coin
	 * that spins in, with a line or two of what happened. For a contribution that
	 * went in, and for a badge that was earned
	 *
	 * It closes itself after a few seconds, and on a press anywhere or Escape. Under
	 * reduced motion there is no burst and the coin does not spin: it is a card
	 *
	 * @type {{
	 *   title: string,
	 *   subtitle?: string,
	 *   badge?: { threshold: number, name: string, color: string, icon: string } | null,
	 *   big?: boolean,
	 *   seconds?: number,
	 *   onclose?: () => void
	 * }}
	 */
	let { title, subtitle = '', badge = null, big = false, seconds = 6, onclose = undefined } = $props()

	let reduced = $state(false)
	let open = $state(true)

	const base = ['#fbbf24', '#fff7c2', '#f87171', '#60a5fa', '#34d399', '#c084fc']
	// A fixed spread, so a burst is the same every time and renders alike on the server
	const pieces = Array.from({ length: 44 }, (_, k) => {
		const angle = (k / 44) * Math.PI * 2 + (k % 3) * 0.12
		const reach = 11 + ((k * 7) % 9) * 1.6
		return {
			x: Math.cos(angle) * reach,
			y: Math.sin(angle) * reach * 0.85 - 4,
			spin: (k % 2 ? 1 : -1) * (180 + ((k * 53) % 420)),
			delay: (k % 6) * 0.025,
			w: 0.35 + ((k * 11) % 5) / 10,
			color: k % 4 === 0 && badge ? badge.color : base[k % base.length]
		}
	})

	function close () {
		if (!open) return
		open = false
		onclose?.()
	}

	/** @param {KeyboardEvent} e */
	function key (e) {
		if (e.key === 'Escape') close()
	}

	onMount(() => {
		reduced = isReducedMotion(get(preferences))
		const timer = setTimeout(close, seconds * 1000)
		return () => clearTimeout(timer)
	})
</script>

<svelte:window onkeydown={key} />

{#if open}
	<div class="veil" role="presentation" onclick={close} transition:fade={{ duration: 250 }}>
		<div class="card" class:big role="status" aria-live="polite" transition:scale={{ start: 0.9, duration: 260 }}>
			{#if !reduced}
				<div class="burst" aria-hidden="true">
					{#each pieces as p, n (n)}
						<i style="--x: {p.x}rem; --y: {p.y}rem; --r: {p.spin}deg; --w: {p.w}rem; --d: {p.delay}s; background: {p.color}"></i>
					{/each}
				</div>
			{/if}

			{#if badge}
				<div class="coin"><Coin {badge} size={big ? '5.5rem' : '4rem'} /></div>
			{/if}
			<h2>{title}</h2>
			{#if badge}<p class="badge-name" style="color: {badge.color}">{badge.name}</p>{/if}
			{#if subtitle}<p class="sub">{subtitle}</p>{/if}
			<button type="button" class="ok" onclick={close}>Nice</button>
		</div>
	</div>
{/if}

<style>
	/* Above the cartridge canvas (40), the header (50) and the dialogs (90) */
	.veil { position: fixed; inset: 0; z-index: 95; display: grid; place-items: center; background: rgba(8, 9, 14, 0.55); cursor: pointer; }
	.card {
		position: relative;
		width: min(24rem, calc(100vw - 2rem));
		padding: 2rem 1.5rem 1.5rem;
		text-align: center;
		border-radius: 22px;
		background: var(--surface-color);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
		cursor: default;
	}
	.card.big { width: min(28rem, calc(100vw - 2rem)); padding-top: 2.5rem; }
	h2 { font-size: 1.5rem; font-weight: 900; letter-spacing: -0.02em; margin: 0.75rem 0 0.2rem; }
	.badge-name { margin: 0 0 0.5rem; font-weight: 800; font-size: 1.05rem; }
	.sub { margin: 0.4rem 0 0; color: var(--text-secondary); line-height: 1.5; font-size: 0.95rem; }
	.coin { display: grid; place-items: center; }
	.ok { margin-top: 1.25rem; height: 2.5rem; padding: 0 1.4rem; border: 0; border-radius: 999px; background: var(--primary-color); color: var(--primary-action-text, #fff); font: inherit; font-weight: 700; cursor: pointer; }

	/* Confetti thrown out from behind the coin, falling as it fades */
	.burst { position: absolute; left: 50%; top: 4.5rem; width: 0; height: 0; pointer-events: none; }
	.burst i {
		position: absolute;
		width: var(--w);
		height: calc(var(--w) * 1.8);
		margin: -0.3rem;
		border-radius: 2px;
		opacity: 0;
		animation: throw 1.9s var(--d) cubic-bezier(0.16, 0.8, 0.3, 1) forwards;
	}
	@keyframes throw {
		0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
		55% { opacity: 1; }
		100% { transform: translate(var(--x), calc(var(--y) + 14rem)) rotate(var(--r)); opacity: 0; }
	}

	@media (prefers-reduced-motion: reduce) { .burst i { animation: none; } }
	:global(.reduce-motion) .burst i { animation: none !important; display: none; }
</style>
