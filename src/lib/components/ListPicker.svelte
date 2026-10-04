<script>
	import Icon from '@iconify/svelte'
	import { tick } from 'svelte'
	import { fade, scale } from 'svelte/transition'

	/**
	 * Puts one game in the person's lists (and makes a new list for it). Opens as
	 * a dialog in the middle of the screen, not as a pop-over beside its button,
	 * because the cartridges are drawn on a canvas above the page and would cover
	 * anything that opened next to one
	 *
	 * Gets the lists itself when it opens, unless the page already has them
	 *
	 * @type {{
	 *   gameId: string,
	 *   gameName?: string,
	 *   lists?: Array<{ id: string, name: string, gameIds: string[] }> | null,
	 *   label?: string,
	 *   compact?: boolean,
	 *   onchange?: () => void
	 * }}
	 */
	let { gameId, gameName = '', lists: given = null, label = 'Lists', compact = false, onchange = undefined } = $props()

	let open = $state(false)
	let loading = $state(false)
	/** @type {Array<{ id: string, name: string, gameIds: string[] }>} */
	let lists = $state([])
	let signedIn = $state(true)
	let newName = $state('')
	let error = $state('')
	let busy = $state(false)
	/** @type {HTMLInputElement | undefined} */
	let nameInput = $state()
	/** @type {HTMLButtonElement | undefined} */
	let trigger = $state()

	/** @param {string} url @param {string} method @param {any} [payload] */
	async function call (url, method, payload) {
		const res = await fetch(url, {
			method,
			headers: { 'content-type': 'application/json' },
			body: payload ? JSON.stringify(payload) : undefined
		})
		const data = await res.json().catch(() => ({}))
		return { ok: res.ok, status: res.status, data }
	}

	async function show () {
		open = true
		error = ''
		if (given) {
			lists = structuredClone($state.snapshot(given))
			return
		}
		loading = true
		try {
			const { data } = await call('/api/v1/favorites', 'GET')
			signedIn = !!data.signedIn
			lists = data.lists ?? []
		} catch {
			error = 'Could not load your lists.'
		} finally {
			loading = false
		}
	}

	function close () {
		open = false
		trigger?.focus()
	}

	/** @param {{ id: string, gameIds: string[] }} list */
	const isIn = (list) => list.gameIds.includes(gameId)

	/** @param {{ id: string, gameIds: string[] }} list */
	async function toggle (list) {
		if (busy) return
		busy = true
		error = ''
		const adding = !isIn(list)
		const { ok, data } = await call(`/api/v1/favorites/lists/${list.id}/items`, adding ? 'POST' : 'DELETE', { gameId })
		busy = false
		if (!ok) { error = data.error ?? 'That did not save.'; return }
		list.gameIds = adding ? [...list.gameIds, gameId] : list.gameIds.filter(id => id !== gameId)
		lists = [...lists]
		onchange?.()
	}

	async function make () {
		const name = newName.trim()
		if (!name || busy) return
		busy = true
		error = ''
		const made = await call('/api/v1/favorites/lists', 'POST', { name })
		if (!made.ok) { busy = false; error = made.data.error ?? 'That did not save.'; return }
		// A new list from here is for this game, so it goes straight in
		const list = made.data.list
		const added = await call(`/api/v1/favorites/lists/${list.id}/items`, 'POST', { gameId })
		busy = false
		if (added.ok) list.gameIds = [gameId]
		lists = [...lists, list]
		newName = ''
		onchange?.()
	}

	/** @param {KeyboardEvent} e */
	function key (e) {
		if (e.key === 'Escape') { e.stopPropagation(); close() }
	}

	/** @param {HTMLElement} node */
	function portal (node) {
		document.body.appendChild(node)
		return {
			destroy () {
				if (node.parentNode) node.parentNode.removeChild(node)
			}
		}
	}

	$effect(() => {
		if (open) tick().then(() => nameInput?.focus())
	})
</script>

<button
	bind:this={trigger}
	type="button"
	class="trigger"
	class:compact
	onclick={show}
	aria-haspopup="dialog"
	aria-label="{label}{gameName ? ` for ${gameName}` : ''}"
>
	<Icon icon="mdi:playlist-star" width={compact ? 18 : 20} height={compact ? 18 : 20} />
	{#if !compact}<span>{label}</span>{/if}
</button>

{#if open}
	<div use:portal>
		<div class="backdrop" role="presentation" onclick={close} transition:fade={{ duration: 150 }}></div>
		<div
			class="dialog"
			role="dialog"
			aria-modal="true"
			aria-label="Add {gameName || 'this game'} to a list"
			tabindex="-1"
			onkeydown={key}
			transition:scale={{ start: 0.96, duration: 160 }}
		>
		<header>
			<h2>Add to a list</h2>
			{#if gameName}<p class="game">{gameName}</p>{/if}
			<button type="button" class="x" onclick={close} aria-label="Close"><Icon icon="mdi:close" width="20" /></button>
		</header>

		{#if loading}
			<p class="note">Loading…</p>
		{:else if !signedIn}
			<p class="note">Sign in with GitHub to organise your favorites into lists.</p>
			<form action="/auth/signin/github" method="post">
				<input type="hidden" name="callbackUrl" value="/favorites" />
				<button type="submit" class="primary"><Icon icon="mdi:github" width="18" /> Sign in with GitHub</button>
			</form>
		{:else}
			{#if lists.length}
				<ul>
					{#each lists as list (list.id)}
						<li>
							<label>
								<input type="checkbox" checked={isIn(list)} disabled={busy} onchange={() => toggle(list)} />
								<span class="name">{list.name}</span>
								<span class="count">{list.gameIds.length}</span>
							</label>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="note">You have no lists yet. Make one below, and this game goes into it.</p>
			{/if}

			<form class="make" onsubmit={(e) => { e.preventDefault(); make() }}>
				<input bind:this={nameInput} bind:value={newName} maxlength="40" placeholder="New list, such as Playing now" autocomplete="off" aria-label="New list name" />
				<button type="submit" class="primary" disabled={!newName.trim() || busy}>Make list</button>
			</form>
			<p class="soft">Putting a game in a list also adds it to your favorites.</p>
		{/if}

		{#if error}<p class="error" role="alert">{error}</p>{/if}
	</div>
	</div>
{/if}

<style>
	.trigger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		height: 2.5rem;
		padding: 0 1.05rem;
		font: inherit;
		font-size: 0.9rem;
		font-weight: 600;
		color: inherit;
		background: rgba(255, 255, 255, 0.12);
		border: 1px solid rgba(255, 255, 255, 0.22);
		border-radius: 999px;
		cursor: pointer;
		transition: background 0.2s, transform 0.2s;
	}
	.trigger:hover { background: rgba(255, 255, 255, 0.2); transform: translateY(-1px); }
	.trigger.compact { height: 2rem; width: 2rem; padding: 0; background: var(--surface-color); color: var(--text-secondary); border-color: var(--border-color); }
	.trigger.compact:hover { color: var(--primary-color); }

	/* Above the cartridge canvas (40) and the header (50) */
	.backdrop { position: fixed; inset: 0; z-index: 90; background: rgba(0, 0, 0, 0.45); }
	.dialog {
		position: fixed;
		z-index: 91;
		left: 50%;
		top: 50%;
		translate: -50% -50%;
		width: min(24rem, calc(100vw - 2rem));
		max-height: calc(100vh - 3rem);
		overflow-y: auto;
		padding: 1.25rem;
		border-radius: 18px;
		background: var(--surface-color);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
	}

	header { position: relative; margin-bottom: 1rem; padding-right: 2rem; }
	h2 { font-size: 1.15rem; font-weight: 800; margin: 0; }
	.game { margin: 0.2rem 0 0; font-size: 0.85rem; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.x { position: absolute; right: -0.4rem; top: -0.4rem; display: grid; place-items: center; width: 2rem; height: 2rem; border: 0; background: none; color: var(--text-secondary); cursor: pointer; border-radius: 8px; }
	.x:hover { background: var(--input-bg); color: var(--text-primary); }

	ul { list-style: none; padding: 0; margin: 0 0 1rem; display: flex; flex-direction: column; gap: 0.15rem; }
	label { display: flex; align-items: center; gap: 0.7rem; padding: 0.55rem 0.5rem; border-radius: 10px; cursor: pointer; }
	label:hover { background: var(--input-bg); }
	input[type='checkbox'] { width: 1.1rem; height: 1.1rem; accent-color: var(--primary-color); }
	.name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
	.count { font-size: 0.8rem; color: var(--text-secondary); font-variant-numeric: tabular-nums; }

	.make { display: flex; gap: 0.5rem; }
	.make input { flex: 1; min-width: 0; height: 2.5rem; padding: 0 0.75rem; border-radius: 10px; border: 1px solid var(--border-color); background: var(--input-bg); color: var(--text-primary); font: inherit; font-size: 0.9rem; }
	.primary { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; height: 2.5rem; padding: 0 1rem; border: 0; border-radius: 10px; background: var(--primary-color); color: var(--primary-action-text, #fff); font: inherit; font-weight: 700; font-size: 0.9rem; cursor: pointer; white-space: nowrap; }
	.primary:disabled { opacity: 0.45; cursor: not-allowed; }
	.note { color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5; margin: 0 0 1rem; }
	.soft { color: var(--text-secondary); font-size: 0.78rem; margin: 0.7rem 0 0; }
	.error { color: #dc2626; font-size: 0.85rem; font-weight: 600; margin: 0.75rem 0 0; }
</style>
