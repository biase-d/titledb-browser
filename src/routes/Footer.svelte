<script>
	import '@fontsource-variable/caveat'
	import Icon from '@iconify/svelte'
	import { get } from 'svelte/store'
	import { preferences, isReducedMotion } from '$lib/stores/preferences'

	// The "updating game data" notice used to live here. It now renders in
	// AnnouncementBanner at the top of the page, because a notice about data
	// being incomplete is worth nothing below the fold
	const currentYear = new Date().getFullYear()

	/**
	 * The footer is the base the cartridges stand on: a lit ledge along its top
	 * edge and a row of small ones standing on it. Only a decoration, so it is
	 * hidden from assistive technology and costs nothing but a few boxes
	 */
	const row = [
		{ c: '#e8412c', h: 2.1, r: -2 },
		{ c: '#2f7be8', h: 2.5, r: 1 },
		{ c: '#f4b73a', h: 2.2, r: -1 },
		{ c: '#35b46a', h: 2.6, r: 2 },
		{ c: '#9456e0', h: 2.3, r: -2 },
		{ c: '#e8412c', h: 2.0, r: 1 }
	]

	function toTop () {
		window.scrollTo({ top: 0, behavior: isReducedMotion(get(preferences)) ? 'auto' : 'smooth' })
	}
</script>

<footer class="site-footer">
	<!-- The ledge: a lit lip along the top, with cartridges standing on it -->
	<div class="ledge" aria-hidden="true">
		<div class="standing">
			{#each row as cart, n (n)}
				<i class="mini" style="--c: {cart.c}; --h: {cart.h}rem; --r: {cart.r}deg"></i>
			{/each}
			<i class="mini ghost" style="--h: 2.3rem"></i>
		</div>
	</div>

	<div class="footer-inner">
		<div class="footer-sections">
			<div class="footer-brand">
				<div class="logo">
					<span class="mark" aria-hidden="true"></span>
					Switch Performance
				</div>
				<p>
					The community-powered database for Nintendo Switch technical
					performance. Track FPS, resolutions, and graphics settings
					for thousands of titles.
				</p>
				<a class="cta" href="/contribute">
					<span>Add what you know</span>
					<Icon icon="mdi:arrow-right" width="18" />
				</a>
			</div>

			<div class="footer-group">
				<h4>Navigate</h4>
				<nav>
					<a href="/">Home</a>
					<a href="/favorites">Favorites</a>
					<a href="/contribute">Contribute</a>
					<a href="/stats">Insights</a>
				</nav>
			</div>

			<div class="footer-group">
				<h4>Project</h4>
				<nav>
					<a
						href="https://github.com/biase-d/titledb-browser"
						target="_blank"
						rel="noopener noreferrer">Source Code</a
					>
					<a
						href="https://github.com/biase-d/titledb-browser/issues"
						target="_blank"
						rel="noopener noreferrer">Report Issue</a
					>
					<a
						href="https://github.com/biase-d/nx-performance"
						target="_blank"
						rel="noopener noreferrer">NX Performance</a
					>
				</nav>
			</div>

			<div class="footer-group">
				<h4>Legal</h4>
				<nav>
					<a href="/privacy">Privacy Policy</a>
					<a href="/legal">Legal & Disclaimers</a>
					<a href="/status">System Status</a>
					<a
						href="https://github.com/biase-d/titledb-browser/blob/main/LICENSE"
						target="_blank"
						rel="noopener noreferrer">AGPL v3 License</a
					>
				</nav>
			</div>
		</div>

		<!-- The maker, in a section of its own -->
		<section class="made-by" aria-label="About the maker">
			<span class="made-label">Made by</span>
			<a
				class="self-plug"
				href="https://github.com/biase-d"
				target="_blank"
				rel="noopener noreferrer"
			>
				a biase-d project
			</a>
			<span class="made-note"
				>Built in the open and free to use, under the AGPL v3.</span
			>
		</section>

		<div class="footer-bottom">
			<div class="copyright">
				&copy; {currentYear} Switch Performance
			</div>

			<!-- A cartridge in its slot; hovering lifts it out, pressing takes you to the top -->
			<button class="to-top" onclick={toTop} aria-label="Back to the top of the page">
				<span class="slot" aria-hidden="true"></span>
				<span class="plug" aria-hidden="true">
					<i class="band"></i>
					<Icon icon="mdi:chevron-up" width="16" />
				</span>
				<span class="to-top-text">Top</span>
			</button>
		</div>

		<div class="footer-disclaimer">
			Nintendo Switch is a trademark of Nintendo. Switch Performance is
			not affiliated with Nintendo.
		</div>
	</div>
</footer>

<style>
	.site-footer {
		position: relative;
		margin-top: 6.5rem;
		/* A shade darker than the page, like a base the page stands on */
		background: color-mix(in srgb, var(--surface-color) 92%, #000);
		padding: 0 1.5rem 2rem;
		--lip: color-mix(in srgb, var(--text-secondary) 30%, var(--surface-color));
	}

	/* ---- The ledge ---- */
	.ledge {
		position: relative;
		height: 0.8rem;
		margin: 0 -1.5rem;
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--lip) 70%, #fff) 0 12%,
			var(--lip) 12% 100%
		);
		box-shadow:
			0 8px 14px -6px rgba(0, 0, 0, 0.35),
			inset 0 -1px 0 rgba(0, 0, 0, 0.25);
	}

	.standing {
		position: absolute;
		right: max(1.5rem, calc((100vw - 1400px) / 2 + 1.5rem));
		bottom: 100%;
		display: none;
		align-items: flex-end;
		gap: 0.5rem;
	}

	@media (min-width: 720px) {
		.standing { display: flex; }
	}

	/* A small cartridge: dark shell, a label with a coloured band, the notch at its foot */
	.mini {
		position: relative;
		display: block;
		width: 1.6rem;
		height: var(--h);
		border-radius: 0.22rem 0.22rem 0.1rem 0.1rem;
		background: linear-gradient(90deg, #26262b, #161619 40%, #0d0d10);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 2px 3px rgba(0, 0, 0, 0.35);
		transform: rotate(var(--r, 0deg));
		transform-origin: 50% 100%;
		margin-bottom: 0.05rem;
	}

	.mini::before {
		content: '';
		position: absolute;
		left: 0.2rem;
		right: 0.2rem;
		top: 0.3rem;
		bottom: 0.6rem;
		border-radius: 0.12rem;
		background:
			linear-gradient(180deg, var(--c) 0 30%, rgba(255, 255, 255, 0.82) 30% 100%);
	}

	.mini::after {
		content: '';
		position: absolute;
		left: 50%;
		bottom: 0.18rem;
		translate: -50% 0;
		border-inline: 0.26rem solid transparent;
		border-top: 0.2rem solid rgba(255, 255, 255, 0.18);
	}

	/* The empty place in the row, to be filled with yours */
	.mini.ghost {
		background: none;
		box-shadow: none;
		border: 1.5px dashed color-mix(in srgb, var(--text-secondary) 55%, transparent);
	}
	.mini.ghost::before, .mini.ghost::after { display: none; }

	/* ---- Body ---- */
	.footer-inner {
		max-width: 1400px;
		margin: 0 auto;
		padding-top: 3.25rem;
	}

	.footer-sections {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2.75rem;
		padding-bottom: 3rem;
		border-bottom: 1px solid var(--border-color);
	}

	@media (min-width: 1024px) {
		.footer-sections {
			grid-template-columns: 2fr 1fr 1fr 1fr;
			gap: 4rem;
		}
	}

	.footer-brand { max-width: 420px; }

	.logo {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		font-size: 1.25rem;
		font-weight: 900;
		letter-spacing: -0.02em;
		color: var(--text-primary);
		margin-bottom: 1.1rem;
	}

	/* The site's mark: a cartridge, front on */
	.mark {
		position: relative;
		width: 1.15rem;
		height: 1.7rem;
		flex: none;
		border-radius: 0.2rem 0.2rem 0.08rem 0.08rem;
		background: #141417;
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
	}
	.mark::before {
		content: '';
		position: absolute;
		inset: 0.22rem 0.18rem 0.42rem;
		border-radius: 0.1rem;
		background: linear-gradient(180deg, var(--primary-color) 0 32%, #f4f4f2 32%);
	}

	.footer-brand p {
		color: var(--text-secondary);
		line-height: 1.6;
		font-size: 0.95rem;
		margin: 0 0 1.4rem;
	}

	.cta {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		height: 2.5rem;
		padding: 0 1.1rem;
		border-radius: 999px;
		font-size: 0.9rem;
		font-weight: 700;
		text-decoration: none;
		color: var(--primary-action-text, #fff);
		background: var(--primary-color);
		transition: transform 0.2s, background 0.2s;
	}
	.cta:hover { transform: translateY(-2px); background: var(--primary-color-hover, var(--primary-color)); }
	.cta :global(svg) { transition: transform 0.2s; }
	.cta:hover :global(svg) { transform: translateX(3px); }

	/* Headings engraved like labels on a console, with a short rule under them */
	.footer-group h4 {
		position: relative;
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.72rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		color: var(--text-secondary);
		margin: 0 0 1.4rem;
		padding-bottom: 0.7rem;
	}
	.footer-group h4::after {
		content: '';
		position: absolute;
		left: 0;
		bottom: 0;
		width: 1.6rem;
		height: 2px;
		border-radius: 2px;
		background: var(--primary-color);
	}

	.footer-group nav {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.footer-group a {
		position: relative;
		width: fit-content;
		padding: 0.3rem 0 0.3rem 0;
		color: var(--text-primary);
		opacity: 0.78;
		text-decoration: none;
		font-size: 0.95rem;
		transition: opacity 0.2s, padding-left 0.2s, color 0.2s;
	}

	/* A small notch grows in beside the link, like a cartridge being seated */
	.footer-group a::before {
		content: '';
		position: absolute;
		left: 0;
		top: 50%;
		width: 0;
		height: 2px;
		border-radius: 2px;
		background: var(--primary-color);
		translate: 0 -50%;
		transition: width 0.2s;
	}

	.footer-group a:hover,
	.footer-group a:focus-visible {
		opacity: 1;
		color: var(--primary-color);
		padding-left: 1.1rem;
	}
	.footer-group a:hover::before,
	.footer-group a:focus-visible::before { width: 0.7rem; }

	/* ---- Bottom ---- */
	.footer-bottom {
		padding-top: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		color: var(--text-secondary);
		font-size: 0.85rem;
	}

	/* ---- The maker ---- */
	.made-by {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.25rem 1.25rem;
		padding: 1.75rem 0;
		border-bottom: 1px solid var(--border-color);
	}

	.made-label {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.72rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		color: var(--text-secondary);
	}

	.made-note {
		margin-left: auto;
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	@media (max-width: 560px) {
		.made-note { margin-left: 0; flex-basis: 100%; }
	}

	.self-plug {
		font-family: "Caveat Variable", cursive;
		font-size: 2rem;
		line-height: 1;
		color: var(--text-primary);
		text-decoration: none;
		transition: color 0.2s;
	}
	.self-plug:hover { color: var(--primary-color); }

	/* Back to top: a cartridge in a slot. It lifts on hover, so it can be seen to be pressed */
	.to-top {
		position: relative;
		display: inline-flex;
		align-items: flex-end;
		gap: 0.75rem;
		height: 3rem;
		padding: 0;
		border: 0;
		background: none;
		color: var(--text-secondary);
		font: inherit;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		cursor: pointer;
	}

	.slot {
		position: absolute;
		left: -0.35rem;
		bottom: 0;
		width: 2.3rem;
		height: 0.55rem;
		border-radius: 0.3rem;
		background: color-mix(in srgb, #000 55%, var(--surface-color));
		box-shadow: inset 0 2px 3px rgba(0, 0, 0, 0.5);
	}

	.plug {
		position: relative;
		display: grid;
		place-items: end center;
		width: 1.6rem;
		height: 2.35rem;
		margin-bottom: 0.3rem;
		padding-bottom: 0.28rem;
		border-radius: 0.22rem 0.22rem 0.1rem 0.1rem;
		background: linear-gradient(90deg, #26262b, #151518 45%, #0c0c0f);
		color: rgba(255, 255, 255, 0.75);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 2px 4px rgba(0, 0, 0, 0.35);
		transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
	}

	.plug .band {
		position: absolute;
		left: 0.2rem;
		right: 0.2rem;
		top: 0.28rem;
		height: 0.55rem;
		border-radius: 0.1rem;
		background: var(--primary-color);
	}

	.to-top-text { padding-bottom: 0.15rem; transition: color 0.2s; }

	.to-top:hover .plug,
	.to-top:focus-visible .plug { transform: translateY(-0.55rem); }
	.to-top:hover .to-top-text,
	.to-top:focus-visible .to-top-text { color: var(--text-primary); }
	.to-top:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 4px; border-radius: 6px; }
	.to-top:active .plug { transform: translateY(-0.15rem); }

	@media (max-width: 560px) {
		.footer-bottom { flex-direction: column-reverse; align-items: flex-start; }
	}

	.footer-disclaimer {
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border-color);
		text-align: center;
		font-size: 0.75rem;
		color: var(--text-secondary);
		opacity: 0.7;
		letter-spacing: 0.02em;
		line-height: 1.4;
	}

	@media (prefers-reduced-motion: reduce) {
		.plug, .cta, .cta :global(svg), .footer-group a, .footer-group a::before { transition: none; }
	}
	:global(.reduce-motion) .site-footer .plug, :global(.reduce-motion) .site-footer .cta, :global(.reduce-motion) .site-footer .footer-group a, :global(.reduce-motion) .site-footer .footer-group a::before { transition: none !important; }
</style>
