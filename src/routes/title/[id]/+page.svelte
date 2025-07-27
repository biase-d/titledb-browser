<script>
	import { fade } from 'svelte/transition';
	import { favorites } from '$lib/stores';

	export let data;

	const { game, session } = data;
	const { id, names, performance: performanceData } = game;
	const name = names[0];
	const alternateNames = names.slice(1);

	$: isFavorited = $favorites.has(id);

	let lightboxImage = null;
	let isRawDataOpen = false;

function formatResolution(perfData) {
		if (!perfData) return 'N/A';

		const getPNumber = (res) => (res?.split('x')[1] || '?') + 'p';

		switch (perfData.resolution_type) {
			case 'Fixed':
				return getPNumber(perfData.resolution);
			case 'Dynamic':
				const min = getPNumber(perfData.min_res);
				const max = getPNumber(perfData.max_res);
				return `${min} ~ ${max}`;
			case 'Multiple Fixed':
				if (typeof perfData.resolutions !== 'string' || !perfData.resolutions) {
					return 'Multiple';
				}
				const allRes = perfData.resolutions.split(',');
				if (allRes.length === 0 || !allRes[0]) return 'Multiple';
				if (allRes.length > 2) {
					return `${getPNumber(allRes[0])} ... ${getPNumber(allRes[allRes.length - 1])}`;
				}
				return allRes.map(res => getPNumber(res)).join(', ');
			default:
				return perfData.resolution_type || 'N/A';
		}
	}

	function formatFramerate(perfData) {
		if (!perfData || !perfData.target_fps) return 'N/A';
		let text = `${perfData.target_fps} FPS`;
		if (perfData.fps_behavior === 'Unlocked') {
			text = `Target: ${text} (Unlocked)`;
		}
		return text;
	}
	function formatDate(releaseDate) {
	  if (!releaseDate) return 'N/A';
	  const dateStr = releaseDate.toString();
	  const year = dateStr.substring(0, 4);
	  const month = dateStr.substring(4, 6);
	  const day = dateStr.substring(6, 8);
	  return `${year}-${month}-${day}`;
	}
</script>

<svelte:head>
	<title>{name || 'Loading...'} - Titledb Browser</title>
	{#if game}
		<meta name="description" content={game.description || `Details for ${name} (${id})`} />
	{/if}
</svelte:head>

{#if game}
	<div class="page-container" in:fade={{ duration: 300 }}>
		<div class="page-header">
			<a href="/" class="back-button">← Back to Search</a>
			<button class="favorite-button" on:click={() => favorites.toggle(id)} title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}>
				{#if isFavorited}
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279L12 19.182l-7.416 4.231 1.48-8.279-6.064-5.828 8.332-1.151z"/></svg>
				{:else}
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.1l2.351 4.788 5.293.753-3.832 3.687.904 5.222L12 14.247l-4.716 2.303.904-5.222-3.832-3.687 5.293-.753L12 2.1zm0 2.544l-1.928 3.921-.428.871-4.32.617 3.127 3.003-.739 4.267L12 15.34l3.86 1.977-.739-4.267 3.127-3.003-4.32-.617-.428-.871L12 4.644z"/></svg>
				{/if}
			</button>
		</div>

		<div class="title-card">
			{#if game.iconUrl}<figure class="title-icon"><img src={game.iconUrl} alt="Icon" /></figure>{/if}
			<div class="title-info">
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
					<span><strong>Size:</strong> {game.size_in_bytes || 'N/A'}</span>
					<span><strong>Title ID:</strong> {id}</span>
				</div>
			</div>
		</div>

		{#if game.banner_url}<img class="title-banner" src={game.banner_url} alt="Banner" />{/if}

		{#if !game.performance}
		<div class="section-header">
			<h2 class="section-title">Performance Profile</h2>
			{#if data.session?.user}
				<a href={`/contribute/${id}`} class="contribute-button">
					{#if game.performance}
						Suggest an Edit
					{:else}
						Add Performance Data
					{/if}
				</a>
			{/if}
		</div>
		{/if}

	{#if game.performance}
		<h2 class="section-title">Performance Profile</h2>
		<div class="perf-container">

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
		</div>
	{/if}

		<h2 class="section-title">Screenshots</h2>
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

{#if lightboxImage}
	<div class="lightbox" on:click={() => (lightboxImage = null)} transition:fade>
		<img src={lightboxImage} alt="Lightbox screenshot" />
	</div>
{/if}

<style>
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
    border-bottom: 2px solid var(--border-color);
    padding-bottom: 0.5rem;
  }

  .title-card {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    background-color: var(--surface-color);
    padding: 2rem;
    border-radius: var(--border-radius);
    box-shadow: var(--box-shadow);
  }

  @media (min-width: 768px) {
    .title-card {
      flex-direction: row;
    }
  }

  .title-info h1 {
    margin: 0 0 1rem;
    font-size: 2.25rem;
  }

  .contribute-button,
  .back-button,
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

  .contribute-button:hover,
  .back-button:hover {
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

  .performance-section {
    margin-top: 1.5rem;
  }

  .perf-card {
    background-color: var(--surface-color);
    border-radius: var(--border-radius);
    box-shadow: var(--box-shadow);
    padding: 1.5rem 2rem;
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
			border-right: 1px solid var(--border-color);
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


  .perf-card hr {
    border: none;
    border-top: 1px solid var(--border-color);
    margin: 1.5rem 0;
  }

  /* Tooltips */
  .tooltip-trigger {
    position: relative;
    cursor: help;
    border-bottom: 1px dotted var(--text-secondary);
    display: inline-block;
  }

  .tooltip-text {
    visibility: hidden;
    width: 250px;
    background-color: #333;
    color: #fff;
    text-align: center;
    border-radius: 6px;
    padding: 10px;
    position: absolute;
    z-index: 1;
    bottom: 150%;
    left: 50%;
    margin-left: -125px;
    opacity: 0;
    transition: opacity 0.3s;
    font-style: normal;
    font-weight: 400;
  }

  .tooltip-trigger:hover .tooltip-text {
    visibility: visible;
    opacity: 1;
  }

  .title-icon img {
    width: 150px;
    height: 150px;
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

  .title-banner {
    margin-top: 2rem;
    border-radius: var(--border-radius);
    box-shadow: var(--box-shadow);
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