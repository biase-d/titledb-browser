<script>
	/**
	 * The banner behind a profile, one per badge: each tier unlocks a pattern
	 * drawn in the badge's own colour, so a higher tier looks richer, not just
	 * different. Pure CSS (no images), and the drift stops under reduced motion
	 *
	 * @type {{ badge: { threshold: number, color: string } | null }}
	 */
	let { badge } = $props()
</script>

{#if badge}
	<div class="banner t{badge.threshold}" style="--c: {badge.color}" aria-hidden="true"></div>
{/if}

<style>
	.banner {
		position: absolute; inset: 0; opacity: 0.5; pointer-events: none;
		--soft: color-mix(in srgb, var(--c) 28%, transparent);
		--mid: color-mix(in srgb, var(--c) 45%, transparent);
		-webkit-mask-image: linear-gradient(100deg, #000 0%, transparent 85%);
		mask-image: linear-gradient(100deg, #000 0%, transparent 85%);
		animation: drift 40s linear infinite;
	}
	@keyframes drift { to { background-position: var(--dx, 80px) var(--dy, 0); } }

	/* Shroom Stomper: spots */
	.t1 { background: radial-gradient(circle, var(--mid) 0 5px, transparent 6px) 0 0 / 38px 38px, radial-gradient(circle, var(--soft) 0 3px, transparent 4px) 19px 19px / 38px 38px; --dx: 38px; --dy: 38px; }
	/* Grumpy Gator: blades of grass */
	.t5 { background: repeating-linear-gradient(80deg, var(--soft) 0 2px, transparent 2px 14px), repeating-linear-gradient(100deg, var(--mid) 0 1px, transparent 1px 22px); --dx: 22px; }
	/* Floating Brain Jelly: rising bubbles */
	.t15 { background: radial-gradient(circle at 30% 70%, transparent 0 9px, var(--mid) 10px 11px, transparent 12px) 0 0 / 70px 70px, radial-gradient(circle at 70% 30%, transparent 0 5px, var(--soft) 6px 7px, transparent 8px) 0 0 / 50px 50px; --dx: 0; --dy: -70px; }
	/* Spooky Robe Guy: drifting fog bands */
	.t30 { background: repeating-linear-gradient(115deg, transparent 0 30px, var(--soft) 30px 60px, transparent 60px 100px); --dx: 100px; filter: blur(2px); }
	/* Big Buff Croc: chevrons */
	.t50 { background: repeating-linear-gradient(135deg, transparent 0 14px, var(--soft) 14px 16px), repeating-linear-gradient(45deg, transparent 0 14px, var(--soft) 14px 16px); --dx: 28px; }
	/* Evil Gray Twin: crossed blades */
	.t100 { background: repeating-linear-gradient(45deg, transparent 0 18px, var(--mid) 18px 19px), repeating-linear-gradient(-45deg, transparent 0 18px, var(--soft) 18px 19px); --dx: 36px; }
	/* King K. Roolish: a crown of rays */
	.t200 { background: repeating-conic-gradient(from 0deg at 85% 120%, var(--mid) 0 4deg, transparent 4deg 12deg); animation: none; }
	/* Big Purple Pterodactyl: wing sweeps */
	.t300 { background: radial-gradient(ellipse 60% 120% at 100% 100%, transparent 55%, var(--mid) 56% 58%, transparent 59%) 0 0 / 160px 90px, radial-gradient(ellipse 60% 120% at 0 100%, transparent 55%, var(--soft) 56% 58%, transparent 59%) 0 0 / 160px 90px; --dx: 160px; }
	/* Ancient Angel Borb: halo rings */
	.t400 { background: repeating-radial-gradient(circle at 88% 50%, transparent 0 22px, var(--soft) 22px 24px); animation: none; }
	/* Creative Right Hand: golden light, slowly breathing */
	.t500 { background: radial-gradient(circle at 85% 40%, var(--mid), transparent 55%), repeating-conic-gradient(from 0deg at 85% 40%, var(--soft) 0 3deg, transparent 3deg 9deg); animation: breathe 6s ease-in-out infinite; }
	@keyframes breathe { 50% { opacity: 0.8; } }

	@media (prefers-reduced-motion: reduce) { .banner { animation: none; } }
	:global(.reduce-motion) .banner { animation: none !important; }
</style>
