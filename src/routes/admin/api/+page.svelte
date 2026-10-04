<script>
	let { data } = $props()

	/** @param {string | Date} value */
	const when = (value) => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
	/** @param {{ subject: string, label: string }} u */
	const who = (u) => u.subject.startsWith('token:') ? (u.label || 'a token') : u.subject.replace(/^ip:/, '')
</script>

<svelte:head>
	<title>API usage</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="admin">
	<h1>API usage</h1>
	<p class="lede">
		Who is using the data API, most requests first. A caller is a token (shown
		as its owner and name) or, with none, an IP address. The site&rsquo;s own
		pages are not counted. Kept for {data.retainDays} days.
	</p>

	<nav class="range" aria-label="Period">
		{#each [1, 7, 30] as d (d)}
			<a href="?days={d}" class:active={data.days === d}>{d === 1 ? 'Today' : `${d} days`}</a>
		{/each}
	</nav>

	{#if data.users.length === 0}
		<p class="empty">Nobody has used it in this period.</p>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr><th>Who</th><th class="n">Requests</th><th class="n">Turned away</th><th class="n">Days</th><th>Last seen</th><th>User-Agent</th></tr>
				</thead>
				<tbody>
					{#each data.users as u (u.subject)}
						<tr>
							<td>
								<span class="kind">{u.subject.startsWith('token:') ? 'token' : 'ip'}</span>
								<strong>{who(u)}</strong>
							</td>
							<td class="n">{u.requests.toLocaleString()}</td>
							<td class="n" class:warn={u.limited > 0}>{u.limited.toLocaleString()}</td>
							<td class="n">{u.days}</td>
							<td>{when(u.lastSeen)}</td>
							<td class="ua">{u.userAgent || '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.admin { max-width: 1100px; margin: 0 auto; padding: 2.5rem 1.5rem; }
	h1 { font-size: 2rem; font-weight: 900; letter-spacing: -0.02em; margin: 0 0 0.75rem; }
	.lede { color: var(--text-secondary); max-width: 40rem; line-height: 1.6; margin: 0 0 1.5rem; }
	.range { display: flex; gap: 0.5rem; margin-bottom: 1.25rem; }
	.range a { padding: 0.4rem 0.9rem; border: 1px solid var(--border-color); border-radius: 99px; color: var(--text-secondary); text-decoration: none; font-size: 0.85rem; font-weight: 600; }
	.range a.active { color: var(--text-primary); border-color: var(--primary-color); }
	.table-wrap { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 12px; }
	table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
	th, td { text-align: left; padding: 0.65rem 0.9rem; vertical-align: top; }
	th { font: 800 0.68rem var(--font-mono, ui-monospace, monospace); letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-secondary); background: var(--surface-color); }
	tr + tr td { border-top: 1px solid var(--border-color); }
	.n { text-align: right; font-variant-numeric: tabular-nums; }
	.warn { color: #dc2626; font-weight: 700; }
	.kind { font: 700 0.65rem var(--font-mono, ui-monospace, monospace); letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-secondary); margin-right: 0.5rem; }
	.ua { color: var(--text-secondary); max-width: 22rem; overflow-wrap: anywhere; font-size: 0.8rem; }
	.empty { color: var(--text-secondary); }
</style>
