<script>
	import { fade } from 'svelte/transition';
	import Icon from '@iconify/svelte';
	import { favorites } from '$lib/stores.js';
	import GraphicsDetail from './GraphicsDetail.svelte';
	import YoutubeEmbeds from './YoutubeEmbeds.svelte';
	import PerformanceDetail from './PerformanceDetail.svelte';

	let { data } = $props();

	let game = $derived(data.game);
	let session = $derived(data.session);
	let allTitlesInGroup = $derived(data.allTitlesInGroup || []);
	let youtubeLinks = $derived(data.youtubeLinks || []);
	let performance = game.performance;

	let id = $derived(game?.id);
	let name = $derived(game?.names?.[0] || 'Loading...');
	let otherTitlesInGroup = $derived(allTitlesInGroup.filter((t) => t.id !== id));

	let isFavorited = $state(false);
	$effect(() => {
		if (id) {
			favorites.subscribe((favs) => {
				isFavorited = favs.has(id);
			});
		}
	});

	let lightboxImage = $state('');

	function formatDate(dateInt) {
		if (!dateInt) return 'N/A';
		const dateStr = dateInt.toString();
		const year = dateStr.substring(0, 4);
		const month = dateStr.substring(4, 6);
		const day = dateStr.substring(6, 8);
		return new Date(`${year}-${month}-${day}`).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function formatSize(bytes) {
		if (!bytes || isNaN(bytes)) return 'N/A';
		if (bytes === 0) return '0 Byte';
		const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
		const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
		return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
	}
</script>

<svelte:head>
	<title>{name} - Titledb Browser </title>
</svelte:head>

{#if game}
	<div class="page-container" in:fade={{ duration: 300 }}>
		<div class="page-nav">
			<button class="back-button" onclick={() => history.back()}>← Back</button>
		</div>
		<div class="banner-header">
			<div class="banner-image" style="background-image: url({game.bannerUrl});"></div>
			<div class="banner-overlay"></div>
			<div class="header-content">
				<img src={game.iconUrl} alt="{name} icon" class="game-icon" />
				<div class="title-info">
					<h1>{name}</h1>

					{#if otherTitlesInGroup.length > 0}
						<div class="other-versions">
							<strong>Other known versions:</strong>
							<ul>
								{#each otherTitlesInGroup as title}
									<li><a href={`/title/${title.id}`}>{title.name} ({title.id})</a></li>
								{/each}
							</ul>
						</div>
					{/if}

					<div class="details-grid">
						<span><strong>Publisher:</strong> {game.publisher || 'N/A'}</span>
						<span><strong>Release Date:</strong> {formatDate(game.releaseDate)}</span>
						<span><strong>Size:</strong> {formatSize(game.sizeInBytes)}</span>
						<span><strong>Title ID:</strong> {id}</span>
					</div>
				</div>
				<button class="favorite-button" onclick={() => favorites.toggle(id)} title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}>
					<Icon icon={isFavorited ? 'mdi:star' : 'mdi:star-outline'} width="24" height="24" />
				</button>
			</div>
		</div>

		<div class="section-header">
			<h2 class="section-title">Performance Profile</h2>
			{#if session?.user}
				<a href={`/contribute/${id}`} class="contribute-button">
					{game.performance ? 'Suggest an Edit' : 'Add Performance Data'}
				</a>
			{/if}
		</div>

		<PerformanceDetail {performance} />

		{#if game.graphics}
			<GraphicsDetail settings={game.graphics} />
		{/if}

		{#if youtubeLinks.length > 0}
			<YoutubeEmbeds links={youtubeLinks} />
		{/if}

		{#if game.screenshots && game.screenshots.length > 0}
			<div class="screenshots-container">
				<h2 class="section-title">Official screenshots</h2>
				<div class="screenshots-grid">
					{#each game.screenshots as screenshot}
						<button class="screenshot-button" onclick={() => (lightboxImage = screenshot)}>
							<img src={screenshot} alt="{name} screenshot" />
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<div class="contributor-info">
			{#if game.contributor}
				<span>Submitted by <a href={`/profile/${game.contributor}`} rel="noopener noreferrer">{game.contributor}</a></span>
				{#if game.sourcePrUrl}
					<a href={game.sourcePrUrl} target="_blank" rel="noopener noreferrer" class="source-link">(Source)</a>
				{/if}
			{/if}
		</div>
	</div>
{:else}
	<p class="loading-message">Loading title details...</p>
{/if}

{#if lightboxImage}
	<div class="lightbox" onclick={() => (lightboxImage = '')} transition:fade={{ duration: 150 }}>
		<img src={lightboxImage} alt="{name} screenshot" onclick={(e) => e.stopPropagation()} />
	</div>
{/if}

<style>
	.page-container {
		max-width: 900px;
		margin: 0 auto;
	}
	@media (min-width: 640px) {
		.page-container {
			padding: 2rem;
		}
	}
	.page-nav {
		margin-bottom: 1.5rem;
	}
	.back-button {
		background: none;
		border: none;
		padding: 0;
		font-size: inherit;
		color: var(--text-secondary);
		text-decoration: none;
		cursor: pointer;
	}
	.banner-header {
		position: relative;
		border-radius: var(--border-radius);
		overflow: hidden;
		color: white;
		margin-bottom: 2rem;
	}
	.banner-image {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-size: cover;
		background-position: center;
		transform: scale(1.1);
		filter: blur(8px) brightness(0.7);
	}
	.banner-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: linear-gradient(to top, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.2));
	}
	.header-content {
		position: relative;
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
		padding: 1.5rem;
		justify-items: center;
		text-align: center;
	}
	@media (min-width: 768px) {
		.header-content {
			grid-template-columns: auto 1fr auto;
			padding: 2rem;
			justify-items: start;
			text-align: left;
		}
	}
	.game-icon {
		width: 150px;
		height: 150px;
		border-radius: var(--border-radius);
		flex-shrink: 0;
		box-shadow: 0 4px 15px rgba(0,0,0,0.3);
	}
	.title-info h1 {
		margin: 0 0 1rem;
		font-size: 2.25rem;
		text-shadow: 0 2px 4px rgba(0,0,0,0.5);
	}
	.details-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.5rem;
		font-size: 0.9rem;
		opacity: 0.9;
	}
	.other-versions {
		margin-bottom: 1.5rem;
	}
	.other-versions strong {
		font-weight: 600;
		color: var(--text-secondary);
		font-size: 0.9rem;
	}
	.other-versions ul {
		list-style: none;
		padding: 0;
		margin: 0.5rem 0 0;
		font-size: 0.9rem;
	}
	.other-versions li {
		margin-bottom: 0.25rem;
	}
	.other-versions a {
		color: var(--primary-color);
		text-decoration: underline;
	}
	.details-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.75rem;
		font-size: 0.9rem;
		margin-top: auto;
	}
	@media (min-width: 500px) {
		.details-grid {
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem 1.5rem;
		justify-content: start;
		}	
	}
	.favorite-button {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		cursor: pointer;
		color: white;
		border-radius: 50%;
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		align-self: flex-start;
	}
	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}
	.section-title {
		font-size: 1.5rem;
		font-weight: 700;
	}
	.contribute-button {
		background-color: var(--input-bg);
		border: 1px solid var(--border-color);
		color: var(--text-secondary);
		padding: 8px 16px;
		border-radius: var(--border-radius);
		font-weight: 500;
		text-decoration: none;
	}
	.screenshots-container {
		margin-top: 3rem;
	}
	.screenshots-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 1rem;
	}
	.screenshot-button {
		border: none;
		padding: 0;
		background: none;
		cursor: pointer;
		border-radius: var(--border-radius);
		overflow: hidden;
	}
	.screenshot-button img {
		transition: transform 0.2s;
	}
	.screenshot-button:hover img {
		transform: scale(1.05);
	}
	.contributor-info {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		color: var(--text-secondary);
		margin-top: 1.5rem;
	}
	.contributor-info a {
		color: var(--primary-color);
	}
	.loading-message {
		text-align: center;
		padding: 2rem;
	}
	.lightbox {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}
	.lightbox img {
		max-width: 90%;
		max-height: 90%;
	}
</style>