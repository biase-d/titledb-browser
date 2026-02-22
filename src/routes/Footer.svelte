<script>
	import '@fontsource-variable/caveat'
	import { onMount } from 'svelte'

	const currentYear = new Date().getFullYear()

	let isBuilding = $state(false)
	let buildPhase = $state('')

	async function checkBuildStatus () {
		try {
			const res = await fetch('/api/v1/status')
			const health = await res.json()
			const build = health.services?.build
			isBuilding = build?.isBuilding || false
			buildPhase = build?.phase || ''
		} catch {
			// Silently ignore — don't block the footer
		}
	}

	onMount(() => {
		checkBuildStatus()
		const interval = setInterval(checkBuildStatus, 30_000)
		return () => clearInterval(interval)
	})
</script>

{#if isBuilding}
	<div class="build-banner">
		<div class="build-banner-inner">
			<span class="build-dot"></span>
			<span
				>Database syncing{buildPhase ? ` (${buildPhase})` : ''}...</span
			>
		</div>
	</div>
{/if}

<footer class="site-footer">
	<div class="footer-inner">
		<div class="footer-sections">
			<div class="footer-brand">
				<div class="logo">Switch Performance</div>
				<p>
					The community-powered database for Nintendo Switch technical
					performance. Track FPS, resolutions, and graphics settings
					for thousands of titles.
				</p>
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

		<div class="footer-bottom">
			<div class="copyright">
				&copy; {currentYear} Switch Performance
			</div>

			<div class="footer-actions">
				<a
					class="self-plug"
					href="https://github.com/biase-d"
					target="_blank"
					rel="noopener noreferrer"
				>
					a biase-d project
				</a>
			</div>
		</div>

		<div class="footer-disclaimer">
			Nintendo Switch is a trademark of Nintendo. Switch Performance is
			not affiliated with Nintendo.
		</div>
	</div>
</footer>

<style>
	.site-footer {
		margin-top: 6rem;
		background: var(--surface-color);
		border-top: 1px solid var(--border-color);
		padding: 4rem 1.5rem 2rem;
	}

	.footer-inner {
		max-width: 1400px;
		margin: 0 auto;
	}

	.footer-sections {
		display: grid;
		grid-template-columns: 1fr;
		gap: 3rem;
		padding-bottom: 3rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	@media (min-width: 1024px) {
		.footer-sections {
			grid-template-columns: 2fr 1fr 1fr 1fr;
			gap: 4rem;
		}
	}

	.footer-brand {
		max-width: 400px;
	}

	.logo {
		font-size: 1.25rem;
		font-weight: 900;
		letter-spacing: -0.02em;
		color: var(--text-primary);
		margin-bottom: 1.25rem;
	}

	.footer-brand p {
		color: var(--text-secondary);
		line-height: 1.6;
		font-size: 0.95rem;
		margin: 0;
	}

	.footer-group h4 {
		font-size: 0.85rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--text-primary);
		margin-bottom: 1.5rem;
	}

	.footer-group nav {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.footer-group a {
		color: var(--text-secondary);
		text-decoration: none;
		font-size: 0.95rem;
		transition: color 0.2s;
	}

	.footer-group a:hover {
		color: var(--primary-color);
	}

	.footer-bottom {
		padding-top: 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		color: var(--text-secondary);
		font-size: 0.85rem;
	}

	@media (min-width: 768px) {
		.footer-bottom {
			flex-direction: row;
			justify-content: space-between;
		}
	}

	.self-plug {
		font-family: "Caveat Variable", cursive;
		font-size: 1.25rem;
		color: var(--text-secondary);
		text-decoration: none;
		transition: color 0.2s;
	}

	.self-plug:hover {
		color: var(--text-primary);
	}

	.footer-disclaimer {
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
		text-align: center;
		font-size: 0.75rem;
		color: var(--text-secondary);
		opacity: 0.6;
		letter-spacing: 0.02em;
		line-height: 1.4;
	}

	.build-banner {
		background: rgba(245, 158, 11, 0.08);
		border: 1px solid rgba(245, 158, 11, 0.2);
		border-radius: var(--radius-md);
		margin: 0 1.5rem 1rem;
		max-width: 1400px;
	}

	@media (min-width: 1024px) {
		.build-banner {
			margin: 0 auto 1rem;
		}
	}

	.build-banner-inner {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		font-size: 0.85rem;
		color: #f59e0b;
	}

	.build-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #f59e0b;
		animation: build-pulse 1.5s ease-in-out infinite;
	}

	@keyframes build-pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.3;
		}
	}
</style>
