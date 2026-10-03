<script>
	import CartridgeItem from '../CartridgeItem.svelte'

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
		<!-- The games, standing on a shelf. Each is still a link to its page -->
		<div class="shelf">
			{#each favoritedGames as game, i (game.id)}
				<div class="slot">
					<CartridgeItem titleData={game} index={i} pose="angled" />
				</div>
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

	.shelf {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
		column-gap: 1rem;
		row-gap: 2.75rem;
		padding: 1.5rem 0 0;
	}

	/* Each cartridge stands on its own piece of ledge, wide enough that the pieces
	   meet and read as one shelf along a row */
	.slot {
		position: relative;
		padding-bottom: 1.1rem;
	}

	.slot::after {
		content: '';
		position: absolute;
		left: -0.55rem;
		right: -0.55rem;
		bottom: 0;
		height: 0.8rem;
		border-radius: 0.25rem;
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--text-secondary) 38%, var(--surface-color)),
			color-mix(in srgb, var(--text-secondary) 18%, var(--surface-color)) 40%,
			color-mix(in srgb, var(--text-secondary) 10%, var(--surface-color))
		);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.35),
			0 6px 12px -4px rgba(0, 0, 0, 0.25);
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
