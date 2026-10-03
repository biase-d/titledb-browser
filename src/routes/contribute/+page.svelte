<script>
	import Icon from '@iconify/svelte'
	import ArtworkBackdrop from '$lib/components/ArtworkBackdrop.svelte'
	import CartridgeItem from '../CartridgeItem.svelte'
	import ContributorWall from '$lib/components/ContributorWall.svelte'
	import Coin from '$lib/components/Coin.svelte'
	import CountUp from '$lib/components/CountUp.svelte'
	import { reveal } from '$lib/actions/reveal'
	import { goto } from '$app/navigation'
	import { page } from '$app/state'
	import { tick } from 'svelte'
	import { fade } from 'svelte/transition'

	let { data } = $props()

	let games = $derived(data.games || [])
	let pagination = $derived(data.pagination)
	let session = $derived(data.session)
	let sortBy = $derived(data.sortBy)
	let impactStats = $derived(data.impactStats || {})

	let pageHeader

	async function changePage (newPage) {
		const url = new URL(page.url)
		url.searchParams.set('page', newPage.toString())
		await goto(url.toString(), { noScroll: true })
		window.scrollTo({ top: 0, behavior: 'smooth' })
		await tick()
		pageHeader?.focus()
	}

	let progress = $derived(data.progress)
	let coveragePct = $derived(Math.round((impactStats.coverage || 0) * 1000) / 10)
	let missing = $derived((impactStats.groups || 0) - (impactStats.groupsWithData || 0))

	const standIn = { id: 'ghost', names: [''], regions: [], publisher: null, performance: {}, ghostCopy: { band: 'YOUR DATA', glyph: 'plus' } }

	const steps = [
		{ icon: 'mdi:gamepad-variant', title: 'Play', text: 'Pick a game you know and note its frame rate and resolution.' },
		{ icon: 'mdi:form-select', title: 'Fill the form', text: 'The cartridge beside it fills in as you type.' },
		{ icon: 'mdi:source-pull', title: 'We open the pull request', text: 'It is reviewed and, once merged, the data goes live with your name on it.' }
	]
</script>

<svelte:head>
	<title>Contribute - Switch Performance</title>
	<meta
		name="description"
		content="Help build the most comprehensive Nintendo Switch performance database. Contribute FPS data, resolution details, and graphics settings for games."
	/>
	<link rel="canonical" href="{page.url.origin}/contribute" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="{page.url.origin}/contribute" />
	<meta property="og:title" content="Contribute - Switch Performance" />
	<meta
		property="og:description"
		content="Help build the most comprehensive Nintendo Switch performance database. Contribute FPS data, resolution details, and graphics settings for games."
	/>
	<meta property="og:site_name" content="Switch Performance" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Contribute - Switch Performance" />
	<meta
		name="twitter:description"
		content="Help build the most comprehensive Nintendo Switch performance database. Contribute FPS data, resolution details, and graphics settings for games."
	/>
</svelte:head>

<div class="contribute-page" bind:this={pageHeader} tabindex="-1">
	<section class="hero">
		<div class="hero-inner">
			<div class="hero-text">
				<p class="eyebrow">Community driven</p>
				<h1>Fill in the <span class="accent">empty cartridges</span></h1>
				<p class="lede">
					{#if session?.user && progress}
						Welcome back, {session.user.name || session.user.login}. Pick a game below, or add something for a title you already know.
					{:else}
						Every game here is waiting for someone who has played it. A few numbers from you help everyone pick the best way to play.
					{/if}
				</p>

				<dl class="facts">
					<div>
						<dt>Games covered</dt>
						<dd><CountUp value={coveragePct} decimals={1} suffix="%" /></dd>
					</div>
					<div>
						<dt>Contributors</dt>
						<dd><CountUp value={impactStats.totalContributors || 0} /></dd>
					</div>
					<div>
						<dt>Contributions</dt>
						<dd><CountUp value={impactStats.totalUpdates || 0} /></dd>
					</div>
					<div>
						<dt>Still empty</dt>
						<dd><CountUp value={missing} /></dd>
					</div>
				</dl>
				<div class="coverage" role="img" aria-label="{coveragePct}% of games have data">
					<span style="width: {coveragePct}%"></span>
				</div>
			</div>

			<div class="hero-cart" aria-hidden="true">
				<div class="cart"><CartridgeItem titleData={standIn} hero ghost /></div>
				<div class="slot"></div>
			</div>
		</div>
	</section>

	<main class="main-content">
		<ContributorWall people={impactStats.topContributors} />

		{#if !session?.user}
			<ol class="steps" use:reveal>
				{#each steps as step, i (step.title)}
					<li>
						<span class="step-n">{i + 1}</span>
						<Icon icon={step.icon} />
						<h3>{step.title}</h3>
						<p>{step.text}</p>
					</li>
				{/each}
			</ol>

			<div class="auth-promo" in:fade={{ duration: 600 }}>
				<ArtworkBackdrop artwork={data.artwork ?? []} />
				<div class="promo-content">
					<h2>Start your collection</h2>
					<p>
						Sign in with GitHub to submit data, earn badges, and see
						your contributions on your profile. Nothing is posted
						until you submit.
					</p>
					<form action="/auth/signin/github" method="post">
						<button type="submit" class="github-btn">
							<Icon icon="mdi:github" />
							<span>Sign in with GitHub</span>
						</button>
					</form>
				</div>
			</div>
		{:else}
			{#if progress}
				<section class="mine" use:reveal>
					<div class="mine-count">
						{#if progress.current}<Coin badge={progress.current} size="2.6rem" />{/if}
						<span class="mine-n"><CountUp value={progress.total} /></span>
						<span class="mine-l">your contributions</span>
					</div>
					<div class="mine-next">
						{#if progress.next}
							<p>
								<strong>{progress.remaining}</strong> more for
								<strong>{progress.next.name}</strong>
								{#if progress.current}<span class="soft"> · now {progress.current.name}</span>{/if}
							</p>
							<div class="coverage" role="img" aria-label="{Math.round(progress.fraction * 100)}% of the way to {progress.next.name}">
								<span style="width: {Math.round(progress.fraction * 100)}%"></span>
							</div>
						{:else}
							<p><strong>{progress.current?.name}</strong> — every badge earned. Thank you.</p>
						{/if}
					</div>
				</section>
			{/if}

			<div class="view-header">
				<div class="view-title">
					<h2>Help wanted</h2>
					<p>Games with no performance or graphics data yet</p>
				</div>
				<div class="sort-group" role="group" aria-label="Order">
					<button
						class="sort-pill"
						class:active={sortBy !== 'requests'}
						onclick={() => {
							const url = new URL(page.url)
							url.searchParams.set('sort', 'default')
							url.searchParams.set('page', '1')
							goto(url.toString())
						}}
					>
						<Icon icon="mdi:sort-variant" />
						<span>Newest</span>
					</button>
					<button
						class="sort-pill"
						class:active={sortBy === 'requests'}
						onclick={() => {
							const url = new URL(page.url)
							url.searchParams.set('sort', 'requests')
							url.searchParams.set('page', '1')
							goto(url.toString())
						}}
					>
						<Icon icon="mdi:fire" />
						<span>Most requested</span>
					</button>
				</div>
			</div>

			{#if games.length > 0}
				<div class="shelf">
					{#each games as game, i (game.id)}
						<div class="shelf-slot">
							<CartridgeItem
								titleData={{ ...game, publisher: null, performance: {} }}
								index={i}
								pose="angled"
								href={`/contribute/${game.id}`}
							/>
							{#if Number(game.requestCount) > 0}
								<span class="wanted"><Icon icon="mdi:fire" />{game.requestCount} {Number(game.requestCount) === 1 ? 'request' : 'requests'}</span>
							{/if}
						</div>
					{/each}
				</div>

				{#if pagination && pagination.totalPages > 1}
					<nav class="premium-pagination">
						<button class="page-btn" disabled={pagination.currentPage <= 1} onclick={() => changePage(pagination.currentPage - 1)}>
							<Icon icon="mdi:chevron-left" /><span>Prev</span>
						</button>
						<div class="page-indicator">
							<span class="current">{pagination.currentPage}</span>
							<span class="total">/ {pagination.totalPages}</span>
						</div>
						<button class="page-btn" disabled={pagination.currentPage >= pagination.totalPages} onclick={() => changePage(pagination.currentPage + 1)}>
							<span>Next</span><Icon icon="mdi:chevron-right" />
						</button>
					</nav>
				{/if}
			{:else}
				<div class="all-clear" in:fade>
					<div class="clear-icon"><Icon icon="mdi:check-decagram" /></div>
					<h3>Every game has data</h3>
					<p>Check back when new releases arrive.</p>
				</div>
			{/if}
		{/if}
	</main>
</div>

<style>
	.contribute-page { min-height: 100vh; background: var(--background-color); }
	.contribute-page:focus { outline: none; }

	.hero {
		padding: 3.5rem 1.5rem 4.5rem;
		background: radial-gradient(circle at 15% 20%, color-mix(in srgb, var(--primary-color) 14%, transparent), transparent 55%), #0d1117;
		color: #fff;
	}
	.hero-inner {
		max-width: 1000px;
		margin: 0 auto;
		display: grid;
		gap: 2.5rem;
		align-items: center;
	}
	.eyebrow {
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--primary-color);
		margin-bottom: 0.75rem;
	}
	h1 {
		color: #fff;
		font-size: clamp(2.2rem, 6vw, 3.4rem);
		font-weight: 900;
		line-height: 1.08;
		letter-spacing: -0.03em;
		margin-bottom: 1rem;
	}
	.accent { color: var(--primary-color); }
	.lede { color: rgba(255, 255, 255, 0.7); font-size: 1.1rem; line-height: 1.6; max-width: 34rem; margin-bottom: 2rem; }

	.facts { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem 1.5rem; margin-bottom: 1rem; }
	.facts dt { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255, 255, 255, 0.45); }
	.facts dd { font-size: 1.9rem; font-weight: 800; font-variant-numeric: tabular-nums; }

	.coverage { height: 6px; border-radius: 99px; background: rgba(255, 255, 255, 0.12); overflow: hidden; }
	.coverage span { display: block; height: 100%; border-radius: inherit; background: var(--primary-color); transition: width 0.8s cubic-bezier(0.2, 0.7, 0.2, 1); }

	.hero-cart { position: relative; width: 8rem; margin: 0 auto; padding-bottom: 1.6rem; }
	.cart { position: relative; z-index: 1; --cart-max: 100%; }
	.slot {
		position: absolute; left: -1rem; right: -1rem; bottom: 0; height: 1rem;
		border: 2px dashed rgba(255, 255, 255, 0.35); border-radius: 999px;
	}

	@media (min-width: 760px) {
		.hero-inner { grid-template-columns: 1fr 12rem; }
		.hero-cart { width: 10rem; }
		.facts { grid-template-columns: repeat(4, auto); justify-content: start; gap: 1rem 2rem; }
	}

	.main-content { max-width: 1000px; margin: 0 auto 5rem; padding: 2.5rem 1.5rem 0; }

	.steps { list-style: none; padding: 0; display: grid; gap: 1rem; margin-bottom: 2.5rem; }
	.steps li { position: relative; padding: 1.25rem; border: 1px solid var(--border-color); border-radius: 16px; background: var(--surface-color); font-size: 1.5rem; color: var(--primary-color); }
	.steps h3 { font-size: 1rem; color: var(--text-primary); margin: 0.5rem 0 0.25rem; }
	.steps p { font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; }
	.step-n { position: absolute; top: 1rem; right: 1.25rem; font-size: 0.8rem; font-weight: 800; color: var(--text-secondary); }
	@media (min-width: 700px) { .steps { grid-template-columns: repeat(3, 1fr); } }

	.auth-promo { position: relative; background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15); }
	.auth-promo > :global(*:not(.backdrop)) { position: relative; z-index: 1; }
	.promo-content { padding: 2.5rem 2rem; max-width: 34rem; }
	.promo-content h2 { font-size: 1.8rem; font-weight: 800; margin-bottom: 0.5rem; }
	.promo-content p { color: var(--text-secondary); line-height: 1.6; margin-bottom: 1.5rem; }
	.github-btn { display: inline-flex; align-items: center; gap: 0.6rem; padding: 0.8rem 1.4rem; border-radius: 12px; border: none; background: #24292f; color: #fff; font-weight: 700; font-size: 1rem; cursor: pointer; }
	.github-btn:hover { background: #32383f; }

	.mine { display: grid; gap: 1rem; align-items: center; padding: 1.25rem 1.5rem; margin-bottom: 2.5rem; border: 1px solid var(--border-color); border-radius: 16px; background: var(--surface-color); }
	.mine-count { display: flex; align-items: baseline; gap: 0.6rem; }
	.mine-n { font-size: 2.4rem; font-weight: 900; color: var(--primary-color); font-variant-numeric: tabular-nums; }
	.mine-l { color: var(--text-secondary); font-size: 0.9rem; }
	.mine-next p { margin-bottom: 0.5rem; font-size: 0.95rem; }
	.soft { color: var(--text-secondary); }
	.mine .coverage { background: var(--input-bg, rgba(127, 127, 127, 0.2)); }
	@media (min-width: 700px) { .mine { grid-template-columns: auto 1fr; gap: 2.5rem; } }

	.view-header { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; align-items: end; margin-bottom: 0.5rem; }
	.view-title h2 { font-size: 1.5rem; font-weight: 800; }
	.view-title p { color: var(--text-secondary); font-size: 0.9rem; }
	.sort-group { display: flex; gap: 0.5rem; }
	.sort-pill { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.9rem; border-radius: 99px; border: 1px solid var(--border-color); background: var(--surface-color); color: var(--text-secondary); font-weight: 600; font-size: 0.85rem; cursor: pointer; }
	.sort-pill.active { color: var(--text-primary); border-color: var(--primary-color); }

	/* Cartridges stand on one continuous ledge per row: the slots touch, so the
	   strips beneath them join up, and the request count sits just under it */
	.shelf { display: grid; grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr)); column-gap: 0; row-gap: 1.25rem; padding-top: 1.5rem; }
	.shelf-slot { position: relative; padding: 0 0.6rem 2.1rem; }
	.shelf-slot::after {
		content: ''; position: absolute; left: 0; right: 0; bottom: 1.25rem; height: 0.7rem;
		background: linear-gradient(180deg, color-mix(in srgb, var(--text-secondary) 14%, var(--surface-color)) 0 18%, color-mix(in srgb, var(--text-secondary) 30%, var(--surface-color)) 18% 100%);
		box-shadow: 0 8px 12px -8px rgba(0, 0, 0, 0.35);
		z-index: 0;
	}
	.shelf-slot :global(.cell) { position: relative; z-index: 1; }
	.wanted { position: absolute; left: 0; right: 0; bottom: 0; display: flex; justify-content: center; align-items: center; gap: 0.25rem; font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); }

	/* --- Pagination --- */
	.premium-pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 2rem;
		margin-top: 4rem;
	}

	.page-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 10px 20px;
		border-radius: 12px;
		background: var(--surface-color);
		border: 1px solid var(--border-color);
		color: var(--text-primary);
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s;
	}

	.page-btn:hover:not(:disabled) {
		border-color: var(--primary-color);
		background: var(--input-bg);
	}

	.page-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.page-indicator {
		display: flex;
		align-items: baseline;
		gap: 0.25rem;
	}

	.current {
		font-size: 1.5rem;
		font-weight: 900;
		color: var(--primary-color);
	}

	.total {
		font-size: 0.9rem;
		color: var(--text-secondary);
		font-weight: 600;
	}

	/* --- All Clear --- */
	.all-clear {
		text-align: center;
		padding: 5rem 2rem;
		background: var(--surface-color);
		border-radius: 32px;
		border: 2px dashed var(--border-color);
	}

	.clear-icon {
		font-size: 4rem;
		color: #10b981;
		margin-bottom: 1.5rem;
	}

	.all-clear h3 {
		font-size: 2rem;
		margin-bottom: 0.75rem;
	}

	.all-clear p {
		color: var(--text-secondary);
		font-size: 1.1rem;
		max-width: 400px;
		margin: 0 auto;
	}
</style>
