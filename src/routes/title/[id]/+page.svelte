<script>
	import { fade } from 'svelte/transition';
	import Icon from '@iconify/svelte';
	import { favorites } from '$lib/stores';
	import { createImageSet } from '$lib/image';
	import GraphicsDetail from './GraphicsDetail.svelte';
	import YoutubeEmbeds from './YoutubeEmbeds.svelte';
	import PerformanceDetail from './PerformanceDetail.svelte';
	import PerformanceComparisonModal from './PerformanceComparisonModal.svelte';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	let { data } = $props();

	let showComparisonModal = $state(false);
	let isCopied = $state(false);
	let isDetailsCollapsed = $state(true);

	onMount(() => {
		if (browser && window.innerWidth >= 1024) {
			isDetailsCollapsed = false;
		}
	});

	async function handleCopy() {
		if (isCopied) return;
		try {
			await navigator.clipboard.writeText(id);
			isCopied = true;
			setTimeout(() => {
				isCopied = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy: ', err);
		}
	}

	let game = $derived(data.game);
	let session = $derived(data.session);
	let url = $derived(data.url)
	let allTitlesInGroup = $derived(data.allTitlesInGroup || []);
	let youtubeLinks = $derived(data.youtubeLinks || []);
	let youtubeContributors = $derived.by(() => {
		const contributors = new Set();
		youtubeLinks.forEach(link => {
			if (link.submittedBy) contributors.add(link.submittedBy);
		});
		return [...contributors];
	});

	let selectedVersionIndex = $state(0);
	let performanceHistory = $derived(game.performanceHistory || []);
	let performance = $derived(performanceHistory[selectedVersionIndex]);

	function hasPerformanceData(modeData) {
		if (!modeData) return false;
		const hasResolution =
			!!(modeData.resolution ||
			(modeData.resolutions && modeData.resolutions.split(',').filter(Boolean).length > 0) ||
			modeData.min_res ||
			modeData.max_res);
		const hasFps = !!modeData.target_fps;
		return hasResolution || hasFps;
	}

	let currentProfileHasData = $derived(
		performance?.profiles && (hasPerformanceData(performance.profiles.docked) || hasPerformanceData(performance.profiles.handheld))
	);

	function hasGraphicsData(graphicsSettings) {
		if (!graphicsSettings || Object.keys(graphicsSettings).length === 0) return false;
		const graphics = graphicsSettings;

		const checkModeData = (modeData) => {
			if (!modeData) return false;

			const res = modeData.resolution;
			if (res && (res.fixedResolution || res.minResolution || res.maxResolution || (res.multipleResolutions?.length > 0 && res.multipleResolutions[0]))) {
				return true;
			}

			const fps = modeData.framerate;
			if (fps && fps.targetFps) {
				return true;
			}

			const custom = modeData.custom;
			if (custom && Object.entries(custom).some(([key, data]) => key && data.value)) {
				return true;
			}

			return false;
		};

		if (checkModeData(graphics.docked) || checkModeData(graphics.handheld)) {
			return true;
		}

		const shared = graphics.shared;
		if (shared && Object.entries(shared).some(([key, data]) => key && data.value)) {
			return true;
		}

		return false;
	}

	let gameGraphicsHasData = $derived(hasGraphicsData(game?.graphics?.settings));

	let allContributors = $derived.by(() => {
		const contributors = new Set();
		if (performance?.contributor) performance.contributor.forEach(c => contributors.add(c));
		if (game.graphics?.contributor) game.graphics.contributor.forEach(c => contributors.add(c));
		youtubeContributors.forEach(c => contributors.add(c));
		return [...contributors];
	});

	let isSingleContributor = $derived(allContributors.length === 1);
	let singleContributorName = $derived(isSingleContributor ? allContributors[0] : null);

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
	let bannerImages = $derived(createImageSet(game.bannerUrl));
	let iconImages = $derived(createImageSet(game.iconUrl));

	let isUnreleased = $derived((() => {
		if (!game.releaseDate) return false;
		const dateStr = game.releaseDate.toString();
		const year = parseInt(dateStr.substring(0, 4), 10);
		const month = parseInt(dateStr.substring(4, 6), 10) - 1;
		const day = parseInt(dateStr.substring(6, 8), 10);
		const release = new Date(year, month, day);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return release > today;
	})());

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
		if (bytes === 0) return '0 Bytes';
		const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
		const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
		const value = bytes / Math.pow(1024, i);
		const formattedValue = value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
		return `${formattedValue} ${sizes[i]}`;
	}
</script>

<svelte:head>
	<title>{name} - Switch Performance</title>
	<meta name="description" content="View performance profiles and graphics settings for {name} on Switch Performance" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="{url.href}" />
	<meta property="og:title" content="{name} - Switch Performance" />
	<meta property="og:description" content="View performance profiles and graphics settings for {name} on Switch Performance" />
	<meta property="og:image" content="{url.origin}/api/og/{id}.png" />
	<meta property="twitter:card" content="summary_large_image" />
	<meta property="twitter:url" content="{url.href}" />
	<meta property="twitter:title" content="{name} - Switch Performance" />
	<meta property="twitter:description" content="View performance profiles and graphics settings for {name} on Switch Performance" />
	<meta property="twitter:image" content="{url.origin}/api/og/{id}.png" />
</svelte:head>

{#if game}
	<div class="page-container" in:fade={{ duration: 200 }}>
		<div class="banner-header">
			{#if bannerImages}
				<img
					src={bannerImages.src}
					srcset={bannerImages.srcset}
					alt=""
					class="banner-image"
					role="presentation"
					loading="lazy"
					sizes="(max-width: 900px) 100vw, 900px"
				/>
			{/if}
			<div class="banner-overlay"></div>
			<div class="header-content-wrapper">
				<div class="header-content">
					{#if iconImages}
						<img
							src={iconImages.src}
							srcset={iconImages.srcset}
							alt="{name} icon"
							class="game-icon"
							loading="lazy"
							sizes="150px"
						/>
					{:else}
						<div class="game-icon-placeholder"></div>
					{/if}
					<div class="title-info">
						<h1>{name}</h1>
						{#if game.publisher}<p class="publisher">{game.publisher}</p>{/if}
					</div>
					<div class="header-actions">
						<button class="favorite-button" onclick={() => favorites.toggle(id)} title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}>
							<Icon icon={isFavorited ? 'mdi:star' : 'mdi:star-outline'} width="24" height="24" />
						</button>
					</div>
				</div>
			</div>
		</div>

		<div class="main-layout">
			<div class="content-column">
				<!-- Mobile-only sidebar content -->
				<div class="mobile-sidebar">
					<a href="/contribute/{id}" class="contribute-button">
						<Icon icon="mdi:plus-circle-outline" />
						<span>{currentProfileHasData ? 'Suggest an Edit' : 'Add Performance Data'}</span>
					</a>
					<div class="info-card">
						<button class="info-card-title collapsible" onclick={() => isDetailsCollapsed = !isDetailsCollapsed}>
							<span>Game Details</span>
							<Icon icon="mdi:chevron-down" class="chevron" />
						</button>
						{#if !isDetailsCollapsed}
							<div class="details-list">
								<div class="detail-item">
									<span class="detail-label">Release Date</span>
									<span class="detail-value">{formatDate(game.releaseDate)}</span>
								</div>
								<div class="detail-item">
									<span class="detail-label">File Size</span>
									<span class="detail-value">{formatSize(game.sizeInBytes)}</span>
								</div>
								<div class="detail-item">
									<span class="detail-label">Title ID</span>
									<div class="detail-value interactive" onclick={handleCopy} role="button" tabindex="0">
										<span>{id}</span>
										{#if isCopied}
											<span class="copy-feedback">Copied!</span>
										{:else}
											<Icon icon="mdi:content-copy" class="copy-icon"/>
										{/if}
									</div>
								</div>
							</div>
						{/if}
					</div>
				</div>

				{#if isUnreleased}
					<div class="notice-card unreleased">
						<Icon icon="mdi:clock-outline" />
						<span>This game has not been released yet. Any submitted data may be from a demo or pre-release version.</span>
					</div>
				{/if}

				{#if performanceHistory.length === 0}
					<div class="notice-card no-data-cta">
						<h3>No Performance Data Yet</h3>
						<p>This title is in our database, but no community performance data has been submitted for it.</p>
						{#if session?.user}
							<a href="/contribute/{id}" class="cta-button">Be the first to contribute!</a>
						{:else}
							<a href="/auth/signin?callbackUrl=/contribute/{id}" class="cta-button">Sign in to contribute</a>
						{/if}
					</div>
				{:else}
					<section>
						<div class="section-header">
							<h2 class="section-title">Performance Profile</h2>
							<div class="header-controls">
								{#if performanceHistory.length > 1}
									<div class="version-selector">
										<label for="version-select">Version:</label>
										<select id="version-select" bind:value={selectedVersionIndex}>
											{#each performanceHistory as profile, i}
												<option value={i}>
													{profile.suffix ? `${profile.gameVersion} (${profile.suffix})` : profile.gameVersion}
												</option>
											{/each}
										</select>
									</div>
									<button class="compare-btn" onclick={() => showComparisonModal = true}>
										<Icon icon="mdi:compare-horizontal" />
										<span>Compare</span>
									</button>
								{:else if performance}
									<span class="version-tag">
										Version: {performance.suffix ? `${performance.gameVersion} (${performance.suffix})` : performance.gameVersion}
									</span>
								{/if}
							</div>
						</div>

						{#if currentProfileHasData}
							<PerformanceDetail performance={performance?.profiles} gameId={id} />
						{:else}
							<div class="notice-card">
								<p>No performance data has been submitted for this version.</p>
							</div>
						{/if}
					</section>

					{#if gameGraphicsHasData}
						<section>
							<div class="section-header">
								<h2 class="section-title">Graphics Settings</h2>
							</div>
							<GraphicsDetail settings={game.graphics.settings} />
						</section>
					{/if}

					{#if youtubeLinks.length > 0}
						<section>
							<div class="section-header">
								<h2 class="section-title">Gameplay Videos</h2>
							</div>
							<YoutubeEmbeds links={youtubeLinks} />
						</section>
					{/if}
				{/if}

				<!-- Mobile-only secondary sidebar content -->
				<div class="mobile-sidebar">
					{#if otherTitlesInGroup.length > 0}
						<div class="info-card">
							<h3 class="info-card-title">Other Regions</h3>
							<ul class="other-versions-list">
								{#each otherTitlesInGroup as title}
									<li>
										<a href={`/title/${title.id}`}>
											<span>{title.name}</span>
											<span class="other-title-id">{title.id}</span>
										</a>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
					
					{#if allContributors.length > 0}
						<div class="info-card">
							<h3 class="info-card-title">Contributors</h3>
							<ul class="contributor-list">
								{#each allContributors as c}
									<li><a href={`/profile/${c}`}>{c}</a></li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>

				{#if game.screenshots && game.screenshots.length > 0}
					<section>
						<h2 class="section-title">Screenshots</h2>
						<div class="screenshots-grid">
							{#each game.screenshots as screenshot}
								<button class="screenshot-button" onclick={() => (lightboxImage = screenshot)}>
									<img src={screenshot} alt="{name} screenshot" loading="lazy" />
								</button>
							{/each}
						</div>
					</section>
				{/if}
			</div>

			<aside class="sidebar-column">
				<div class="sidebar-sticky-content">
					<a href="/contribute/{id}" class="contribute-button">
						<Icon icon="mdi:plus-circle-outline" />
						<span>{currentProfileHasData ? 'Suggest an Edit' : 'Add Performance Data'}</span>
					</a>
					<div class="info-card">
						<button class="info-card-title collapsible" onclick={() => isDetailsCollapsed = !isDetailsCollapsed}>
							<span>Game Details</span>
							<Icon icon="mdi:chevron-down" class="chevron"  />
						</button>
						{#if !isDetailsCollapsed}
							<div class="details-list">
								<div class="detail-item">
									<span class="detail-label">Release Date</span>
									<span class="detail-value">{formatDate(game.releaseDate)}</span>
								</div>
								<div class="detail-item">
									<span class="detail-label">File Size</span>
									<span class="detail-value">{formatSize(game.sizeInBytes)}</span>
								</div>
								<div class="detail-item">
									<span class="detail-label">Title ID</span>
									<div class="detail-value interactive" onclick={handleCopy} role="button" tabindex="0">
										<span>{id}</span>
										{#if isCopied}
											<span class="copy-feedback">Copied!</span>
										{:else}
											<Icon icon="mdi:content-copy" class="copy-icon"/>
										{/if}
									</div>
								</div>
							</div>
						{/if}
					</div>

					{#if otherTitlesInGroup.length > 0}
						<div class="info-card">
							<h3 class="info-card-title">Other Regions</h3>
							<ul class="other-versions-list">
								{#each otherTitlesInGroup as title}
									<li>
										<a href={`/title/${title.id}`}>
											<span>{title.name}</span>
											<span class="other-title-id">{title.id}</span>
										</a>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
					
					{#if allContributors.length > 0}
						<div class="info-card">
							<h3 class="info-card-title">Contributors</h3>
							<ul class="contributor-list">
								{#each allContributors as c}
									<li><a href={`/profile/${c}`}>{c}</a></li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			</aside>
		</div>
	</div>
{:else}
	<p class="loading-message">Loading title details...</p>
{/if}

{#if lightboxImage}
	<div class="lightbox" onclick={() => (lightboxImage = '')} transition:fade={{ duration: 150 }} role="button" tabindex="0">
		<img src={lightboxImage} alt="{name} screenshot" onclick={(e) => e.stopPropagation()} />
	</div>
{/if}

{#if performanceHistory.length > 1}
	<PerformanceComparisonModal bind:show={showComparisonModal} {performanceHistory} />
{/if}

<style>
	.page-container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 0 1.5rem 2rem;
	}

	.banner-header {
		position: relative;
		border-radius: var(--radius-lg);
		overflow: hidden;
		color: white;
		margin: 1.5rem 0;
	}

	.banner-image {
		position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;
		transform: scale(1.1); filter: blur(12px) brightness(0.6);
	}
	.banner-overlay {
		position: absolute; top: 0; left: 0; width: 100%; height: 100%;
		background: linear-gradient(to top, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.1));
	}

	.header-content-wrapper {
		position: relative;
		padding: 1.5rem;
	}
	@media (min-width: 768px) {
		.header-content-wrapper {
			padding: 2rem;
		}
	}

	.header-content {
		display: grid;
		grid-template-areas:
			"icon title actions";
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 1rem 1.5rem;
	}

	@media (max-width: 639px) {
		.header-content {
			grid-template-areas: 
				"icon actions"
				"title title";
			grid-template-columns: 1fr auto;
			align-items: flex-start;
		}
		.title-info {
			margin-top: 1rem;
		}
	}

	@media (min-width: 640px) {
		.header-content {
			grid-template-areas: "icon title actions";
			grid-template-columns: auto 1fr auto;
		}
	}

	.game-icon, .game-icon-placeholder {
		grid-area: icon;
		width: 100px; height: 100px;
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
	}
	@media (min-width: 768px) {
		.game-icon, .game-icon-placeholder {
			width: 120px; height: 120px;
		}
	}
	.game-icon-placeholder { background-color: var(--surface-dark); }
	
	.title-info { grid-area: title; }
	.title-info h1 {
		margin: 0;
		font-size: 2rem;
		font-weight: 700;
		text-shadow: 0 2px 4px rgba(0,0,0,0.5);
		color: white;
	}
	@media (min-width: 768px) {
		.title-info h1 { font-size: 2.5rem; }
	}
	.publisher {
		font-size: 1.1rem;
		opacity: 0.8;
		margin: 0.25rem 0 0;
	}

	.header-actions {
		grid-area: actions;
		display: flex;
		justify-self: end;
	}

	.favorite-button {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: white;
		border-radius: 50%;
		width: 44px; height: 44px;
		display: flex; align-items: center; justify-content: center;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	.favorite-button:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.main-layout {
		display: grid;
		grid-template-columns: 1fr;
		gap: 3rem;
		margin-top: 2rem;
	}
	@media (min-width: 1024px) {
		.main-layout {
			grid-template-columns: 1fr 320px;
		}
		.content-column { order: 1; }
		.sidebar-column { order: 2; }
	}
	.content-column {
		display: flex;
		flex-direction: column;
		gap: 3rem;
	}

	.mobile-sidebar {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	
	.sidebar-column {
		display: none;
	}
	
	@media (min-width: 1024px) {
		.mobile-sidebar {
			display: none;
		}
		.sidebar-column {
			display: block;
		}
	}
	
	.sidebar-sticky-content {
		position: sticky;
		top: 80px;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	
	.section-header {
		display: flex; justify-content: space-between; align-items: center;
		margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;
	}
	.section-title { font-size: 1.5rem; font-weight: 700; margin: 0; }

	.header-controls {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-left: auto;
	}

	.compare-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background-color: var(--input-bg);
		border: 1px solid var(--border-color);
		color: var(--text-secondary);
		padding: 6px 12px;
		border-radius: var(--radius-md);
		font-weight: 500;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	.compare-btn:hover {
		color: var(--primary-color);
		border-color: var(--primary-color);
	}
	
	.contribute-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.75rem;
		font-size: 1rem;
		font-weight: 600;
		text-decoration: none;
		background-color: var(--primary-color);
		color: var(--primary-action-text);
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: background-color 0.2s;
	}
	.contribute-button:hover { background-color: var(--primary-color-hover); }

	.info-card {
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
	}
	.info-card-title {
		font-size: 1.125rem;
		margin: 0 0 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--border-color);
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
	}

	.info-card-title.collapsible {
		color: var(--text-primary);
		background: none;
		border: none;
		padding: 0;
		text-align: left;
		cursor: pointer;
		margin: 0;
	}

	.info-card-title.collapsible .chevron {
		transition: transform 0.2s ease-in-out;
		color: var(--text-secondary);
	}
	.info-card-title.collapsible .chevron.rotated {
		transform: rotate(180deg);
	}

	.info-card .details-list {
		margin-top: 1rem;
	}
	
	.details-list { display: flex; flex-direction: column; gap: 1rem; }
	.detail-item { display: flex; flex-direction: column; gap: 0.25rem; }
	.detail-label { font-size: 0.8rem; color: var(--text-secondary); }
	.detail-value { font-weight: 500; }
	.detail-value.interactive {
		display: flex;
		align-items: center;
		justify-content: space-between;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		margin: -0.25rem -0.5rem;
		border-radius: var(--radius-sm);
	}
	.detail-value.interactive:hover { background-color: var(--input-bg); }
	.copy-icon { color: var(--text-secondary); }
	.copy-feedback { font-size: 0.8rem; font-weight: 500; color: var(--primary-color); }

	.other-versions-list, .contributor-list {
		list-style: none; padding: 0; margin: 0;
		display: flex; flex-direction: column; gap: 0.75rem;
	}
	.other-versions-list a, .contributor-list a {
		text-decoration: none;
		color: var(--text-body);
		font-weight: 500;
	}
	.other-versions-list a {
		display: flex;
		flex-direction: column;
		padding: 0.5rem;
		margin: -0.5rem;
		border-radius: var(--radius-sm);
		transition: background-color 0.2s;
	}
	.other-versions-list a:hover {
		background-color: var(--input-bg);
		text-decoration: none;
	}
	.other-title-id {
		font-size: 0.8rem;
		color: var(--text-secondary);
		font-weight: 400;
		margin-top: 0.1rem;
	}

	.notice-card {
		display: flex; align-items: center; gap: 0.75rem;
		padding: 1rem 1.5rem; border-radius: var(--radius-md);
		border: 1px solid;
	}
	.notice-card.unreleased {
		background-color: #fffbeb;
		color: #b45309;
		border-color: #fde68a;
	}
	.dark .notice-card.unreleased {
		background-color: #451a03;
		color: #fcd34d;
		border-color: #78350f;
	}
	
	.no-data-cta {
		flex-direction: column;
		align-items: center;
		text-align: center;
		border-style: dashed;
		padding: 2rem;
		background-color: var(--surface-color);
		border-color: var(--border-color);
	}
	.no-data-cta h3 { margin: 0 0 0.5rem; }
	.no-data-cta p { max-width: 450px; margin: 0 auto 1.5rem; color: var(--text-secondary); }
	.cta-button {
		display: inline-block;
		background-color: var(--primary-color);
		color: var(--primary-action-text);
		padding: 10px 20px;
		border-radius: var(--radius-md);
		font-weight: 600;
		text-decoration: none;
	}

	.version-selector { display: flex; align-items: center; gap: 0.5rem; }
	.version-selector label { font-size: 0.9rem; color: var(--text-secondary); }
	.version-selector select {
		background-color: var(--input-bg);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 6px 10px; font-size: 0.9rem;
		color: var(--text-primary);
	}
	
	.version-tag {
		background-color: var(--input-bg);
		border: 1px solid var(--border-color);
		color: var(--text-secondary);
		padding: 6px 10px;
		border-radius: var(--radius-md);
		font-size: 0.9rem;
	}

	.screenshots-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 1rem;
	}
	.screenshot-button {
		border: none; padding: 0; background: none; cursor: pointer;
		border-radius: var(--radius-md); overflow: hidden;
		border: 1px solid var(--border-color);
	}
	.screenshot-button img { transition: transform 0.2s; }
	.screenshot-button:hover img { transform: scale(1.05); }

	.loading-message { text-align: center; padding: 2rem; }

	.lightbox {
		position: fixed; top: 0; left: 0; width: 100%; height: 100%;
		background: rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(4px);
		display: flex; align-items: center; justify-content: center;
		z-index: 100;
	}
	.lightbox img { max-width: 90%; max-height: 90%; border-radius: var(--radius-md); }
</style>