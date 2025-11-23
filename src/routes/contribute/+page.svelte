<script>
	import Icon from '@iconify/svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { tick } from 'svelte';

	let { data } = $props();

	let games = $derived(data.games);
	let pagination = $derived(data.pagination);
	let session = $derived(data.session);
    let sortBy = $derived(data.sortBy);

	let pageHeader;

	async function changePage(newPage) {
		const url = new URL(page.url);
		url.searchParams.set('page', newPage.toString());
		await goto(url.toString(), { noScroll: true });
		window.scrollTo({ top: 0, behavior: 'smooth' });
		await tick();
		pageHeader?.focus();
	}

    function toggleSort() {
        const url = new URL(page.url);
        const newSort = sortBy === 'requests' ? 'default' : 'requests';
        url.searchParams.set('sort', newSort);
        url.searchParams.set('page', '1'); // Reset to page 1
        goto(url.toString());
    }
</script>

<svelte:head>
	<title>Contribute - Switch Performance</title>
</svelte:head>

<main class="page-container" bind:this={pageHeader} tabindex="-1">
	{#if !session?.user}
		<section class="logged-out-cta" aria-labelledby="cta-heading">
			<h1 id="cta-heading">Join the Community</h1>
			<p>
				Switch Performance is powered by contributors like you. Sign in with your GitHub account to 
				start submitting performance data, suggesting edits, and helping us build the most comprehensive 
				database for Nintendo Switch performance.
			</p>
			<form action="/auth/signin/github" method="post">
				<button type="submit" class="cta-button">
					<Icon icon="mdi:github" aria-hidden="true" />
					<span>Sign In with GitHub to Contribute</span>
				</button>
			</form>
		</section>
	{:else}
		<div class="page-header">
			<h1>Contribute Data</h1>
			<p>
				Help us expand the database! Here is a list of games that currently have no performance or graphics data.
			</p>
            
            <div class="controls">
                <button class="sort-btn" class:active={sortBy === 'requests'} onclick={toggleSort}>
                    <Icon icon="mdi:fire" />
                    {sortBy === 'requests' ? 'Sorting by Requests' : 'Sort by Most Requested'}
                </button>
            </div>
		</div>

		{#if games.length > 0}
			<div class="results-container">
				{#each games as game (game.id)}
					<a 
						href={`/contribute/${game.id}`} 
						class="list-item"
						aria-label={`Contribute data for ${game.names[0]}`}
					>
						<img 
							src={game.iconUrl || '/favicon.svg'} 
							alt="" 
							class="list-item-icon" 
							loading="lazy" 
							width="40" 
							height="40"
						/>
						<div class="list-item-info">
							<span class="title-name">{game.names[0]}</span>
							<span class="title-id">{game.id}</span>
						</div>
                        
                        {#if Number(game.requestCount) > 0}
                            <div class="request-badge" title="{game.requestCount} users requested data for this game">
                                <Icon icon="mdi:account-group" /> {game.requestCount}
                            </div>
                        {/if}

						<Icon icon="mdi:chevron-right" class="chevron-icon" aria-hidden="true" />
					</a>
				{/each}
			</div>

			{#if pagination && pagination.totalPages > 1}
				<nav class="pagination" aria-label="Pagination">
					<button 
						disabled={pagination.currentPage <= 1} 
						onclick={() => changePage(pagination.currentPage - 1)}
						aria-label="Go to previous page"
					>
						← Previous
					</button>

					<span aria-live="polite" aria-atomic="true">
						Page {pagination.currentPage} of {pagination.totalPages}
					</span>

					<button 
						disabled={pagination.currentPage >= pagination.totalPages} 
						onclick={() => changePage(pagination.currentPage + 1)}
						aria-label="Go to next page"
					>
						Next →
					</button>
				</nav>
			{/if}
		{:else}
			<div class="empty-state">
				<h3>All Caught Up!</h3>
				<p>
					It looks like every game in our database has at least some performance or graphics data. Thank 
					you to all contributors!
				</p>
			</div>
		{/if}
	{/if}
</main>

<style>
	main:focus {
		outline: none;
	}

	.page-container {
		max-width: 900px;
		margin: 0 auto;
		padding: 1.5rem;
	}

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
    
    .controls {
        margin-top: 1.5rem;
        display: flex;
        justify-content: center;
    }
    
    .sort-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 8px 16px;
        border-radius: 999px;
        border: 1px solid var(--border-color);
        background-color: var(--surface-color);
        color: var(--text-secondary);
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s;
    }
    
    .sort-btn:hover {
        border-color: var(--primary-color);
        color: var(--primary-color);
    }
    
    .sort-btn.active {
        background-color: var(--primary-color);
        color: var(--primary-action-text);
        border-color: var(--primary-color);
    }

	.results-container {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.list-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		text-decoration: none;
		color: inherit;
		transition:
			border-color 0.2s ease,
			background-color 0.2s ease;
	}

	.list-item:hover,
	.list-item:focus-visible {
		border-color: var(--primary-color);
		background-color: color-mix(in srgb, var(--primary-color) 5%, transparent);
	}

	.list-item:focus-visible,
	.cta-button:focus-visible,
	.pagination button:focus-visible {
		outline: 2px solid var(--accent-color, blue);
		outline-offset: 2px;
	}

	.list-item-icon {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-sm);
		object-fit: cover;
		flex-shrink: 0;
		background-color: var(--input-bg);
	}
	.list-item-info {
		flex-grow: 1;
		min-width: 0;
	}
	.title-name {
		display: block;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-weight: 500;
		color: var(--text-primary);
	}
	.title-id {
		display: block;
		margin-top: 0.1rem;
		font-size: 0.8rem;
		color: var(--text-secondary);
	}
    
    .request-badge {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        padding: 4px 8px;
        background-color: color-mix(in srgb, #f59e0b 15%, transparent);
        color: #d97706;
        border-radius: 999px;
        font-size: 0.8rem;
        font-weight: 600;
        white-space: nowrap;
    }

	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		margin-top: 2rem;
	}
	.pagination button {
		padding: 8px 16px;
		font-weight: 500;
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		color: var(--primary-color);
		border-radius: var(--radius-md);
		cursor: pointer;
	}
	.pagination button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.empty-state {
		text-align: center;
		padding: 3rem 2rem;
		background-color: var(--surface-color);
		border-radius: var(--radius-lg);
		border: 2px dashed var(--border-color);
	}
	.empty-state h3 {
		font-size: 1.5rem;
		margin: 0 0 0.5rem;
	}
	.empty-state p {
		color: var(--text-secondary);
		max-width: 400px;
		margin: 0 auto;
	}
</style>