<script>
	import Icon from '@iconify/svelte'
	import { invalidateAll } from '$app/navigation'
	import CartridgeItem from '../CartridgeItem.svelte'
	import ListPicker from '$lib/components/ListPicker.svelte'

	/** @type {import('./$types').PageProps} */
	let { data } = $props()

	const games = $derived(data.favoritedGames || [])
	const lists = $derived(data.lists || [])
	const signedIn = $derived(data.signedIn)

	/** 'all', or the ID of a list */
	let selected = $state('all')
	// A list that is gone (deleted here or elsewhere) is no longer the one selected
	$effect(() => {
		if (selected !== 'all' && !lists.some(l => l.id === selected)) selected = 'all'
	})

	const current = $derived(lists.find(l => l.id === selected) ?? null)
	const shown = $derived(current ? games.filter(g => current.gameIds.includes(g.id)) : games)

	// A few facts about what is on the shelf now, from the data we have on those games
	const fps = (/** @type {any} */ g, /** @type {'docked' | 'handheld'} */ mode) => String(g.performance?.[mode]?.target_fps ?? '')
	const glance = $derived({
		docked60: shown.filter(g => fps(g, 'docked') === '60').length,
		handheld60: shown.filter(g => fps(g, 'handheld') === '60').length,
		noData: shown.filter(g => !fps(g, 'docked') && !fps(g, 'handheld')).length
	})

	let newName = $state('')
	let adding = $state(false)
	let renaming = $state(false)
	let renameTo = $state('')
	let error = $state('')

	/** @param {string} url @param {string} method @param {any} [payload] */
	async function call (url, method, payload) {
		const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: payload ? JSON.stringify(payload) : undefined })
		return { ok: res.ok, data: await res.json().catch(() => ({})) }
	}

	async function makeList () {
		const name = newName.trim()
		if (!name) return
		error = ''
		const { ok, data: body } = await call('/api/v1/favorites/lists', 'POST', { name })
		if (!ok) { error = body.error ?? 'That did not save.'; return }
		newName = ''
		adding = false
		await invalidateAll()
		selected = body.list.id
	}

	function startRename () {
		renameTo = current?.name ?? ''
		renaming = true
		error = ''
	}

	async function rename () {
		if (!current) return
		const { ok, data: body } = await call(`/api/v1/favorites/lists/${current.id}`, 'PATCH', { name: renameTo })
		if (!ok) { error = body.error ?? 'That did not save.'; return }
		renaming = false
		await invalidateAll()
	}

	async function removeList () {
		if (!current) return
		if (!confirm(`Delete the list "${current.name}"? The games in it stay in your favorites.`)) return
		await call(`/api/v1/favorites/lists/${current.id}`, 'DELETE')
		selected = 'all'
		await invalidateAll()
	}
</script>

<svelte:head>
	<title>My Favorites - Switch Performance</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="page-container">
	<div class="page-header">
		<h1>My Favorites</h1>
		<p>
			{#if games.length}
				{games.length} {games.length === 1 ? 'game' : 'games'} you've saved{#if signedIn}, kept with your account{/if}.
			{:else}
				The games you've saved for later.
			{/if}
		</p>
	</div>

	{#if !signedIn}
		<aside class="sync">
			<div>
				<strong>Keep them with your account</strong>
				<p>Sign in with GitHub and your favorites follow you to any device, and you can sort them into lists. What you've starred here is carried over.</p>
			</div>
			<form action="/auth/signin/github" method="post">
				<input type="hidden" name="callbackUrl" value="/favorites" />
				<button type="submit" class="github"><Icon icon="mdi:github" width="18" /> Sign in with GitHub</button>
			</form>
		</aside>
	{/if}

	{#if signedIn}
		<div class="tabs" role="tablist" aria-label="Lists">
			<button role="tab" aria-selected={selected === 'all'} class:active={selected === 'all'} onclick={() => (selected = 'all')}>
				All <span class="n">{games.length}</span>
			</button>
			{#each lists as list (list.id)}
				<button role="tab" aria-selected={selected === list.id} class:active={selected === list.id} onclick={() => { selected = list.id; renaming = false }}>
					{list.name} <span class="n">{list.gameIds.length}</span>
				</button>
			{/each}
			{#if adding}
				<form class="new" onsubmit={(e) => { e.preventDefault(); makeList() }}>
					<input bind:value={newName} maxlength="40" placeholder="List name" aria-label="New list name" autocomplete="off" />
					<button type="submit" disabled={!newName.trim()}>Make</button>
					<button type="button" class="ghost" onclick={() => { adding = false; newName = ''; error = '' }} aria-label="Cancel"><Icon icon="mdi:close" width="16" /></button>
				</form>
			{:else}
				<button class="add" onclick={() => (adding = true)}><Icon icon="mdi:plus" width="16" /> New list</button>
			{/if}
		</div>
		{#if error}<p class="error" role="alert">{error}</p>{/if}

		{#if current}
			<div class="list-bar">
				{#if renaming}
					<form onsubmit={(e) => { e.preventDefault(); rename() }}>
						<input bind:value={renameTo} maxlength="40" aria-label="List name" />
						<button type="submit" disabled={!renameTo.trim()}>Save</button>
						<button type="button" class="ghost" onclick={() => (renaming = false)}>Cancel</button>
					</form>
				{:else}
					<h2>{current.name}</h2>
					<div class="actions">
						<button class="ghost" onclick={startRename}><Icon icon="mdi:pencil-outline" width="16" /> Rename</button>
						<button class="ghost danger" onclick={removeList}><Icon icon="mdi:trash-can-outline" width="16" /> Delete list</button>
					</div>
				{/if}
			</div>
		{/if}
	{/if}

	{#if shown.length > 0}
		<div class="glance" aria-label="At a glance">
			<span><strong>{glance.docked60}</strong> run at 60 FPS docked</span>
			<span><strong>{glance.handheld60}</strong> at 60 FPS handheld</span>
			{#if glance.noData > 0}<a href="/contribute"><strong>{glance.noData}</strong> still need data</a>{/if}
		</div>

		<!-- The games, standing on a shelf. Each is still a link to its page -->
		<div class="shelf">
			{#each shown as game, i (game.id)}
				<div class="slot">
					<CartridgeItem titleData={game} index={i} pose="angled" />
					{#if signedIn}
						<div class="lists-btn">
							<ListPicker gameId={game.id} gameName={game.names?.[0]} {lists} compact onchange={invalidateAll} />
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{:else if current}
		<div class="empty-state">
			<h3>Nothing in this list yet</h3>
			<p>Use the list button under a game in "All", or on its page, to put it here.</p>
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
		max-width: 960px;
		margin: 0 auto;
		padding: 1.5rem;
	}

	.page-header { margin-bottom: 1.75rem; text-align: center; }
	.page-header h1 { font-size: 2.5rem; margin: 0 0 0.5rem; }
	.page-header p { font-size: 1.05rem; color: var(--text-secondary); margin: 0; }

	.sync {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.25rem;
		flex-wrap: wrap;
		padding: 1rem 1.25rem;
		margin-bottom: 1.5rem;
		border: 1px solid var(--border-color);
		border-radius: 14px;
		background: var(--surface-color);
	}
	.sync p { margin: 0.2rem 0 0; font-size: 0.9rem; color: var(--text-secondary); max-width: 34rem; }
	.github { display: inline-flex; align-items: center; gap: 0.5rem; height: 2.5rem; padding: 0 1.1rem; border: 0; border-radius: 10px; background: #24292f; color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
	.github:hover { background: #32383f; }

	.tabs { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
	.tabs button {
		display: inline-flex; align-items: center; gap: 0.4rem;
		height: 2.2rem; padding: 0 0.9rem;
		border: 1px solid var(--border-color); border-radius: 999px;
		background: var(--surface-color); color: var(--text-secondary);
		font: inherit; font-size: 0.88rem; font-weight: 600; cursor: pointer;
	}
	.tabs button.active { color: var(--text-primary); border-color: var(--primary-color); background: color-mix(in srgb, var(--primary-color) 12%, var(--surface-color)); }
	.tabs .n { font-size: 0.75rem; opacity: 0.7; font-variant-numeric: tabular-nums; }
	.tabs .add { border-style: dashed; }
	.new { display: inline-flex; gap: 0.4rem; align-items: center; }
	.new input, .list-bar input { height: 2.2rem; padding: 0 0.7rem; border-radius: 10px; border: 1px solid var(--border-color); background: var(--input-bg); color: var(--text-primary); font: inherit; font-size: 0.88rem; }
	.new button, .list-bar form button { height: 2.2rem; padding: 0 0.9rem; border: 0; border-radius: 10px; background: var(--primary-color); color: var(--primary-action-text, #fff); font: inherit; font-weight: 700; font-size: 0.85rem; cursor: pointer; }
	.new button:disabled, .list-bar form button:disabled { opacity: 0.45; cursor: not-allowed; }
	.tabs .new button.ghost, .list-bar .ghost { background: none; border: 1px solid var(--border-color); color: var(--text-secondary); }
	.error { color: #dc2626; font-weight: 600; margin: 0 0 0.75rem; }

	.list-bar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
	.list-bar h2 { font-size: 1.4rem; margin: 0; }
	.list-bar form { display: flex; gap: 0.5rem; align-items: center; }
	.actions { display: flex; gap: 0.5rem; }
	.actions .ghost { display: inline-flex; align-items: center; gap: 0.4rem; height: 2.2rem; padding: 0 0.8rem; border-radius: 10px; font: inherit; font-size: 0.82rem; font-weight: 600; cursor: pointer; background: none; border: 1px solid var(--border-color); color: var(--text-secondary); }
	.actions .ghost:hover { color: var(--text-primary); }
	.actions .danger:hover { color: #dc2626; border-color: #dc2626; }

	.glance { display: flex; flex-wrap: wrap; gap: 0.4rem 1.5rem; padding: 0.75rem 0; font-size: 0.9rem; color: var(--text-secondary); border-top: 1px solid var(--border-color); }
	.glance strong { color: var(--text-primary); font-variant-numeric: tabular-nums; }
	.glance a { color: var(--primary-color); text-decoration: none; }
	.glance a:hover { text-decoration: underline; }

	.shelf {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
		column-gap: 1rem;
		row-gap: 3.25rem;
		padding: 1.5rem 0 0;
	}

	/* Each cartridge stands on its own piece of ledge, wide enough that the pieces
	   meet and read as one shelf along a row */
	.slot { position: relative; padding-bottom: 1.1rem; }

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
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 6px 12px -4px rgba(0, 0, 0, 0.25);
	}

	/* Under the ledge, out of the cartridge's way */
	.lists-btn { position: absolute; left: 50%; bottom: -2.3rem; translate: -50% 0; z-index: 10; }

	.empty-state { text-align: center; padding: 3rem 2rem; background-color: var(--surface-color); border-radius: var(--radius-lg); border: 2px dashed var(--border-color); }
	.empty-state h3 { font-size: 1.5rem; margin: 0 0 0.5rem; }
	.empty-state p { color: var(--text-secondary); max-width: 400px; margin: 0 auto 1.5rem; }
	.cta-button { display: inline-block; background-color: var(--primary-color); color: var(--primary-action-text); padding: 10px 20px; border-radius: var(--radius-md); font-weight: 600; text-decoration: none; }
</style>
