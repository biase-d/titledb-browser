<script>
	import Icon from '@iconify/svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();

	let games = $derived(data.games);
	let pagination = $derived(data.pagination);
	let session = $derived(data.session);

	function changePage(newPage) {
		const url = new URL(page.url);
		url.searchParams.set('page', newPage.toString());
		goto(url, { keepData: false, noScroll: true });
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
</script>

<svelte:head>
	<title>Contribute - Switch Performance</title>
</svelte:head>

<div class="page-container">
	{#if !session?.user}
		<div class="logged-out-cta">
			<h1>Join the Community</h1>
			<p>
				Switch Performance is powered by contributors like you. Sign in with your GitHub account to
				start submitting performance data, suggesting edits, and helping us build the most comprehensive
				database for Nintendo Switch game performance.
			</p>
			<form action="/auth/signin/github" method="post">
				<button type="submit" class="cta-button">
					<Icon icon="mdi:github" />
					<span>Sign In with GitHub to Contribute</span>
				</button>
			</form>
		</div>
	{:else}
		<div class="page-header">
			<h1>Contribute Data</h1>
			<p>
				Help us expand the database! Here is a list of games that currently have no performance or graphics data.
			</p>
		</div>

		{#if games.length > 0}
			<div class="results-container">
				{#each games as game (game.id)}
					<a href={`/contribute/${game.id}`} class="list-item">
						<img src={game.iconUrl || '/favicon.svg'} alt="" class="list-item-icon" />
						<div class="list-item-info">
							<span class="title-name">{game.names[0]}</span>
							<span class="title-id">{game.id}</span>
						</div>
						<Icon icon="mdi:chevron-right" class="chevron-icon" />
					</a>
				{/each}
			</div>

			{#if pagination && pagination.totalPages > 1}
				<div class="pagination">
					<button disabled={pagination.currentPage <= 1} onclick={() => changePage(pagination.currentPage - 1)}>← Previous</button>
					<span>Page {pagination.currentPage} of {pagination.totalPages}</span>
					<button disabled={pagination.currentPage >= pagination.totalPages} onclick={() => changePage(pagination.currentPage + 1)}>Next →</button>
				</div>
			{/if}
		{:else}
			<div class="empty-state">
				<h3>All Caught Up!</h3>
				<p>It looks like every game in our database has at least some performance or graphics data. Thank you to all contributors!</p>
			</div>
		{/if}
	{/if}
</div>


<style>
	.page-container {
		max-width: 900px;
		margin: 0 auto;
		padding: 1.5rem;
	}

	/* Logged-out state */
	.logged-out-cta {
		text-align: center;
		padding: 3rem 2rem;
		background-color: var(--surface-color);
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-color);
	}
	.logged-out-cta h1 {
		font-size: 2.5rem;
		margin: 0 0 1rem;
	}
	.logged-out-cta p {
		font-size: 1.1rem;
		color: var(--text-secondary);
		max-width: 600px;
		margin: 0 auto 2rem;
	}
	.cta-button {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		background-color: var(--primary-color);
		color: var(--primary-action-text);
		padding: 12px 24px;
		border: none;
		border-radius: var(--radius-md);
		font-weight: 600;
		font-size: 1rem;
		text-decoration: none;
		cursor: pointer;
	}

	/* Logged-in state */
	.page-header {
		margin-bottom: 2rem;
		text-align: center;
	}
	.page-header h1 {
		font-size: 2.5rem;
		margin: 0 0 0.5rem;
	}
	.page-header p {
		font-size: 1.1rem;
		color: var(--text-secondary);
		margin: 0;
	}

	.results-container {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.list-item {
		display: flex; align-items: center; gap: 1rem; padding: 0.75rem;
		background-color: var(--surface-color); border: 1px solid var(--border-color);
		border-radius: var(--radius-md); transition: all 0.2s ease;
	}
	.list-item:hover {
		border-color: var(--primary-color);
		background-color: color-mix(in srgb, var(--primary-color) 5%, transparent);
		text-decoration: none;
	}
	
	.list-item-icon { width: 40px; height: 40px; border-radius: var(--radius-sm); object-fit: cover; flex-shrink: 0; }
	.list-item-info { flex-grow: 1; }
	.title-name { font-weight: 500; color: var(--text-primary); }
	.title-id { display: block; margin-top: 0.1rem; font-size: 0.8rem; color: var(--text-secondary); }

	.pagination {
		display: flex; justify-content: center; align-items: center;
		gap: 1rem; margin-top: 2rem;
	}
	.pagination button {
		padding: 8px 16px; font-weight: 500; background-color: var(--surface-color);
		border: 1px solid var(--border-color); color: var(--primary-color);
		border-radius: var(--radius-md); cursor: pointer;
	}
	.pagination button:disabled { opacity: 0.4; cursor: not-allowed; }

	.empty-state {
		text-align: center; padding: 3rem 2rem; background-color: var(--surface-color);
		border-radius: var(--radius-lg); border: 2px dashed var(--border-color);
	}
	.empty-state h3 { font-size: 1.5rem; margin: 0 0 0.5rem; }
	.empty-state p { color: var(--text-secondary); max-width: 400px; margin: 0 auto; }
</style>