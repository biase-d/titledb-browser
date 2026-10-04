<script>
	import SeasonSymbols from '$lib/components/SeasonSymbols.svelte'
	import { useSeason } from '$lib/useSeason.svelte.js'

	/**
	 * The season's scene inside a hero panel, drawn in layers so it has depth and
	 * is of the same piece as the hero: the sky and the ground are tinted with the
	 * game's own colour (--dynamic-primary), the light falls where the cartridge
	 * stands, and the cartridge stands on the ground among its props. The title
	 * and buttons sit above all of it
	 *
	 * Put as the first thing after the banner in a positioned panel whose
	 * cartridge is at its lower right (--real-mm is how big a millimetre is)
	 *
	 * It is put up the way the page's scene is, a layer or a piece at a time as the
	 * season fills in ($lib/seasons), and taken down with it. The same Settings
	 * switch and ?season= preview apply. Under reduced motion it is all still
	 */
	const season = useSeason()

	let kind = $derived(season.kind)
	let i = $derived(season.intensity)
	let still = $derived(season.reduced)

	/** Is a layer up yet? @param {number} at */
	const on = (at) => i >= at

	/** Particles with a spread that never changes between renders @param {number} n */
	const spread = (n) => Array.from({ length: n }, (_, k) => ({
		left: (k * 37 + 11) % 100,
		delay: -((k * 1.7) % 14),
		dur: 9 + (k % 5) * 2.2,
		size: 0.6 + ((k * 13) % 7) / 10,
		sway: 14 + (k % 4) * 8,
		hue: k % 4
	}))
	const flakes = spread(26)
	const leaves = spread(18)
	const stars = Array.from({ length: 34 }, (_, k) => ({
		left: (k * 29 + 7) % 100,
		top: (k * 17 + 5) % 62,
		size: 1 + (k % 3),
		delay: -((k * 0.9) % 6)
	}))

	/** A string of lights hung in swags across the top: x in %, y in px */
	const bulbs = Array.from({ length: 26 }, (_, k) => {
		const x = (k / 25) * 100
		const y = 5 + 15 * Math.sin(Math.PI * ((x / 100 * 4) % 1))
		return { x, y, hue: k % 3, delay: -((k * 0.37) % 3) }
	})
	const wire = bulbs.map(b => `${b.x.toFixed(1)},${b.y.toFixed(1)}`).join(' ')

	const fence = Array.from({ length: 16 }, (_, k) => 640 + k * 24)
</script>

<SeasonSymbols />

{#if kind}
	<div class="scene {kind}" class:still aria-hidden="true">
		<!-- The sky: a tint over the banner, deeper at the top, warm at the horizon -->
		<div class="sky" class:up={on(0.1)}></div>

		{#if kind === 'halloween'}
			<div class="moon" class:up={on(0.3)}>
				<i class="crater a"></i><i class="crater b"></i><i class="crater c"></i>
			</div>
			<div class="cloud c1" class:up={on(0.3)}></div>
			<div class="cloud c2" class:up={on(0.45)}></div>
		{:else if kind === 'autumn'}
			<div class="sun" class:up={on(0.25)}></div>
		{:else}
			{#each stars as s, n (n)}
				<i class="star" class:up={on(0.2)} style="left: {s.left}%; top: {s.top}%; width: {s.size}px; height: {s.size}px; animation-delay: {s.delay}s"></i>
			{/each}
			<div class="aurora a1" class:up={on(0.35)}></div>
			<div class="aurora a2" class:up={on(0.5)}></div>
			<div class="moon small" class:up={on(0.3)}></div>
		{/if}

		<!-- Ground, in two hills, tinted with the game's colour so they belong to this hero -->
		<svg class="hills" class:up={on(0.2)} viewBox="0 0 1200 100" preserveAspectRatio="none">
			<path class="hill back" d="M0 58 C150 30 300 70 480 50 S800 18 1000 55 S1160 40 1200 50 V100 H0Z" />
			<path class="hill mid" d="M0 72 C180 52 340 84 560 66 S900 52 1200 74 V100 H0Z" />
			{#if kind === 'halloween'}
				<g class="fence">
					<rect x="636" y="66" width="400" height="3" />
					<rect x="636" y="76" width="400" height="3" />
					{#each fence as x (x)}<rect {x} y="58" width="7" height="30" />{/each}
				</g>
			{/if}
			<path class="hill front" d="M0 88 C200 76 340 96 560 86 S920 78 1200 90 V100 H0Z" />
		</svg>

		<!-- Trees and the like standing on those hills -->
		{#if kind === 'halloween'}
			<svg class="tree dead" class:up={on(0.75)} viewBox="0 0 120 170">
				<g stroke-linecap="round" fill="none">
					<path d="M62 170 C60 130 66 100 60 70" stroke-width="9" />
					<path d="M61 100 C45 88 34 70 20 62 M34 76 C28 62 30 50 24 40 M61 84 C78 72 90 60 104 58 M88 66 C94 52 90 42 98 30 M61 70 C58 54 64 42 56 24" stroke-width="4" />
					<path d="M20 62 l-10 -6 M24 40 l-8 -8 M104 58 l10 -6 M98 30 l8 -8 M56 24 l-6 -10" stroke-width="2.5" />
				</g>
			</svg>
		{:else if kind === 'autumn'}
			<svg class="tree maple" class:up={on(0.5)} viewBox="0 0 160 180">
				<path d="M80 180 C78 150 84 130 80 104" stroke-width="10" class="trunk" fill="none" stroke-linecap="round" />
				<path d="M80 130 C60 118 50 104 40 96 M80 118 C98 104 112 96 122 84" stroke-width="5" class="trunk" fill="none" stroke-linecap="round" />
				<circle cx="80" cy="66" r="42" class="canopy c1" />
				<circle cx="46" cy="86" r="28" class="canopy c2" />
				<circle cx="116" cy="82" r="30" class="canopy c3" />
				<circle cx="74" cy="42" r="26" class="canopy c4" />
			</svg>
		{:else}
			{#each [{ at: 0.45, l: '48%', h: 8.5 }, { at: 0.55, l: '57%', h: 6 }, { at: 0.7, l: '38%', h: 5 }, { at: 0.8, l: '66%', h: 4.2 }] as pine (pine.l)}
				<svg class="pine" class:up={on(pine.at)} style="left: {pine.l}; height: {pine.h}rem" viewBox="0 0 60 100">
					<path d="M30 2 L50 36 L40 36 L56 64 L44 64 L60 94 H0 L16 64 H4 L20 36 H10 Z" class="needles" />
					<path d="M30 2 L38 18 L30 15 L22 18Z M20 36 L30 32 L40 36 L36 44 L24 44Z M10 64 L30 58 L50 64 L54 74 L6 74Z" class="snowcap" />
					<rect x="26" y="94" width="8" height="6" class="trunk" />
				</svg>
			{/each}
		{/if}

		<!-- Mist along the ground -->
		<div class="mist m1" class:up={on(0.2)}></div>
		<div class="mist m2" class:up={on(0.4)}></div>

		<!-- The cartridge stands here; its props are placed against it, so they
		     keep their place beside it at any size of panel -->
		<div class="spot">
			{#if kind === 'halloween'}
				<svg class="p pumpkin big" class:up={on(0.35)} viewBox="0 0 100 90"><use href="#prop-pumpkin" /></svg>
				<svg class="p candy" class:up={on(0.45)} viewBox="0 0 100 90"><use href="#prop-candy" /></svg>
				<svg class="p ghost" class:up={on(0.55)} viewBox="0 0 100 90"><use href="#prop-ghost" /></svg>
				<svg class="p pumpkin right" class:up={on(0.7)} viewBox="0 0 100 90"><use href="#prop-pumpkin" /></svg>
				<svg class="p pumpkin far" class:up={on(0.85)} viewBox="0 0 100 90"><use href="#prop-pumpkin" /></svg>
			{:else if kind === 'autumn'}
				<svg class="p pile big" class:up={on(0.3)} viewBox="0 0 100 90"><use href="#prop-leaves" /></svg>
				<svg class="p acorn" class:up={on(0.45)} viewBox="0 0 100 90"><use href="#prop-acorn" /></svg>
				<svg class="p mushroom" class:up={on(0.6)} viewBox="0 0 100 90"><use href="#prop-mushroom" /></svg>
				<svg class="p pile right" class:up={on(0.75)} viewBox="0 0 100 90"><use href="#prop-leaves-small" /></svg>
			{:else}
				<svg class="p snowman" class:up={on(0.3)} viewBox="0 0 100 90"><use href="#prop-snowman" /></svg>
				<svg class="p present" class:up={on(0.45)} viewBox="0 0 100 90"><use href="#prop-present" /></svg>
				<svg class="p mound" class:up={on(0.6)} viewBox="0 0 100 90"><use href="#prop-mound" /></svg>
				<svg class="p pine-small" class:up={on(0.75)} viewBox="0 0 100 90"><use href="#prop-pine" /></svg>
			{/if}
		</div>

		<!-- Things that move through it (the bats have a layer of their own, above everything) -->
		{#if kind === 'autumn'}
			{#each leaves as l, n (n)}
				<i class="leaf h{l.hue}" class:up={on(n < 9 ? 0.4 : 0.8)} style="left: {l.left}%; --sz: {l.size}rem; --sway: {l.sway}px; animation-duration: {l.dur}s; animation-delay: {l.delay}s"></i>
			{/each}
		{:else}
			{#each flakes as f, n (n)}
				<i class="flake" class:up={on(n < 13 ? 0.25 : 0.7)} style="left: {f.left}%; --sz: {f.size * 0.45}rem; --sway: {f.sway}px; animation-duration: {f.dur}s; animation-delay: {f.delay}s"></i>
			{/each}
		{/if}

		<!-- Lights hung in swags under the progress bars, throwing a little of their colour down -->
		<div class="lights" class:up={on(kind === 'autumn' ? 0.7 : 0.5)}>
			<svg viewBox="0 0 100 30" preserveAspectRatio="none"><polyline points={wire} /></svg>
			{#each bulbs as b, n (n)}
				<i class="bulb h{b.hue}" style="left: {b.x}%; top: {b.y}px; animation-delay: {b.delay}s"></i>
			{/each}
		</div>

		{#if kind === 'halloween'}
			<svg class="web" class:up={on(0.7)} viewBox="0 0 100 100">
				<g fill="none" stroke-width="0.8">
					<path d="M0 0 L100 0 M0 0 L0 100 M0 0 L84 58 M0 0 L58 84 M0 0 L96 28 M0 0 L28 96" />
					<path d="M18 0 Q10 10 0 18 M38 0 Q22 22 0 38 M60 0 Q36 36 0 60 M82 0 Q50 50 0 82" />
				</g>
			</svg>
		{/if}
	</div>
{/if}

<style>
	/* The scene fills the panel behind everything else in it. The cartridge's own
	   size and place (see the hero) set the scale of what stands beside it */
	.scene {
		position: absolute;
		inset: 0;
		z-index: 0;
		overflow: hidden;
		pointer-events: none;
		--cw: calc(21 * var(--real-mm, 3.7795px));
		--cr: clamp(3rem, 9%, 7.5rem);
		--ground: color-mix(in srgb, var(--dynamic-primary, #3b82f6) 16%, #07060d);
		--ground-2: color-mix(in srgb, var(--dynamic-primary, #3b82f6) 10%, #04030a);
	}

	.scene > *:not(.spot), .spot > .p { opacity: 0; transition: opacity 1.4s ease, transform 1.4s cubic-bezier(0.22, 1, 0.36, 1); }
	.scene > .up, .spot > .p.up { opacity: 1; }
	.spot > .p { transform: translateY(14px) scale(0.85); }
	.spot > .p.up { transform: none; }

	/* ---- Sky ---- */
	.sky { position: absolute; inset: 0; }
	.halloween .sky { background: linear-gradient(180deg, rgba(34, 8, 62, 0.62), rgba(70, 16, 60, 0.28) 55%, rgba(255, 112, 24, 0.3)); }
	.autumn .sky { background: linear-gradient(180deg, rgba(120, 52, 8, 0.4), rgba(255, 150, 40, 0.18) 60%, rgba(255, 190, 80, 0.34)); }
	.winter .sky { background: linear-gradient(180deg, rgba(6, 14, 46, 0.7), rgba(24, 52, 110, 0.32) 60%, rgba(150, 200, 255, 0.28)); }

	/* ---- Heavenly bodies ---- */
	.moon {
		position: absolute;
		right: calc(var(--cr) + var(--cw) * 1.1);
		top: 9%;
		width: 7.5rem;
		aspect-ratio: 1;
		border-radius: 50%;
		background: radial-gradient(circle at 38% 34%, #fffbe8, #f6e6ac 55%, #d8c07a);
		box-shadow: 0 0 40px 10px rgba(255, 238, 170, 0.35), 0 0 120px 40px rgba(255, 220, 140, 0.18);
	}
	.moon.small { width: 3.4rem; right: calc(var(--cr) + var(--cw) * 2.2); top: 10%; background: radial-gradient(circle at 38% 34%, #fff, #dfe8ff 60%, #b9c8ee); box-shadow: 0 0 30px 6px rgba(190, 215, 255, 0.4); }
	.crater { position: absolute; border-radius: 50%; background: rgba(170, 140, 70, 0.28); }
	.crater.a { width: 22%; height: 22%; left: 24%; top: 30%; }
	.crater.b { width: 14%; height: 14%; left: 58%; top: 20%; }
	.crater.c { width: 18%; height: 18%; left: 52%; top: 58%; }

	.cloud { position: absolute; top: 14%; height: 1.6rem; width: 11rem; border-radius: 50%; background: rgba(20, 8, 36, 0.55); filter: blur(7px); }
	.cloud.c1 { right: calc(var(--cr) - 2rem); animation: cloud 60s linear infinite; }
	.cloud.c2 { right: calc(var(--cr) + 12rem); top: 26%; width: 8rem; animation: cloud 80s linear infinite reverse; }
	@keyframes cloud { from { translate: -6rem 0; } to { translate: 12rem 0; } }

	.sun {
		position: absolute;
		right: calc(var(--cr) - 7rem);
		bottom: -6rem;
		width: 26rem;
		aspect-ratio: 1;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(255, 244, 190, 0.95) 0 18%, rgba(255, 200, 100, 0.55) 30%, rgba(255, 150, 60, 0.18) 55%, transparent 70%);
		animation: breathe 9s ease-in-out infinite;
	}
	@keyframes breathe { 50% { scale: 1.06; } }

	.star { position: absolute; border-radius: 50%; background: #fff; box-shadow: 0 0 6px 1px rgba(255, 255, 255, 0.7); animation: twinkle 4s ease-in-out infinite; }
	@keyframes twinkle { 50% { opacity: 0.25; } }

	.aurora { position: absolute; left: -10%; right: -10%; top: 0; height: 55%; filter: blur(26px); mix-blend-mode: screen; animation: sway 18s ease-in-out infinite alternate; }
	.aurora.a1 { background: linear-gradient(100deg, transparent 5%, rgba(60, 255, 170, 0.5) 30%, rgba(80, 200, 255, 0.4) 55%, transparent 80%); }
	.aurora.a2 { background: linear-gradient(80deg, transparent 20%, rgba(170, 90, 255, 0.4) 50%, rgba(60, 255, 200, 0.3) 70%, transparent 95%); top: 8%; animation-duration: 25s; animation-direction: alternate-reverse; }
	@keyframes sway { from { translate: -4% 0; } to { translate: 5% 3%; } }

	/* ---- Ground ---- */
	.hills { position: absolute; left: 0; right: 0; bottom: 0; width: 100%; height: 6.5rem; }
	.hill.back { fill: color-mix(in srgb, var(--ground) 80%, #5a3a7a); }
	.hill.mid { fill: var(--ground); }
	.hill.front { fill: var(--ground-2); }
	.fence rect { fill: var(--ground-2); }
	.autumn .hill.back { fill: color-mix(in srgb, #7a3a0c 70%, var(--ground)); }
	.autumn .hill.mid { fill: color-mix(in srgb, #4a2208 75%, var(--ground)); }
	.autumn .hill.front { fill: color-mix(in srgb, #2a1404 80%, var(--ground-2)); }
	.winter .hill.back { fill: #9fb6dc; }
	.winter .hill.mid { fill: #d9e6fb; }
	.winter .hill.front { fill: #f4f8ff; }

	.tree { position: absolute; bottom: 3rem; fill: var(--ground-2); stroke: var(--ground-2); }
	.tree.dead { left: 63%; height: 10.5rem; }
	.tree.maple { left: 61%; height: 10rem; stroke: none; }
	.tree.maple .trunk { stroke: #2a1404; fill: none; }
	.canopy.c1 { fill: #c2561a; } .canopy.c2 { fill: #e0861f; } .canopy.c3 { fill: #b8321a; } .canopy.c4 { fill: #f0b43a; }
	.pine { position: absolute; bottom: 3.1rem; width: auto; }
	.pine .needles { fill: #123a3a; } .pine .snowcap { fill: #f4f8ff; } .pine .trunk { fill: #3b2410; }

	.mist { position: absolute; left: -25%; width: 150%; height: 7rem; bottom: -1rem; background: radial-gradient(50% 45% at 50% 70%, rgba(225, 208, 255, 0.3), transparent 72%); filter: blur(10px); animation: drift 30s ease-in-out infinite alternate; }
	.mist.m2 { height: 5rem; bottom: 0.5rem; animation-duration: 22s; animation-direction: alternate-reverse; background: radial-gradient(50% 45% at 50% 70%, rgba(255, 190, 120, 0.22), transparent 72%); }
	.autumn .mist { background: radial-gradient(50% 45% at 50% 70%, rgba(255, 214, 150, 0.32), transparent 72%); }
	.winter .mist { background: radial-gradient(50% 45% at 50% 70%, rgba(220, 238, 255, 0.5), transparent 72%); }
	@keyframes drift { from { translate: -6% 0; } to { translate: 6% 0; } }

	/* ---- Props around the cartridge ---- */
	.spot { position: absolute; right: var(--cr); bottom: 1.5rem; width: var(--cw); height: 0; }
	.p { position: absolute; bottom: 0; height: auto; filter: drop-shadow(0 0 16px rgba(255, 150, 40, 0.4)); transform-origin: 50% 100%; }
	.autumn .p { filter: drop-shadow(0 0 12px rgba(255, 190, 80, 0.3)); }
	.winter .p { filter: drop-shadow(0 0 14px rgba(180, 215, 255, 0.45)); }

	.pumpkin.big { right: calc(100% + 0.1 * var(--cw)); width: calc(var(--cw) * 1.15); }
	.candy { right: calc(100% + 1.15 * var(--cw)); width: calc(var(--cw) * 0.5); }
	.ghost { right: calc(100% + 1.55 * var(--cw)); width: calc(var(--cw) * 0.75); bottom: 0.6rem; }
	.pumpkin.right { left: calc(100% + 0.05 * var(--cw)); width: calc(var(--cw) * 0.62); }
	.pumpkin.far { right: calc(100% + 2.5 * var(--cw)); width: calc(var(--cw) * 0.6); }
	.pile.big { right: calc(100% + 0.05 * var(--cw)); width: calc(var(--cw) * 1.35); }
	.acorn { right: calc(100% + 1.4 * var(--cw)); width: calc(var(--cw) * 0.4); }
	.mushroom { right: calc(100% + 1.75 * var(--cw)); width: calc(var(--cw) * 0.6); }
	.pile.right { left: calc(100% + 0.05 * var(--cw)); width: calc(var(--cw) * 0.7); }
	.snowman { right: calc(100% + 0.1 * var(--cw)); width: calc(var(--cw) * 1.1); }
	.present { right: calc(100% + 1.2 * var(--cw)); width: calc(var(--cw) * 0.6); }
	.mound { left: calc(100% + 0.05 * var(--cw)); width: calc(var(--cw) * 0.8); }
	.pine-small { right: calc(100% + 1.9 * var(--cw)); width: calc(var(--cw) * 0.7); }

	.scene :global(.face) { animation: flicker 3.2s ease-in-out infinite; }
	.scene :global(.bob) { animation: bob 4s ease-in-out infinite; }
	.scene :global(.leaf) { animation: sway-leaf 5s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 100%; }
	@keyframes flicker { 0%, 100% { opacity: 1; } 42% { opacity: 0.8; } 48% { opacity: 1; } 71% { opacity: 0.9; } }
	@keyframes bob { 50% { transform: translateY(-5px); } }
	@keyframes sway-leaf { 50% { transform: rotate(4deg); } }

	/* ---- Things moving through ---- */
	.leaf { position: absolute; top: -1.5rem; width: var(--sz); height: var(--sz); animation: fall linear infinite; clip-path: polygon(50% 0, 82% 26%, 100% 60%, 58% 56%, 54% 100%, 46% 100%, 42% 56%, 0 60%, 18% 26%); }
	.leaf.h0 { background: #d9531a; } .leaf.h1 { background: #f0a62c; } .leaf.h2 { background: #b8321a; } .leaf.h3 { background: #e8c44a; }
	@keyframes fall {
		0% { translate: 0 0; rotate: 0deg; }
		25% { translate: var(--sway) 7rem; rotate: 140deg; }
		50% { translate: calc(var(--sway) * -0.6) 14rem; rotate: 250deg; }
		75% { translate: var(--sway) 21rem; rotate: 380deg; }
		100% { translate: 0 29rem; rotate: 520deg; }
	}

	.flake { position: absolute; top: -1rem; width: var(--sz); height: var(--sz); border-radius: 50%; background: #fff; box-shadow: 0 0 6px rgba(255, 255, 255, 0.8); animation: snow linear infinite; }
	@keyframes snow {
		0% { translate: 0 0; }
		33% { translate: var(--sway) 9rem; }
		66% { translate: calc(var(--sway) * -1) 19rem; }
		100% { translate: 0 29rem; }
	}

	/* ---- Lights ---- */
	.lights { position: absolute; left: 0; right: 0; top: 7px; height: 32px; }
	.lights svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
	.lights polyline { fill: none; stroke: rgba(0, 0, 0, 0.55); stroke-width: 1.2; vector-effect: non-scaling-stroke; }
	.bulb { position: absolute; width: 9px; height: 12px; margin: 0 0 0 -4.5px; border-radius: 50% 50% 55% 55%; animation: glow 3s ease-in-out infinite; }
	.halloween .bulb.h0, .autumn .bulb.h0 { background: #ffb347; color: #ffb347; }
	.halloween .bulb.h1 { background: #b46bff; color: #b46bff; }
	.halloween .bulb.h2 { background: #6dff7a; color: #6dff7a; }
	.autumn .bulb.h1 { background: #ffd98a; color: #ffd98a; } .autumn .bulb.h2 { background: #ff9a5c; color: #ff9a5c; }
	.winter .bulb.h0 { background: #ff6b6b; color: #ff6b6b; } .winter .bulb.h1 { background: #6bd5ff; color: #6bd5ff; } .winter .bulb.h2 { background: #ffe66b; color: #ffe66b; }
	.bulb { box-shadow: 0 0 10px 3px currentColor, 0 12px 26px 4px color-mix(in srgb, currentColor 22%, transparent); }
	@keyframes glow { 50% { opacity: 0.55; } }

	.web { position: absolute; left: 0; top: 0; width: 7.5rem; height: 7.5rem; fill: none; stroke: rgba(255, 255, 255, 0.42); }

	/* ---- Narrow panels: the cartridge moves to the top, so the standing props and the
	   tall things go, and the sky, ground, lights and weather stay ---- */
	@media (max-width: 768px) {
		.spot, .tree, .pine, .moon, .cloud, .sun, .web { display: none; }
		.hills { height: 4.5rem; }
	}

	/* ---- Still: reduced motion keeps the picture and drops the movement ---- */
	.still *, .still :global(.face), .still :global(.bob), .still :global(.leaf) { animation: none !important; }
	.still .leaf, .still .flake { display: none; }
	@media (prefers-reduced-motion: reduce) {
		.scene *, .scene :global(.face), .scene :global(.bob), .scene :global(.leaf) { animation: none !important; }
		.scene .leaf, .scene .flake { display: none; }
	}
	:global(.reduce-motion) .scene *, :global(.reduce-motion) .scene :global(.face), :global(.reduce-motion) .scene :global(.bob), :global(.reduce-motion) .scene :global(.leaf) { animation: none !important; }
	:global(.reduce-motion) .scene .leaf, :global(.reduce-motion) .scene .flake { display: none; }
</style>
