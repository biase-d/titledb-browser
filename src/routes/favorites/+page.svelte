<script>
	import Icon from '@iconify/svelte'

	/** @type {import('./$types').PageData} */
	export let data

	$: favoritedGames = data.favoritedGames || []
</script>

<svelte:head>
	<title>My Favorites - Switch Performance</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="page-container">
	<div class="page-header">
		<h1>My Favorites</h1>
		<p>Here are the games you've saved for later.</p>
	</div>

	{#if favoritedGames.length > 0}
		<div class="results-container">
			{#each favoritedGames as game (game.id)}
				<a href={`/title/${game.id}`} class="list-item">
					<div class="list-item-info">
						<span class="title-name">{game.names[0]}</span>
						<span class="title-id">{game.id}</span>
					</div>
					<Icon icon="mdi:chevron-right" class="chevron-icon" />
				</a>
			{/each}
		</div>
	{:else}
		<div class="empty-state">
			<h3>No Favorites Yet</h3>
			<p>
				You can add games to this list by clicking the star icon on any
				game's detail page.
			</p>
			<a href="/" class="cta-button">Start Browsing</a>
		</div>
	{/if}
</div>

<style>
	.page-container {
		max-width: 900px;
		margin: 0 auto;
		padding: 1.5rem;
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

	.results-container {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.list-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		transition: all 0.2s ease;
	}
	.list-item:hover {
		border-color: var(--primary-color);
		background-color: color-mix(
			in srgb,
			var(--primary-color) 5%,
			transparent
		);
		text-decoration: none;
	}

	.list-item-info {
		flex-grow: 1;
	}
	.title-name {
		font-weight: 500;
		color: var(--text-primary);
	}
	.title-id {
		display: block;
		margin-top: 0.1rem;
		font-size: 0.8rem;
		color: var(--text-secondary);
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
		margin: 0 auto 1.5rem;
	}
	.cta-button {
		display: inline-block;
		background-color: var(--primary-color);
		color: var(--primary-action-text);
		padding: 10px 20px;
		border-radius: var(--radius-md);
		font-weight: 600;
		text-decoration: none;
	}
</style>
