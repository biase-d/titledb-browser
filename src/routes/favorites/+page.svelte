<script>
	import { favorites, titleIndex } from '$lib/stores'

	$: favoritedGames = Array.from($favorites).map(id => {
		const names = $titleIndex[id]
		return {
			id,
			name: names ? names[0] : id // Fallback to ID if name isn't found
		}
	})
</script>

<svelte:head>
	<title>My Favorites - Titledb Browser</title>
</svelte:head>

<div class="favorites-container">
	<h1 class="page-title">My Favorites</h1>

	{#if favoritedGames.length > 0}
		<p class="intro-text">Here are the games you've saved for later.</p>
		<ul class="results-list">
			{#each favoritedGames as game (game.id)}
				<li>
					<a href={`/title/${game.id}`}>
						<span class="title-name">{game.name}</span>
						<span class="title-id">({game.id})</span>
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<div class="empty-state">
			<h2>No Favorites Yet</h2>
			<p>You can add games to this list by clicking the star icon on any game's detail page.</p>
			<a href="/" class="button-primary">Start Browsing</a>
		</div>
	{/if}
</div>

<style>
	.page-title {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
	}

	.intro-text {
		color: var(--text-secondary);
		margin-bottom: 2rem;
		font-size: 1.1rem;
	}

	.results-list {
		list-style: none;
		padding: 0;
		margin: 0;
		background: var(--surface-color);
		border-radius: var(--border-radius);
		overflow: hidden;
		box-shadow: var(--box-shadow);
	}
	.results-list li a {
		display: block;
		padding: 12px 16px;
		border-bottom: 1px solid var(--border-color);
		transition: background-color 0.2s ease;
	}
	.results-list li:last-child a {
		border-bottom: none;
	}
	.results-list li a:hover {
		background-color: var(--input-bg);
		text-decoration: none;
	}
	.title-name {
		font-weight: 500;
	}
	.title-id {
		font-size: 0.8rem;
		opacity: 0.6;
		margin-left: 0.5rem;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		background-color: var(--surface-color);
		border-radius: var(--border-radius);
		border: 2px dashed var(--border-color);
	}
	.empty-state h2 {
		font-size: 1.5rem;
		margin-top: 0;
	}
	.empty-state p {
		color: var(--text-secondary);
		max-width: 400px;
		margin: 1rem auto 2rem;
	}
	.button-primary {
		display: inline-block;
		background-color: var(--primary-color);
		color: var(--primary-action-text);
		padding: 12px 24px;
		border-radius: 6px;
		font-weight: 500;
		text-decoration: none;
	}
</style>