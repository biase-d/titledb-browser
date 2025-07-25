<script>
	import { titleIndex } from '$lib/stores'
	import { onMount } from 'svelte'
	import { getCachedTitleDetail, setCachedTitleDetail } from '$lib/db.js'
	import { fade } from 'svelte/transition'
	import { titleIdUrl } from '$lib/index.js'

	export let data
	let titleData = null
	let lightboxImage = null
	let isRawDataOpen = false

	$: allNames = $titleIndex[data.id] || [data.id]
	$: name = allNames[0]
	$: alternateNames = allNames.slice(1)

	onMount(async () => {
	  const id = data.id
	  const cached = await getCachedTitleDetail(id)
	  if (cached) {
	    titleData = cached
	    return
	  }
	  const res = await fetch(titleIdUrl(id))
	  const fetchedData = await res.json()
	  titleData = fetchedData
	  await setCachedTitleDetail(id, fetchedData)
	})

	function formatDate (releaseDate) {
	  if (!releaseDate) return 'N/A'
	  const dateStr = releaseDate.toString()
	  const year = dateStr.substring(0, 4)
	  const month = dateStr.substring(4, 6)
	  const day = dateStr.substring(6, 8)
	  return `${year}-${month}-${day}`
	}
</script>

<svelte:head>
	<title>{name || 'Loading...'} - Titledb Browser</title>
	{#if titleData}
		<meta name="description" content={titleData.description || `Details for ${name} (${data.id})`} />
		<meta property="og:title" content={`${name} - Titledb Browser`} />
		<meta property="og:description" content={titleData.description || `Details for ${name} (${data.id})`} />
		<meta property="og:image" content={titleData.bannerUrl || titleData.iconUrl} />
		<meta property="twitter:title" content={`${name} - Titledb Browser`} />
		<meta property="twitter:description" content={titleData.description || `Details for ${name} (${data.id})`} />
		<meta property="twitter:image" content={titleData.bannerUrl || titleData.iconUrl} />
	{/if}
</svelte:head>

{#if titleData}
	<div class="page-container" in:fade={{ duration: 300 }}>
		<div class="page-header">
			<a href="/" class="back-button">← Back to Search</a>
		</div>

		<div class="title-card">
			{#if titleData.iconUrl}
				<figure class="title-icon">
					<img src={titleData.iconUrl} alt="Icon" />
				</figure>
			{/if}
			<div class="title-info">
				<h1>{name}</h1>

				{#if alternateNames.length > 0}
					<div class="alternate-titles">
						<strong>Also Known As:</strong>
						<div class="names-list">
							{#each alternateNames as altName}
								<span class="alt-name-tag">{altName}</span>
							{/each}
						</div>
					</div>
				{/if}
				<!--
				<p class="description">{titleData.description || 'No description available.'}</p>
				-->
				<div class="details-grid">
					<span><strong>Publisher:</strong> {titleData.publisher || 'N/A'}</span>
					<span><strong>Release Date:</strong> {formatDate(titleData.releaseDate)}</span>
					<span><strong>Size:</strong> {titleData.size || 'N/A'}</span>
					<span><strong>Title ID:</strong> {data.id}</span>
				</div>
			</div>
		</div>

		{#if titleData.bannerUrl}
			<img class="title-banner" src={titleData.bannerUrl} alt="Banner" />
		{/if}

		<h2 class="section-title">Screenshots</h2>
		<div class="screenshots-grid">
			{#if titleData.screenshots && titleData.screenshots.length > 0}
				{#each titleData.screenshots as screenshot}
					<button class="screenshot-button" on:click={() => (lightboxImage = screenshot)}>
						<img src={screenshot} alt="Screenshot" />
					</button>
				{/each}
			{:else}
				<p>No screenshots available.</p>
			{/if}
		</div>

		<div class="raw-data-section">
			<button on:click={() => (isRawDataOpen = !isRawDataOpen)}>
				{isRawDataOpen ? 'Hide' : 'Show'} Raw Data
			</button>
			{#if isRawDataOpen}
				<pre>{JSON.stringify(titleData, null, 2)}</pre>
			{/if}
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
        border-radius: 999px; /* Pill shape */
        font-size: 0.85rem;
        border: 1px solid var(--border-color);
        box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }
    .page-header {
        margin-bottom: 1.5rem;
    }
    .back-button {
        padding: 8px 16px;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        transition: background-color 0.2s ease;
    }
    .back-button:hover {
        background-color: var(--surface-color);
        text-decoration: none;
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
    .title-icon img {
        width: 150px;
        height: 150px;
        border-radius: var(--border-radius);
        flex-shrink: 0;
    }
    .title-info h1 {
        margin: 0 0 1rem;
        font-size: 2.25rem;
    }
    .title-info .description {
        opacity: 0.9;
        line-height: 1.6;
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
    .section-title {
        margin: 2.5rem 0 1.5rem;
        font-size: 1.75rem;
        border-bottom: 2px solid var(--border-color);
        padding-bottom: 0.5rem;
    }
    .screenshots-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 1rem;
    }
    .screenshots-grid img {
        border-radius: var(--border-radius);
        box-shadow: var(--box-shadow);
    }
    .raw-data-section {
        margin-top: 2.5rem;
    }
    .raw-data-section button {
        background-color: var(--surface-color);
        border: 1px solid var(--border-color);
        color: var(--text-color);
        padding: 10px 16px;
        border-radius: var(--border-radius);
        cursor: pointer;
        font-size: 0.9rem;
        margin-bottom: 1rem;
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
		box-shadow: 0 0 40px rgba(0,0,0,0.5);
	}
</style>
