<script>
	import '@fontsource-variable/caveat';
	const currentYear = new Date().getFullYear();
</script>

<footer class="site-footer">
	<div class="footer-container">
		<div class="footer-about">
			<h4>Switch Performance</h4>
			<p>
				A community-powered project for Nintendo Switch performance data. This project is built upon the
				<a href="https://github.com/biase-d/nx-performance" target="_blank" rel="noopener noreferrer">nx-performance</a>
				database, with game details supplemented by
				<a href="https://github.com/masagrator/titledb_filtered" target="_blank" rel="noopener noreferrer">titledb</a>
			</p>
		</div>

		<div class="footer-links">
			<h4>Navigate</h4>
			<ul>
				<li><a href="/">Home</a></li>
				<li><a href="/favorites">Favorites</a></li>
				<li><a href="/contribute">Contribute Data</a></li>
			</ul>
		</div>

		<div class="footer-project">
			<h4>Project</h4>
			<ul>
				<li>
					<a href="https://github.com/biase-d/titledb-browser" target="_blank" rel="noopener noreferrer">Source Code</a>
				</li>
				<li>
					<a href="https://github.com/biase-d/titledb-browser/issues" target="_blank" rel="noopener noreferrer">Report an Issue</a>
				</li>
			</ul>
		</div>
	</div>

	<div class="footer-bottom">
		<p class="copyright">&copy; {currentYear} Switch Performance</p>
		<a class="self-plug" href="https://github.com/biase-d" target="_blank" rel="noopener noreferrer">a biase-d project</a>
	</div>
</footer>

<style>
	.site-footer {
		font-size: 0.9rem;
		color: var(--text-secondary);
		margin-top: 4rem;
		padding: 3rem 1.5rem 2rem;
		border-top: 1px solid var(--border-color);
		background-color: var(--surface-color);
	}

	.footer-container {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2.5rem;
		padding-bottom: 2.5rem;
		margin-bottom: 2rem;
		border-bottom: 1px solid var(--border-color);
		max-width: 1200px;
		margin-left: auto;
		margin-right: auto;
	}

	@media (min-width: 768px) {
		.footer-container {
			grid-template-columns: repeat(3, 1fr);
			gap: 2rem;
		}
	}

	.site-footer h4 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0 0 1rem 0;
	}

	.footer-about p {
		line-height: 1.6;
		margin: 0;
	}

	.footer-links ul,
	.footer-project ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.site-footer a {
		text-decoration: none;
		color: var(--text-secondary);
	}

	.site-footer a:hover {
		color: var(--primary-color);
		text-decoration: underline;
	}

	.footer-bottom {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	@media (min-width: 768px) {
		.footer-bottom {
			flex-direction: row;
			justify-content: space-between;
		}
	}

	.copyright {
		margin: 0;
		font-size: 0.85rem;
	}

	.self-plug {
		font-family: 'Caveat Variable', cursive;
		font-size: 1.2rem;
		color: var(--text-secondary);
	}

	.self-plug:hover {
		text-decoration: none;
	}
</style>