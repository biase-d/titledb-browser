<script>
	import { fade } from 'svelte/transition';
	import Icon from "@iconify/svelte";
	import { favorites } from '$lib/stores';

	const { data } = $props();

	let game = $derived(data.game);
	let session = $derived(data.session)

	let { id } = $derived(game)
	let name = $derived(game?.names?.[0] || 'Loading...');
	let alternateNames = $derived(game?.names?.slice(1) || []);

	let isFavorited = $state(false);
	$effect(() => {
		isFavorited = $favorites.has(game.id);
	});

	/**
     * @type {string}
     */
	let lightboxImage = $state('');
	let isRawDataOpen = $state(false);

	/**
     * @param {{ resolution_type: any; resolution: any; min_res: any; max_res: any; resolutions: string; }} perfData
     */
	function formatResolution(perfData) {
		if (!perfData) return 'N/A';

		const getVerticalRes = (/** @type {string} */ res) => res?.trim().split('x')[1] || '?';

		switch (perfData.resolution_type) {
			case 'Fixed':
				return `Fixed at ${getVerticalRes(perfData.resolution)}p`;
			case 'Dynamic':
				const min = getVerticalRes(perfData.min_res);
				const max = getVerticalRes(perfData.max_res);
				return `Dynamic ${min}p ~ ${max}p`;
			case 'Multiple Fixed':
				if (typeof perfData.resolutions !== 'string' || !perfData.resolutions.trim()) {
					return 'Multiple Options';
				}
				const resolutions = perfData.resolutions.split(',').map(r => `${getVerticalRes(r)}p`).join(', ');
				return `Multiple: ${resolutions}`;
			default:
				return perfData.resolution_type || 'N/A';
		}
	}

	/**
     * @param {{ target_fps: any; fps_behavior: string; }} perfData
     */
	function formatFramerate(perfData) {
		if (!perfData || !perfData.target_fps) return 'N/A';
		let text = `${perfData.target_fps} FPS`;
		if (perfData.fps_behavior === 'Unlocked') {
			text = `Target: ${text} (Unlocked)`;
		}
		return text;
	}

	/**
     * @param {{ toString: () => any; }} releaseDate
     */
	function formatDate(releaseDate) {
		if (!releaseDate) return 'N/A';
		const dateStr = releaseDate.toString();
		const year = parseInt(dateStr.substring(0, 4));
		const month = parseInt(dateStr.substring(4, 6)) - 1;
		const day = parseInt(dateStr.substring(6, 8));

		const gameDate = new Date(year, month, day);
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		if (gameDate > today) {
			return `Coming Soon (${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')})`;
		}

		return gameDate.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function formatSize(bytes) {
		if (!bytes || isNaN(bytes)) return 'N/A';
		const size = parseInt(bytes, 10);
		if (size < 1024 ** 2) {
			return `${(size / 1024).toFixed(2)} KB`;
		} else if (size < 1024 ** 3) {
			return `${(size / 1024 ** 2).toFixed(2)} MB`;
		} else {
			return `${(size / 1024 ** 3).toFixed(2)} GB`;
		}
	}

</script>

<svelte:head>
	<title>{ name } - Titledb Browser</title>
	<meta name="description" content="Performance info of { name }" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="{ name } - Titledb Browser" />
	<meta property="og:description" content="Performance info of { name }" />
	<meta property="og:image" content="{game.banner_url}" />
	<meta property="twitter:card" content="{game.banner_url}" />
	<meta property="twitter:title" content="{ name } - Titledb Browser" />
	<meta property="twitter:description" content="Performance info of { name }" />
	<meta property="twitter:image" content="{game.icon_url}" />
</svelte:head>

{#if game}
	<div class="page-container" in:fade={{ duration: 500 }}>
		<div class="page-header">
			<a href="/">← Back to Search</a>
			<button class="favorite-button" on:click={() => favorites.toggle(id)} title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}>
				{#if isFavorited}
					<Icon icon="clarity:favorite-solid" width="24" height="24" />
				{:else}
					<Icon icon="clarity:favorite-line" width="24" height="24" />
				{/if}
			</button>
		</div>

		<div class="title-card">
			{#if game.icon_url}<figure class="title-icon"><img src={game.icon_url} alt="Icon" /></figure>{/if}
			<div class='title-info'>
				<h1>{name}</h1>
				{#if alternateNames.length > 0}
					<div class="alternate-titles">
						<strong>Also Known As:</strong>
						<div class="names-list">{#each alternateNames as altName}<span class="alt-name-tag">{altName}</span>{/each}</div>
					</div>
				{/if}
				<div class="details-grid">
					<span><strong>Publisher:</strong> {game.publisher || 'N/A'}</span>
					<span><strong>Release Date:</strong> {formatDate(game.release_date)}</span>
					<span><strong>Size:</strong> {formatSize(game.size_in_bytes) || 'N/A'}</span>
					<span><strong>Title ID:</strong> {id}</span>
				</div>
			</div>
		</div>

		<!--{#if game.banner_url}<img class="title-banner" src={game.banner_url} alt="Banner" />{/if}-->

		<div class="section-header">
			<h2 class="section-title">Performance Profile</h2>
			{#if session?.user}
				<a href={`/contribute/${id}`} class="contribute-button">
					{#if game.performance}
						Suggest an Edit
					{:else}
						Add Performance Data
					{/if}
				</a>
			{/if}
		</div>

	{#if game.performance}
		<div class="perf-container perf-card">

			{#if game.performance.docked}
				{@const docked = game.performance.docked}
				<div>
					<h3 class="perf-mode-title">Docked</h3>
					<div class="perf-grid">
						<div class="perf-item">
							<p class="label">
								Resolution
							</p>
							<p class="value">{formatResolution(docked)}</p>
							{#if docked.resolution_notes}<p class="subtext">{docked.resolution_notes}</p>{/if}
						</div>
						<div class="perf-item">
							<p class="label">
								Framerate
							</p>
							<p class="value">{formatFramerate(docked)}</p>
							{#if docked.fps_notes}<p class="subtext">{docked.fps_notes}</p>{/if}
						</div>
					</div>
				</div>
			{/if}

			{#if game.performance.handheld}
				{@const handheld = game.performance.handheld}
				<div class="perf-mode-separator">
					<h3 class="perf-mode-title">Handheld</h3>
					<div class="perf-grid">
						<div class="perf-item">
							<p class="label">
								Resolution
							</p>
							<p class="value">{formatResolution(handheld)}</p>
							{#if handheld.resolution_notes}<p class="subtext">{handheld.resolution_notes}</p>{/if}
						</div>
						<div class="perf-item">
							<p class="label">
								Framerate
							</p>
							<p class="value">{formatFramerate(handheld)}</p>
							{#if handheld.fps_notes}<p class="subtext">{handheld.fps_notes}</p>{/if}
						</div>
					</div>
				</div>
			{/if}

			{#if game.contributor}
				<div class='contributor-info'>
					Submitted by <a href={`/profile/${game.contributor}`} target="_blank" rel="noopener noreferrer">{game.contributor}</a>
				</div>
			{/if}
		</div>
	{:else}
	<p> No performance data has been submitted yet </p>
	{/if}

		<h2 class="section-title">Official screenshots</h2>
		<div class="screenshots-grid">
			{#if game.screenshots && game.screenshots.length > 0}
				{#each game.screenshots as screenshot}
					<button class="screenshot-button" on:click={() => (lightboxImage = screenshot)}><img src={screenshot} alt="Screenshot" /></button>
				{/each}
			{:else}
				<p>No screenshots available.</p>
			{/if}
		</div>

      <div class="raw-data-section">
          <button on:click={() => (isRawDataOpen = !isRawDataOpen)}>{isRawDataOpen ? 'Hide' : 'Show'}</button>
          {#if isRawDataOpen}<pre>{JSON.stringify(game, null, 2)}</pre>{/if}
      </div>
  </div>
{:else}
	<p class="loading-message">Loading title details...</p>
{/if}

{#if !(lightboxImage == '')}
	<div class="lightbox" on:click={() => (lightboxImage = null)} transition:fade>
		<img src={lightboxImage} alt="{name} screenshot" />
	</div>
{/if}

<style>
	.contributor-info {
		text-align: right;
		font-size: 0.8rem;
		color: var(--text-secondary);
		margin-top: 1rem;
	}
	.contributor-info a {
		color: var(--primary-color);
		text-decoration: underline;
	}
  	.page-container { max-width: 800px; margin: 0 auto; }
	.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
	.section-title { font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem; margin-top: 3rem; }
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin-top: 2.5rem;
    padding-bottom: 0.5rem;
  }

  .title-card {
    display: flex;
    flex-direction: column;
    background-color: var(--surface-color);
    padding: 1rem;
    border-radius: var(--border-radius);
  }

  @media (min-width: 768px) {
    .title-card {
      flex-direction: row;
    }
  }
  
  .title-info {
	flex-shrink: 1;
  }

  .title-info h1 {
    margin: 0 0 1rem;
    font-size: 2.25rem;
  }

  .contribute-button,
  .raw-data-section button {
    background-color: var(--input-bg);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    padding: 8px 16px;
    border-radius: var(--border-radius);
    font-weight: 500;
    text-decoration: none;
    transition: all 0.2s ease;
    font-size: 0.9rem;
  }

  .contribute-button:hover {
    color: var(--primary-color);
    border-color: var(--primary-color);
    background-color: var(--surface-color);
  }

  .favorite-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--primary-color);
    transition: background-color 0.2s ease;
  }

  .favorite-button:hover {
    background-color: var(--input-bg);
  }

  .perf-card {
    background-color: var(--surface-color);
    border-radius: var(--border-radius);
    padding: 1.5rem 2rem;
	border: var(--border-color) solid 0.5px
  }

  .perf-mode-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 1rem;
  }

	.perf-container {
		background-color: var(--input-bg);
		border-radius: 0.75rem; /* 12px */
		padding: 1.5rem;
	}
	.perf-mode-title {
		font-size: 1.25rem;
		font-weight: 600;
		margin-bottom: 1rem;
	}
	.perf-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
	}
	@media (min-width: 768px) {
		.perf-grid {
			grid-template-columns: 1fr 1fr;
			gap: 2rem;
		}
	}
	.perf-item {
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border-color);
	}
	.perf-grid > .perf-item:last-child {
		border-bottom: none;
	}
	@media (min-width: 768px) {
		.perf-item {
			padding-right: 2rem;
			padding-bottom: 0;
			/*border-right: 1px solid var(--border-color);*/
			border-bottom: none;
		}
		.perf-grid > .perf-item:last-child {
			border-right: none;
			padding-right: 0;
		}
	}

	.perf-item .label {
		font-size: 0.875rem;
		color: var(--text-secondary);
		display: flex;
		align-items: center;
	}
	.perf-item .value {
		font-weight: 600;
		margin: 0.25rem 0;
	}
	.perf-item .subtext {
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.perf-mode-separator {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border-color);
	}

  .title-icon img {
    min-width: 180px;
    max-height: 180px;
	aspect-ratio: square;
    border-radius: var(--border-radius);
    flex-shrink: 0;
  }

  .alternate-titles {
    margin: 1.5rem 0;
  }

  .alternate-titles strong {
    display: block;
    margin-bottom: 0.75rem;
    font-weight: 600;
  }

  .names-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .alt-name-tag {
    background-color: var(--surface-color);
    padding: 0.3rem 0.75rem;
    border-radius: 999px;
    font-size: 0.85rem;
    border: 1px solid var(--border-color);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  }

  .details-grid {
    margin-top: 1.5rem;
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
    font-size: 0.9rem;
  }

  @media (min-width: 500px) {
    .details-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  /*
  .title-banner {
    margin-top: 2rem;
    border-radius: var(--border-radius);
    box-shadow: var(--box-shadow);
  }
	*/

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
    display: block;
    width: 100%;
    border-radius: var(--border-radius);
    overflow: hidden;
  }

  .screenshot-button:hover img {
    transform: scale(1.05);
  }

  .screenshot-button img {
    transition: transform 0.2s ease-out;
    border-radius: var(--border-radius);
    box-shadow: var(--box-shadow);
  }

  .raw-data-section {
    margin-top: 2.5rem;
  }

  .raw-data-section pre {
    background-color: var(--surface-color);
    padding: 1rem;
    border-radius: var(--border-radius);
    overflow-x: auto;
    font-size: 0.8rem;
  }

  .loading-message {
    text-align: center;
    padding: 2rem;
    opacity: 0.8;
  }

  .lightbox {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    box-sizing: border-box;
    z-index: 100;
  }

  .lightbox img {
    max-width: 100%;
    max-height: 100%;
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.5);
  }
</style>