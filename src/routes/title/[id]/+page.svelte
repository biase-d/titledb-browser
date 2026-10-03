<script>
	import { fade } from 'svelte/transition'
	import { browser } from '$app/environment'
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'

	import Icon from '@iconify/svelte'

	import { favorites } from '$lib/stores'
	import { preferences } from '$lib/stores/preferences'
	import { createImageSet, proxyImage } from '$lib/image'
	import { getRegionLabel } from '$lib/regions'
	import { getLocalizedName } from '$lib/i18n'
	import PlayabilityBadge from '$lib/components/PlayabilityBadge.svelte'

	import GraphicsDetail from './GraphicsDetail.svelte'
	import YoutubeEmbeds from './YoutubeEmbeds.svelte'
	import PerformanceDetail from './PerformanceDetail.svelte'
	import PerformanceComparisonModal from './PerformanceComparisonModal.svelte'
	import RegionPopover from './RegionPopover.svelte'
	import BackToTop from './BackToTop.svelte'
	import CartridgeFocus from './CartridgeFocus.svelte'
	import { reveal } from '$lib/actions/reveal'
	import CartridgeItem from '../../CartridgeItem.svelte'
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte'
	import { toggleDataRequest } from '$lib/remote/game-requests.remote.js'
	import { serializeJsonLd } from '$lib/jsonLd'

	let { data } = $props()

	let url = $derived(data.url)
	let showComparisonModal = $state(false)

	let isCopied = $state(false)
	async function handleCopy () {
		if (isCopied) return
		try {
			await navigator.clipboard.writeText(id)
			isCopied = true
			setTimeout(() => {
				isCopied = false
			}, 2000)
		} catch (err) {
			console.error('Failed to copy: ', err)
		}
	}

	let game = $derived(data.game)
	let session = $derived(data.session)
	let allTitlesInGroup = $derived(game.allTitlesInGroup || [])
	let youtubeLinks = $derived(game.youtubeLinks || [])

	let selectedVersionIndex = $state(0)
	let performanceHistory = $derived(game.performanceHistory || [])
	let performance = $derived(performanceHistory[selectedVersionIndex])

	function hasPerformanceData (modeData) {
		if (!modeData) return false
		const hasResolution = !!(
			modeData.resolution ||
			(modeData.resolutions &&
				modeData.resolutions.split(',').filter(Boolean).length > 0) ||
			modeData.min_res ||
			modeData.max_res
		)
		const hasFps = !!modeData.target_fps
		return hasResolution || hasFps
	}

	let currentProfileHasData = $derived(
		performance?.profiles &&
			(hasPerformanceData(performance.profiles.docked) ||
				hasPerformanceData(performance.profiles.handheld)),
	)

	function hasGraphicsData (graphicsSettings) {
		if (!graphicsSettings || Object.keys(graphicsSettings).length === 0)
			return false
		const graphics = graphicsSettings

		const checkModeData = (modeData) => {
			if (!modeData) return false

			const res = modeData.resolution
			if (
				res &&
				(res.resolutionType ||
					res.fixedResolution ||
					res.minResolution ||
					res.maxResolution ||
					(res.multipleResolutions?.length > 0 &&
						res.multipleResolutions[0]))
			) {
				return true
			}

			const fps = modeData.framerate
			if (fps && fps.targetFps) {
				return true
			}

			const custom = modeData.custom
			if (
				custom &&
				Object.entries(custom).some(([key, data]) => key && data.value)
			) {
				return true
			}

			return false
		}

		if (
			checkModeData(graphics.docked) ||
			checkModeData(graphics.handheld)
		) {
			return true
		}

		const shared = graphics.shared
		if (
			shared &&
			Object.entries(shared).some(([key, data]) => key && data.value)
		) {
			return true
		}

		return false
	}

	let gameGraphicsHasData = $derived(
		hasGraphicsData(game?.graphics?.settings),
	)

	function hasActualPerformanceData (profile) {
		if (!profile) return false

		const { docked, handheld } = profile

		
		if (docked?.target_fps || handheld?.target_fps) {
			return true
		}

		
		if (docked?.resolution_type || handheld?.resolution_type) {
			return true
		}

		return false
	}

	let gameHasPerformanceData = $derived(
		performance?.profiles
			? hasActualPerformanceData(performance.profiles)
			: false,
	)

	// A profile that says something, as opposed to a placeholder that only names
	// a contributor
	let hasRealProfile = $derived(
		performanceHistory.some(
			(p) => hasPerformanceData(p.profiles?.docked) || hasPerformanceData(p.profiles?.handheld),
		),
	)
	// With no measured profile, the targets from the graphics settings still
	// answer "what does it run at"
	let graphicsTargets = $derived(graphicsAsTargets(game.graphics?.settings))

	let allContributors = $derived(game.allContributors)

	let id = $derived(game?.id)
	let otherTitlesInGroup = $derived(
		allTitlesInGroup.filter((t) => t.id !== id),
	)

	let isFavorited = $state(false)
	$effect(() => {
		if (id) {
			favorites.subscribe((favs) => {
				isFavorited = favs.has(id)
			})
		}
	})

	let preferredRegion = $state(data.preferredRegion || 'US')

	
	preferences.subscribe((p) => {
		if (p.region) preferredRegion = p.region
	})

	let name = $derived(getLocalizedName(game.names, preferredRegion))
	let altNames = $derived(
		game.names ? game.names.filter((n) => n !== name) : [],
	)

	let isDetailsCollapsed = $state(true)
	let breadcrumbItems = $derived.by(() => {
		// Breadcrumbs renders Home itself, as the root with position 1. Adding
		// it here too produced "Home > Home" on every title page, in the visible
		// trail and in the BreadcrumbList structured data with it
		const items = []

		if (browser) {
			const referrer = document.referrer
			if (referrer && referrer.includes(window.location.origin)) {
				const refUrl = new URL(referrer)
				const path = refUrl.pathname
				const search = refUrl.search

				if (path === '/' && search) {
					return [
						...items,
						{ label: 'Search Results', href: `/${search}` },
						{ label: name },
					]
				} else if (path.startsWith('/publisher/')) {
					const publisherName = decodeURIComponent(
						path.split('/publisher/')[1],
					).split('?')[0]
					return [
						...items,
						{ label: publisherName, href: path + search },
						{ label: name },
					]
				} else if (path === '/favorites') {
					return [
						...items,
						{ label: 'Favorites', href: '/favorites' },
						{ label: name },
					]
				} else if (path === '/stats') {
					return [
						...items,
						{ label: 'Insights', href: '/stats' },
						{ label: name },
					]
				} else if (path === '/pending-verification') {
					return [
						...items,
						{
							label: 'Pending Verification',
							href: '/pending-verification',
						},
						{ label: name },
					]
				} else if (path.startsWith('/profile/')) {
					const username = path.split('/profile/')[1]
					return [
						...items,
						{ label: username, href: path },
						{ label: name },
					]
				}
			}
		}

		if (game.publisher && game.publisher !== 'N/A') {
			return [
				...items,
				{
					label: game.publisher,
					href: `/publisher/${encodeURIComponent(game.publisher)}`,
				},
				{ label: name },
			]
		}

		return [...items, { label: name }]
	})

	onMount(() => {
		if (browser) {
			if (window.innerWidth >= 1024) {
				isDetailsCollapsed = false
			}
		}
	})

	let lightboxImage = $state('')
	let bannerImages = $derived(
		createImageSet(game.bannerUrl, {
			highRes: $preferences.highResImages,
			bannerWidth: 800,
		}),
	)
	let isUnreleased = $derived(game.isUnreleased)

	let hasRequested = $state(data.hasRequested)
	let isRequesting = $state(false)

	async function toggleRequest () {
		if (!session?.user) {
			goto('/auth/signin?callbackUrl=' + url.href)
			return
		}

		isRequesting = true
		try {
			const result = await toggleDataRequest(id)
			hasRequested = result.requested
		} catch (e) {
			console.error(e)
		} finally {
			isRequesting = false
		}
	}

	import { graphicsAsTargets } from '$lib/graphicsPerformance'
	import { themeStore } from '$lib/stores/theme.svelte'
	$effect(() => {
		if (id) {
			themeStore.setTheme(
				game.iconUrl || game.bannerUrl,
				game.bannerUrl || game.iconUrl,
			)
		}
		return () => {
			themeStore.clearTheme()
		}
	})

	let gameJsonLd = $derived.by(() => {
		if (!game) return null

		/** @type {Record<string, any>} */
		const data = {
			'@context': 'https://schema.org',
			'@type': 'VideoGame',
			name,
			gamePlatform: 'Nintendo Switch',
			applicationCategory: 'Game',
			operatingSystem: 'Nintendo Switch OS',
			// The rendered OG card, not a 300px icon: Google wants a rich-result
			// image around 1200px wide, and this one is already generated,
			// cached and exactly that size
			image: `${url.origin}/api/og/${id}.jpg`,
			url: `${url.origin}/title/${canonicalTitleId}`,
			description: `View performance profiles and graphics settings for ${name} on Switch Performance`,
		}

		if (game.publisher && game.publisher !== 'N/A') {
			data.publisher = { '@type': 'Organization', name: game.publisher }
		}

		if (game.releaseDate) {
			const raw = game.releaseDate.toString()
			data.datePublished = `${raw.substring(0, 4)}-${raw.substring(4, 6)}-${raw.substring(6, 8)}`
		}

		return data
	})

	/** The hero's own wrapper, which the phone bubble watches */
	/** @type {HTMLElement | undefined} */
	let heroElement = $state()
	/** The phone bubble: whether the hero has flown into it, where it is, and whether the hero is in 3D */
	let docked = $state(false)
	/** @type {HTMLElement | undefined} */
	let dockElement = $state()
	let heroGl = $state(false)
	/** Looking at the cartridge up close: it flies to the middle of the screen. Its spot, and its handle on the stage */
	let focused = $state(false)
	/** @type {HTMLElement | undefined} */
	let focusSlot = $state()
	let heroHandle = $state(null)
	// Where the hero is headed: the middle of the screen when inspected, the corner when scrolled past
	const dockTarget = $derived(focused ? focusSlot : dockElement)
	const dockedNow = $derived(focused || docked)

	// The numbers on the cartridge: the newest real profile, else what the graphics settings target
	const heroPerformance = $derived.by(() => {
		const real = performanceHistory.find(
			(p) => hasPerformanceData(p.profiles?.docked) || hasPerformanceData(p.profiles?.handheld),
		)
		const source = real?.profiles ?? graphicsTargets ?? {}
		return { docked: source.docked ?? {}, handheld: source.handheld ?? {} }
	})
	const heroData = $derived({
		id: game.id,
		iconUrl: game.iconUrl,
		bannerUrl: game.bannerUrl,
		names: game.names,
		regions: game.regions,
		publisher: game.publisher,
		performance: heroPerformance,
	})

	// From the server, built from the real group so it is the same on every page of the game
	const canonicalTitleId = $derived(game.seo?.canonicalTitleId ?? id)
	const indexable = $derived(game.seo?.indexable ?? true)
</script>

<svelte:head>
	<title>{name} - Switch Performance</title>
	<meta
		name="description"
		content="View performance profiles and graphics settings for {name} on Switch Performance"
	/>
	<link rel="canonical" href="{url.origin}/title/{canonicalTitleId}" />
	<!-- A title with no data yet is the artwork and name only, the same on thousands
	     of pages. Links are still followed; the page is indexed once it has data -->
	{#if !indexable}
		<meta name="robots" content="noindex, follow" />
	{/if}
	<meta property="og:type" content="product" />
	<meta property="og:url" content="{url.origin}/title/{canonicalTitleId}" />
	<meta property="og:title" content="{name} - Switch Performance" />
	<meta
		property="og:description"
		content="View performance profiles and graphics settings for {name} on Switch Performance"
	/>
	<meta property="og:image" content="{url.origin}/api/og/{id}.jpg?ts={game.lastUpdated ? Math.floor(new Date(game.lastUpdated).getTime() / 1000) : 'v2'}" />
	<meta property="og:image:type" content="image/jpeg" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:site_name" content="Switch Performance" />
	<meta property="twitter:card" content="summary_large_image" />
	<meta property="twitter:url" content={url.href} />
	<meta property="twitter:title" content="{name} - Switch Performance" />
	<meta
		property="twitter:description"
		content="View performance profiles and graphics settings for {name} on Switch Performance"
	/>
	<meta property="twitter:image" content="{url.origin}/api/og/{id}.jpg?ts={game.lastUpdated ? Math.floor(new Date(game.lastUpdated).getTime() / 1000) : 'v2'}" />

	{#if gameJsonLd}
		<!-- JSON-LD must be raw script content. serializeJsonLd escapes `<`, so no
		     value can close the tag early -->
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html `<script type="application/ld+json">${serializeJsonLd(gameJsonLd)}${'<'}/script>`}
	{/if}
</svelte:head>

{#if game}
	{#key id}
		<div class="page-container" in:fade={{ duration: 200 }}>
		<Breadcrumbs items={breadcrumbItems} />

		<div class="banner-header">
			<div class="banner-bg-wrapper">
				{#if bannerImages}
					<img
						src={bannerImages.src}
						srcset={bannerImages.srcset}
						alt=""
						class="banner-image"
						role="presentation"
						loading="lazy"
						sizes="(max-width: 1200px) 100vw, 1200px"
					/>
				{/if}
				<div class="banner-overlay"></div>
			</div>

			<div class="header-content-wrapper">
				<div class="header-content">
					<div class="hero-cart" bind:this={heroElement}>
						<CartridgeItem
							titleData={heroData}
							hero
							docked={dockedNow}
							dockTo={dockTarget}
							bind:glActive={heroGl}
							bind:handleRef={heroHandle}
							onactivate={() => (focused = true)}
						/>
					</div>

					<div class="hero-info">
						<div class="eyebrow">
							{#if game.publisher}
								<a
									href="/publisher/{encodeURIComponent(
										game.publisher,
									)}"
									class="publisher-link"
									title={game.publisher}
								>
									{game.publisher}
								</a>
							{/if}
							{#if game.regions && game.regions.length > 0}
								<RegionPopover regions={game.regions} />
							{/if}
						</div>

						<h1
							lang={preferredRegion === 'JP'
								? 'ja'
								: preferredRegion === 'KR'
									? 'ko'
									: 'en'}
						>
							{name}
						</h1>

						<div class="facts">
							{#if game.formattedReleaseDate !== 'N/A'}
								<span>{game.formattedReleaseDate}</span>
							{/if}
							{#if game.formattedSize !== 'N/A'}
								<span>{game.formattedSize}</span>
							{/if}
							{#if gameHasPerformanceData}
								<PlayabilityBadge
									profile={performance.profiles}
									large={true}
								/>
							{/if}
						</div>

						<div class="hero-actions">
							<button
								class="pill"
								class:active={isFavorited}
								onclick={() => favorites.toggle(id)}
								aria-pressed={isFavorited}
							>
								<Icon
									icon={isFavorited
										? 'mdi:star'
										: 'mdi:star-outline'}
									width="20"
									height="20"
								/>
								{isFavorited ? 'Favorited' : 'Favorite'}
							</button>
							{#if heroGl}
								<button class="pill" onclick={() => (focused = true)}>
									<Icon icon="mdi:rotate-3d-variant" width="20" height="20" />
									Inspect<span class="long"> cartridge</span>
								</button>
							{/if}
							{#if session?.user}
								<form method="POST" action="?/setFeatured">
									<button
										class="pill icon-only"
										type="submit"
										title="Set as Profile Backdrop"
										aria-label="Set as Profile Backdrop"
									>
										<Icon
											icon="mdi:image-marker-outline"
											width="20"
											height="20"
										/>
									</button>
								</form>
							{/if}
						</div>
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
						<span
							>{currentProfileHasData
								? 'Suggest an Edit'
								: 'Add Performance Data'}</span
						>
					</a>
					<div class="info-card" use:reveal>
						<button
							class="info-card-title collapsible"
							onclick={() =>
								(isDetailsCollapsed = !isDetailsCollapsed)}
						>
							<span>Game Details</span>
							<Icon icon="mdi:chevron-down" class="chevron" />
						</button>
						{#if !isDetailsCollapsed}
							<div class="details-list">
								<div class="detail-item">
									<span class="detail-label"
										>Release Date</span
									>
									<span class="detail-value"
										>{game.formattedReleaseDate}</span
									>
								</div>
								<div class="detail-item">
									<span class="detail-label">File Size</span>
									<span class="detail-value"
										>{game.formattedSize}</span
									>
								</div>
								<div class="detail-item">
									<span class="detail-label">Title ID</span>
									<div
										class="detail-value interactive"
										onclick={handleCopy}
										onkeydown={(e) =>
											(e.key === 'Enter' ||
												e.key === ' ') &&
											handleCopy(e)}
										role="button"
										tabindex="0"
									>
										<span>{id}</span>
										{#if isCopied}
											<span class="copy-feedback"
												>Copied!</span
											>
										{:else}
											<Icon
												icon="mdi:content-copy"
												class="copy-icon"
											/>
										{/if}
									</div>
								</div>
								{#if altNames.length > 0}
									<div class="detail-item">
										<span class="detail-label"
											>Also Known As</span
										>
										<ul class="alt-names-list">
											{#each altNames as alt}
												<li>{alt}</li>
											{/each}
										</ul>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				</div>

				{#if isUnreleased}
					<div class="notice-card unreleased">
						<Icon icon="mdi:clock-outline" />
						<span
							>This game has not been released yet. Any submitted
							data may be from a demo or pre-release version.</span
						>
					</div>
				{/if}

				{#if !hasRealProfile && !graphicsTargets}
					<div class="notice-card no-data-cta">
						<h3>No Performance Data Yet</h3>
						<p>
							This title is in our database, but no community
							performance data has been submitted for it.
						</p>

						<div class="cta-group">
							{#if session?.user}
								<a href="/contribute/{id}" class="cta-button"
									>Be the first to contribute!</a
								>
							{:else}
								<a
									href="/auth/signin?callbackUrl=/contribute/{id}"
									class="cta-button">Sign in to contribute</a
								>
							{/if}

							<button
								class="request-button"
								class:active={hasRequested}
								onclick={toggleRequest}
								disabled={isRequesting}
								title={hasRequested
									? 'You have requested data for this game'
									: 'Request data for this game'}
							>
								<Icon
									icon={hasRequested
										? 'mdi:check'
										: 'mdi:hand-back-right'}
								/>
								{hasRequested
									? 'Data Requested'
									: 'Request Data'}
							</button>
						</div>
					</div>
				{:else if hasRealProfile}
					<section use:reveal>
						<div class="section-header">
							<h2 class="section-title">Performance Profile</h2>
							<div class="header-controls">
								{#if performanceHistory.length > 1}
									<div class="version-selector">
										<label for="version-select"
											>Version:</label
										>
										<select
											id="version-select"
											bind:value={selectedVersionIndex}
										>
											{#each performanceHistory as profile, i}
												<option value={i}>
													{profile.suffix
														? `${profile.gameVersion} (${profile.suffix})`
														: profile.gameVersion}{profile.isPending ? ' [Pending]' : ''}
												</option>
											{/each}
										</select>
									</div>
									<button
										class="compare-btn"
										onclick={() =>
											(showComparisonModal = true)}
									>
										<Icon icon="mdi:compare-horizontal" />
										<span>Compare</span>
									</button>
								{:else if performance}
									<span class="version-tag">
										Version: {performance.suffix
											? `${performance.gameVersion} (${performance.suffix})`
											: performance.gameVersion}
									</span>
								{/if}
								{#if performance?.isPending}
									<span class="pending-badge">
										<Icon icon="mdi:clock-outline" width="14" />
										Pending Review
									</span>
								{/if}
							</div>
						</div>

						{#if currentProfileHasData}
							<PerformanceDetail
								performance={performance?.profiles}
								gameId={id}
							/>
						{:else}
							<div class="notice-card">
								<p>
									No performance data has been submitted for
									this version.
								</p>
							</div>
						{/if}
					</section>
				{:else}
					<section use:reveal>
						<div class="section-header">
							<h2 class="section-title">Performance Targets</h2>
						</div>
						<PerformanceDetail performance={graphicsTargets} gameId={id} />
						<div class="notice-card targets-note">
							<p>
								These are the frame rate and resolution the game is set to
								target, taken from its graphics settings. No one has measured
								how well it holds them yet.
							</p>
							<div class="cta-group">
								{#if session?.user}
									<a href="/contribute/{id}" class="cta-button">Add a measured profile</a>
								{:else}
									<a href="/auth/signin?callbackUrl=/contribute/{id}" class="cta-button">Sign in to add one</a>
								{/if}
								<button
									class="request-button"
									class:active={hasRequested}
									onclick={toggleRequest}
									disabled={isRequesting}
								>
									<Icon icon={hasRequested ? 'mdi:check' : 'mdi:hand-back-right'} />
									{hasRequested ? 'Data Requested' : 'Request Data'}
								</button>
							</div>
						</div>
					</section>
				{/if}

				{#if gameGraphicsHasData}
						<section use:reveal>
							<div class="section-header">
								<h2 class="section-title">Graphics Settings</h2>
							</div>
							<GraphicsDetail settings={game.graphics.settings} />
						</section>
					{/if}

					{#if youtubeLinks.length > 0}
						<section use:reveal>
							<div class="section-header">
								<h2 class="section-title">Gameplay Videos</h2>
							</div>
							<YoutubeEmbeds links={youtubeLinks} />
						</section>
					{/if}

				<!-- Mobile-only secondary sidebar content -->
				<div class="mobile-sidebar">
					{#if otherTitlesInGroup.length > 0}
						<div class="info-card" use:reveal>
							<h3 class="info-card-title">Other Regions</h3>
							<ul class="other-versions-list">
								{#each otherTitlesInGroup as title}
									{@const label = getRegionLabel(
										title.regions,
									)}
									<li>
										<a href={`/title/${title.id}`}>
											<span>{title.name}</span>
											<div class="other-title-meta">
												<span class="other-title-id"
													>{title.id}</span
												>
												{#if label}
													<span class="region-codes"
														>{label}</span
													>
												{/if}
											</div>
										</a>
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					{#if allContributors.length > 0}
						<div class="info-card" use:reveal>
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
					<section use:reveal>
						<h2 class="section-title">Screenshots</h2>
						<div class="screenshots-grid">
							{#each game.screenshots as screenshot}
								<button
									class="screenshot-button"
									onclick={() => (lightboxImage = screenshot)}
								>
									<img
										src={proxyImage(screenshot)}
										alt="{name} screenshot"
										loading="lazy"
									/>
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
						<span
							>{currentProfileHasData
								? 'Suggest an Edit'
								: 'Add Performance Data'}</span
						>
					</a>
					<div class="info-card" use:reveal>
						<button
							class="info-card-title collapsible"
							onclick={() =>
								(isDetailsCollapsed = !isDetailsCollapsed)}
						>
							<span>Game Details</span>
							<Icon icon="mdi:chevron-down" class="chevron" />
						</button>
						{#if !isDetailsCollapsed}
							<div class="details-list">
								<div class="detail-item">
									<span class="detail-label"
										>Release Date</span
									>
									<span class="detail-value"
										>{game.formattedReleaseDate}</span
									>
								</div>
								<div class="detail-item">
									<span class="detail-label">File Size</span>
									<span class="detail-value"
										>{game.formattedSize}</span
									>
								</div>
								<div class="detail-item">
									<span class="detail-label">Title ID</span>
									<div
										class="detail-value interactive"
										onclick={handleCopy}
										onkeydown={(e) =>
											(e.key === 'Enter' ||
												e.key === ' ') &&
											handleCopy(e)}
										role="button"
										tabindex="0"
									>
										<span>{id}</span>
										{#if isCopied}
											<span class="copy-feedback"
												>Copied!</span
											>
										{:else}
											<Icon
												icon="mdi:content-copy"
												class="copy-icon"
											/>
										{/if}
									</div>
								</div>
								{#if altNames.length > 0}
									<div class="detail-item">
										<span class="detail-label"
											>Also Known As</span
										>
										<ul class="alt-names-list">
											{#each altNames as alt}
												<li>{alt}</li>
											{/each}
										</ul>
									</div>
								{/if}
							</div>
						{/if}
					</div>

					{#if otherTitlesInGroup.length > 0}
						<div class="info-card" use:reveal>
							<h3 class="info-card-title">Other Regions</h3>
							<ul class="other-versions-list">
								{#each otherTitlesInGroup as title}
									{@const label = getRegionLabel(
										title.regions,
									)}
									<li>
										<a href={`/title/${title.id}`}>
											<span>{title.name}</span>
											<div class="other-title-meta">
												<span class="other-title-id"
													>{title.id}</span
												>
												{#if label}
													<span class="region-codes"
														>{label}</span
													>
												{/if}
											</div>
										</a>
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					{#if allContributors.length > 0}
						<div class="info-card" use:reveal>
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

		<CartridgeFocus open={focused} onclose={() => (focused = false)} handle={heroHandle} {name} bind:slot={focusSlot} />

		<BackToTop
			target={heroElement}
			iconUrl={game.iconUrl || game.bannerUrl}
			{name}
			fallback={!heroGl}
			bind:docked
			bind:dock={dockElement}
		/>
	</div>
	{/key}
{:else}
	<p class="loading-message">Loading title details...</p>
{/if}

{#if lightboxImage}
	<div
		class="lightbox"
		onclick={() => (lightboxImage = '')}
		onkeydown={(e) => e.key === 'Escape' && (lightboxImage = '')}
		transition:fade={{ duration: 150 }}
		role="presentation"
	>
		<img
			src={lightboxImage}
			alt="{name} screenshot"
			onclick={(e) => e.stopPropagation()}
			role="presentation"
		/>
	</div>
{/if}

{#if performanceHistory.length > 1}
	<PerformanceComparisonModal
		bind:show={showComparisonModal}
		{performanceHistory}
	/>
{/if}

<style>
	.page-container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 0 1.5rem 2rem;
	}

	/* The header: a panel of the game's own colours, with the cartridge standing on
	   its lower edge and reaching out of it. The room it needs below is the
	   margin; the cartridge's depth is drawn by the page's WebGL canvas, so it
	   can overlap the page without being clipped by the panel */
	.banner-header {
		position: relative;
		color: white;
		margin: 1.5rem 0 1.5rem;
		z-index: 10;
	}

	@media (min-width: 640px) {
		.banner-header {
			margin-bottom: 4.25rem;
		}
	}

	.banner-bg-wrapper {
		position: absolute;
		inset: 0;
		border-radius: var(--radius-lg);
		overflow: hidden;
		z-index: -1;
		background: color-mix(in srgb, var(--primary-color) 30%, #0c0d10);
	}

	.banner-image {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		transform: scale(1.25);
		filter: blur(26px) saturate(1.4) brightness(0.72);
	}

	/* Darker toward the bottom, and a pool of the theme's colour where the cartridge stands */
	.banner-overlay {
		position: absolute;
		inset: 0;
		background:
			radial-gradient(
				55% 95% at 17% 78%,
				color-mix(in srgb, var(--accent-color, var(--primary-color)) 45%, transparent),
				transparent 72%
			),
			linear-gradient(to top, rgba(0, 0, 0, 0.62), rgba(0, 0, 0, 0.06) 62%);
	}

	.header-content-wrapper {
		position: relative;
		padding: 1.5rem 1.25rem 1.75rem;
	}

	@media (min-width: 768px) {
		.header-content-wrapper {
			padding: 2.25rem 2.5rem 2.25rem;
		}
	}

	.header-content {
		display: grid;
		grid-template-columns: 1fr;
		justify-items: center;
		gap: 1.5rem;
	}

	@media (min-width: 640px) {
		.header-content {
			grid-template-columns: auto 1fr;
			justify-items: stretch;
			align-items: center;
			gap: 2.5rem;
		}
	}

	.hero-cart {
		position: relative;
		width: clamp(140px, 46vw, 190px);
		--cart-max: 100%;
	}

	@media (min-width: 640px) {
		.hero-cart {
			width: clamp(170px, 20vw, 210px);
			/* Reaches out of the bottom of the panel */
			align-self: end;
			margin-bottom: -3.25rem;
		}
	}

	.hero-info {
		min-width: 0;
		width: 100%;
	}

	.hero-info > * {
		animation: hero-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	.hero-info > :nth-child(2) { animation-delay: 0.06s; }
	.hero-info > :nth-child(3) { animation-delay: 0.12s; }
	.hero-info > :nth-child(4) { animation-delay: 0.18s; }

	@keyframes hero-rise {
		from { opacity: 0; transform: translateY(12px); }
		to { opacity: 1; transform: none; }
	}

	.eyebrow {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem 0.9rem;
		margin-bottom: 0.5rem;
	}

	.publisher-link {
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.82);
		text-decoration: none;
		transition: color 0.2s;
	}

	.publisher-link:hover {
		color: #fff;
		text-decoration: underline;
		text-underline-offset: 0.25em;
	}

	.hero-info h1 {
		margin: 0;
		font-size: clamp(2rem, 1.4rem + 2.6vw, 3.25rem);
		font-weight: 800;
		letter-spacing: -0.025em;
		line-height: 1.08;
		text-wrap: balance;
		text-shadow: 0 2px 12px rgba(0, 0, 0, 0.45);
		color: white;
	}

	.facts {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
		margin-top: 0.85rem;
		font-size: 0.95rem;
		color: rgba(255, 255, 255, 0.78);
	}

	/* A dot between the facts */
	.facts > span + span::before {
		content: '';
		display: inline-block;
		width: 0.25rem;
		height: 0.25rem;
		margin-right: 1rem;
		vertical-align: middle;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.45);
	}

	.hero-actions {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.6rem;
		margin-top: 1.25rem;
	}

	.hero-actions form {
		display: contents;
	}

	.pill {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		height: 2.5rem;
		padding: 0 1.05rem;
		font: inherit;
		font-size: 0.9rem;
		font-weight: 600;
		color: #fff;
		background: rgba(255, 255, 255, 0.12);
		border: 1px solid rgba(255, 255, 255, 0.22);
		border-radius: 999px;
		-webkit-backdrop-filter: blur(8px);
		backdrop-filter: blur(8px);
		cursor: pointer;
		transition: background 0.2s, transform 0.2s, border-color 0.2s;
	}

	.pill:hover {
		background: rgba(255, 255, 255, 0.2);
		transform: translateY(-1px);
	}

	.pill:active { transform: scale(0.97); }

	.pill.active {
		background: rgba(250, 204, 21, 0.18);
		border-color: rgba(250, 204, 21, 0.55);
		color: #fde68a;
	}

	@media (max-width: 440px) {
		.pill .long { display: none; }
	}

	.pill.icon-only {
		width: 2.5rem;
		padding: 0;
		justify-content: center;
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
		.content-column {
			order: 1;
		}
		.sidebar-column {
			order: 2;
		}
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
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		flex-wrap: wrap;
		gap: 1rem;
	}
	.section-title {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0;
	}

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
	.contribute-button:hover {
		background-color: var(--primary-color-hover);
	}

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

	.info-card-title.collapsible :global(.chevron) {
		transition: transform 0.2s ease-in-out;
		color: var(--text-secondary);
	}
	.info-card-title.collapsible :global(.chevron.rotated) {
		transform: rotate(180deg);
	}

	.info-card .details-list {
		margin-top: 1rem;
	}

	.details-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.detail-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.detail-label {
		font-size: 0.8rem;
		color: var(--text-secondary);
	}
	.detail-value {
		font-weight: 500;
	}
	.detail-value.interactive {
		display: flex;
		align-items: center;
		justify-content: space-between;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		margin: -0.25rem -0.5rem;
		border-radius: var(--radius-sm);
	}
	.detail-value.interactive:hover {
		background-color: var(--input-bg);
	}
	.detail-value :global(.copy-icon) {
		color: var(--text-secondary);
	}
	.copy-feedback {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--primary-color);
	}

	.alt-names-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.alt-names-list li {
		font-size: 0.9rem;
		color: var(--text-primary);
		line-height: 1.4;
		padding-bottom: 0.5rem;
		border-bottom: 1px dashed var(--border-color);
	}
	.alt-names-list li:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}

	.other-versions-list,
	.contributor-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.other-versions-list a,
	.contributor-list a {
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
	.other-title-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.1rem;
	}
	.other-title-id {
		font-size: 0.8rem;
		color: var(--text-secondary);
		font-weight: 400;
	}
	.region-codes {
		font-size: 0.75rem;
		color: var(--text-secondary);
		background-color: var(--input-bg);
		padding: 1px 4px;
		border-radius: 4px;
		border: 1px solid var(--border-color);
	}

	.notice-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		border-radius: var(--radius-md);
		border: 1px solid;
	}
	.targets-note {
		margin-top: 1rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}
	.targets-note p {
		flex: 1 1 18rem;
		margin: 0;
	}
	.targets-note .cta-group {
		margin: 0;
	}
	.notice-card.unreleased {
		background-color: #fffbeb;
		color: #b45309;
		border-color: #fde68a;
	}
	:global(.dark) .notice-card.unreleased {
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
	.no-data-cta h3 {
		margin: 0 0 0.5rem;
	}
	.no-data-cta p {
		max-width: 450px;
		margin: 0 auto 1.5rem;
		color: var(--text-secondary);
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

	.version-selector {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.version-selector label {
		font-size: 0.9rem;
		color: var(--text-secondary);
	}
	.version-selector select {
		background-color: var(--input-bg);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 6px 10px;
		font-size: 0.9rem;
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

	.pending-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		background-color: color-mix(in srgb, #f59e0b 15%, transparent);
		border: 1px solid #f59e0b;
		color: #f59e0b;
		padding: 4px 10px;
		border-radius: var(--radius-md);
		font-size: 0.8rem;
		font-weight: 600;
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
		border-radius: var(--radius-md);
		overflow: hidden;
		border: 1px solid var(--border-color);
		aspect-ratio: 16 / 9;
		
		-webkit-mask-image: -webkit-radial-gradient(white, black);
		mask-image: -webkit-radial-gradient(white, black);
		transform: translateZ(0);
	}
	.screenshot-button img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
		will-change: transform;
		transform: translateZ(0);
		backface-visibility: hidden;
	}
	.screenshot-button:hover img {
		transform: scale(1.05) translateZ(0);
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
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}
	.lightbox img {
		max-width: 90%;
		max-height: 90%;
		border-radius: var(--radius-md);
	}

	.cta-group {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.request-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 10px 20px;
		border-radius: var(--radius-md);
		font-weight: 600;
		cursor: pointer;
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		color: var(--text-secondary);
		transition: all 0.2s;
	}

	.request-button:hover {
		border-color: var(--primary-color);
		color: var(--primary-color);
	}

	.request-button.active {
		background-color: color-mix(in srgb, #f59e0b 10%, transparent);
		border-color: #f59e0b;
		color: #d97706;
	}
</style>
