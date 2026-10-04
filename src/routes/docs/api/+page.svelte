<script>
	import { page } from '$app/state'
	import { enhance } from '$app/forms'
	import Icon from '@iconify/svelte'

	/**
	 * Documentation for the public API. Written by hand against the handlers in
	 * src/routes/api, with response shapes taken from real responses. Examples use
	 * made-up games, so they do not claim anything about a real title
	 */

	let { data, form } = $props()

	const origin = $derived(page.url.origin)
	const user = $derived(data.session?.user)


	/** @typedef {{ name: string, type: string, desc: string, required?: boolean }} Param */

	/** @type {Array<{ id: string, path: string, title: string, summary: string, params?: Param[], notes?: string[], request: string, response: string, status?: string }>} */
	const endpoints = [
		{
			id: 'games-list',
			path: '/api/v1/games',
			title: 'List and search games',
			summary: 'Games with the newest performance profile of each, a page at a time. With no filters it is the whole library, newest first.',
			params: [
				{ name: 'q', type: 'string', desc: 'Words from a name (every word must match, ignoring accents and case), or a 16-digit title ID for an exact match.' },
				{ name: 'page', type: 'integer', desc: 'Page number, from 1.' },
				{ name: 'sort', type: 'string', desc: 'relevance-desc (the default with q), date-desc (the default without), name-asc, or size-desc.' },
				{ name: 'publisher', type: 'string', desc: 'Only this publisher (case and accent insensitive, whole name).' },
				{ name: 'docked_fps', type: 'string', desc: 'Only games whose newest profile targets this frame rate when docked, such as 30 or 60.' },
				{ name: 'handheld_fps', type: 'string', desc: 'The same for handheld.' },
				{ name: 'res_type', type: 'string', desc: 'Only games whose resolution is of this type, such as Fixed or Dynamic.' },
				{ name: 'region', type: 'string', desc: 'The country whose name and artwork to prefer, as a 2-letter code. Defaults to US.' },
				{ name: 'region_filter', type: 'string', desc: 'Only games released in this country (a 2-letter code), or in a whole region: Europe, Asia or Americas.' }
			],
			request: 'GET /api/v1/games?q=example&sort=name-asc&page=1',
			response: `{
  "results": [
    {
      "id": "0100000000010000",
      "groupId": "0100000000010000",
      "names": ["Example Game"],
      "regions": ["US", "GB"],
      "iconUrl": "https://img-eshop.cdn.nintendo.net/…",
      "bannerUrl": "https://img-eshop.cdn.nintendo.net/…",
      "publisher": "Example Publisher",
      "releaseDate": 20200301,
      "lastUpdated": "2026-10-03T14:18:07.925Z",
      "sizeInBytes": 4200000000,
      "performance": {
        "docked":   { "resolution": "1920x1080", "target_fps": 30, "fps_behavior": "Locked", "resolution_type": "Fixed" },
        "handheld": { "resolution": "1280x720",  "target_fps": 30, "fps_behavior": "Stable", "resolution_type": "Fixed" }
      }
    }
  ],
  "pagination": { "currentPage": 1, "totalPages": 3, "totalItems": 112 }
}`,
			notes: ['A page holds a fixed number of games. Read pagination.totalPages to know how many pages there are.', 'performance is the newest profile of the game, or empty when there is none.']
		},
		{
			id: 'games-one',
			path: '/api/v1/games/{id}',
			title: 'One game',
			summary: 'Everything held about a title: its details, its graphics settings, and every performance profile, newest version first. Data for the other titles that share its group (other regions, editions) is included.',
			params: [{ name: 'id', type: 'string', required: true, desc: 'A 16-digit title ID, in the path. Upper or lower case.' }],
			request: 'GET /api/v1/games/0100000000010000',
			response: `{
  "id": "0100000000010000",
  "groupId": "0100000000010000",
  "names": ["Example Game"],
  "regions": ["US", "GB"],
  "publisher": "Example Publisher",
  "releaseDate": 20200301,
  "sizeInBytes": 4200000000,
  "iconUrl": "…",
  "bannerUrl": "…",
  "screenshots": ["…"],
  "lastUpdated": "2026-10-03T14:18:07.925Z",
  "graphics": {
    "groupId": "0100000000010000",
    "settings": { },
    "contributor": ["someone"],
    "status": "approved"
  },
  "performanceHistory": [
    {
      "gameVersion": "1.2.0",
      "suffix": "",
      "profiles": {
        "docked":   { "resolution": "1920x1080", "target_fps": 30, "fps_behavior": "Locked", "resolution_type": "Fixed" },
        "handheld": { "resolution": "1280x720",  "target_fps": 30, "fps_behavior": "Stable", "resolution_type": "Fixed" }
      },
      "contributor": ["someone"],
      "sourcePrUrl": "https://github.com/biase-d/nx-performance/pull/…",
      "lastUpdated": "2026-10-03T20:25:38.127Z"
    }
  ],
  "contributor": ["someone"],
  "seo": { }
}`,
			notes: ['404 when the ID is unknown.', 'graphics is null when there are no settings for the game. seo is for the site\'s own pages and is not a stable part of the API.']
		},
		{
			id: 'games-search',
			path: '/api/v1/games/search',
			title: 'Quick search',
			summary: 'A short list of matches for as-you-type search: just the ID, the first name and the group.',
			params: [{ name: 'q', type: 'string', required: true, desc: 'At least three characters. Shorter, and the answer is an empty list.' }],
			request: 'GET /api/v1/games/search?q=exam',
			response: `[
  { "id": "0100000000010000", "name": "Example Game", "groupId": "0100000000010000" }
]`,
			notes: ['It takes the same filters as the list above, but only the first page is useful here. Use the list endpoint for anything more.']
		},
		{
			id: 'stats',
			path: '/api/v1/stats',
			title: 'Library statistics',
			summary: 'The numbers behind the Insights page: how much of the library has data, frame-rate tallies, contributors, requests, and the timeline. Every figure follows the filters.',
			params: [
				{ name: 'region', type: 'string', desc: 'A 2-letter country code: only games released there, and the contributions to them.' },
				{ name: 'publisher', type: 'string', desc: 'Only this publisher.' },
				{ name: 'year', type: 'integer', desc: 'Only games released this year.' },
				{ name: 'sizeBucket', type: 'string', desc: 'Only games in this download size, as it is labelled on the page: <100MB, 100-200MB, … 15-20GB, >20GB.' }
			],
			request: 'GET /api/v1/stats?region=US',
			response: `{
  "kpis": {
    "titles": 6300, "groups": 6100, "publishers": 410, "totalSize": 59325000000000,
    "profiles": 3700, "graphics": 2100, "videos": 1200,
    "groupsWithData": 3800, "coverage": 0.62,
    "contributors": 150, "contributions": 4300, "requests": 1200, "favorites": 90
  },
  "regions": [{ "code": "US", "titles": 5200 }],
  "releasesByYear": [{ "year": 2020, "count": 840 }],
  "topPublishers": [{ "publisher": "Example Publisher", "count": 120 }],
  "sizeDistribution": [{ "bucket": "1-2GB", "count": 700 }],
  "performance": {
    "sampled": 3700,
    "dockedFps": [{ "label": "30", "count": 2100 }],
    "handheldFps": [{ "label": "30", "count": 2300 }],
    "resolutionTypes": [{ "label": "Dynamic", "count": 1500 }]
  },
  "activityByMonth": [{ "month": "2026-09", "count": 120 }],
  "topContributors": [{ "name": "someone", "contributions": 95, "groups": 80 }],
  "topRequested": [{ "gameId": "…", "name": "…", "count": 12 }],
  "topFavorited": [{ "gameId": "…", "name": "…", "count": 9 }],
  "filteredGames": [],
  "activeFilters": { "region": "US", "publisher": null, "year": null, "sizeBucket": null }
}`,
			notes: ['coverage is the share of title groups with a performance profile or graphics settings, from 0 to 1.', 'A contribution is one pull request, however many files it touched. Names are matched ignoring case.']
		},
		{
			id: 'image',
			path: '/api/v1/proxy/image',
			title: 'Image proxy',
			summary: 'Fetches a cover or banner, resizes it and returns it as WebP. This is how the site serves artwork: cached, at a size that fits.',
			params: [
				{ name: 'url', type: 'string', required: true, desc: 'The image address, https only, from raw.githubusercontent.com or a Nintendo domain (nintendo.net, nintendo.com). Anything else is refused with 403.' },
				{ name: 'w', type: 'integer', desc: 'Width in pixels. The image is never enlarged.' },
				{ name: 'h', type: 'integer', desc: 'Height in pixels. With both, the image is cropped to fill.' }
			],
			request: 'GET /api/v1/proxy/image?url=https%3A%2F%2Fimg-eshop.cdn.nintendo.net%2F…&w=240',
			response: 'image/webp\n\nCache-Control: public, max-age=31536000, immutable\nAccess-Control-Allow-Origin: *',
			notes: ['Responses are cached for a year, so ask for the sizes you need and stick to them.']
		},
		{
			id: 'og',
			path: '/api/og/{id}.jpg',
			title: 'Share image',
			summary: 'The picture used when a game page is shared: its artwork and numbers on one card.',
			params: [{ name: 'id', type: 'string', required: true, desc: 'A 16-digit title ID, then .jpg. The older .png address redirects here.' }],
			request: 'GET /api/og/0100000000010000.jpg',
			response: 'image/jpeg'
		},
		{
			id: 'status',
			path: '/api/v1/status',
			title: 'System status',
			summary: 'Whether the site and the services it depends on are up, with how long each took to answer. Cached for 30 seconds.',
			params: [{ name: 'strict', type: 'string', desc: 'Set to 1 and the HTTP status carries the verdict: 503 when the system is down. Without it the answer is always 200 and you read the body. Use it for uptime monitors.' }],
			request: 'GET /api/v1/status?strict=1',
			response: `{
  "status": "up",
  "timestamp": "2026-10-04T10:53:19.540Z",
  "latency_ms": 922,
  "services": {
    "database":   { "status": "up", "latency": 3 },
    "nintendoCdn": { "status": "up", "latency": 652 },
    "github":     { "status": "up", "latency": 921 },
    "imageCache": { "status": "up", "latency": 1 }
  },
  "system": { "uptime": 5769.2, "node_version": "v24.13.0", "memory": { "rss": 278265856 } }
}`,
			notes: ['status is up, degraded or down.']
		},
		{
			id: 'health',
			path: '/api/health',
			title: 'Health check',
			summary: 'A lighter check of the database and storage, and whether game data is being rebuilt. 200 even when degraded; 500 only when the check itself could not run.',
			request: 'GET /api/health',
			response: `{
  "status": "healthy",
  "latency": 3,
  "services": {
    "database": { "status": "healthy", "latency": "1ms" },
    "storage": { "status": "up", "latency": "1ms" },
    "build": { "isBuilding": false, "phase": null, "startedAt": null, "completedAt": null }
  },
  "timestamp": "2026-10-04T10:53:19.562Z"
}`,
			notes: ['While game data is being rebuilt, build.isBuilding is true and some pages may be briefly empty.']
		},
		{
			id: 'version',
			path: '/api/version',
			title: 'Version',
			summary: 'The running version, feature flags and the notices shown at the top of the site.',
			request: 'GET /api/version',
			response: `{
  "version": "1791105431104",
  "features": { "newContributionFlow": true, "cloudStorage": true },
  "announcements": [
    { "id": "…", "date": "2026-02-15", "message": "…", "type": "success", "link": "/contribute", "active": true }
  ],
  "lastUpdated": "…"
}`
		}
	]

	const toc = [
		{ id: 'overview', label: 'Overview' },
		{ id: 'authentication', label: 'Authentication' },
		{ id: 'conventions', label: 'Conventions' },
		...endpoints.map(e => ({ id: e.id, label: e.title })),
		{ id: 'errors', label: 'Errors' },
		{ id: 'etiquette', label: 'Using it kindly' },
		{ id: 'data', label: 'The data' }
	]

	/** @param {{ id: string, request: string }} e */
	function curlFor (e) {
		const url = `${origin}${e.request.replace('GET ', '')}`
		return `curl "${url}"`
	}

	/** @param {string | Date | null} value */
	function fmt (value) {
		return value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : ''
	}

	let copied = $state('')
	/** @param {string} text @param {string} id */
	async function copy (text, id) {
		try {
			await navigator.clipboard.writeText(text)
			copied = id
			setTimeout(() => { if (copied === id) copied = '' }, 1400)
		} catch { /* the clipboard can be unavailable */ }
	}
</script>

<svelte:head>
	<title>API Documentation - Switch Performance</title>
	<meta name="description" content="The Switch Performance API: search games, read performance profiles and graphics settings, and fetch library statistics as JSON. Sign in with GitHub to make a token." />
	<link rel="canonical" href="{page.url.origin}/docs/api" />
	<meta property="og:title" content="API Documentation - Switch Performance" />
	<meta property="og:description" content="Search games, read performance profiles and library statistics as JSON, with a free token." />
	<meta property="og:type" content="website" />
</svelte:head>

<div class="docs">
	<aside class="toc" aria-label="On this page">
		<p class="toc-title">API</p>
		<nav>
			{#each toc as item (item.id)}
				<a href="#{item.id}">{item.label}</a>
			{/each}
		</nav>
	</aside>

	<article>
		<header id="overview">
			<p class="eyebrow">Documentation</p>
			<h1>API</h1>
			<p class="lede">
				The data behind this site, as JSON. Games, their performance
				profiles and graphics settings, and statistics for the whole
				library. It is the API the site itself uses, and anyone can try
				it with no sign-up. For more requests a minute, sign in with
				GitHub and make a token.
			</p>
			<div class="base">
				<span>Base URL</span>
				<code>{origin}</code>
			</div>
		</header>

		<section id="authentication">
			<h2>Authentication</h2>
			<p>
				You can call the data endpoints with nothing at all, up to
				<strong>30 requests a minute</strong> (counted by IP address). If
				you need more, make a token below and send it in an
				<code>Authorization</code> header: it raises your limit to
				<strong>300 a minute</strong>. A token is yours, you can revoke it
				whenever you like, and it is how we can tell your use apart
				from everyone else&rsquo;s.
			</p>
			<p class="soft">
				To spot very heavy use, we count requests per token (or per IP
				address, when there is no token) for 30 days: how many, how many were turned
				away, when last, and the User-Agent. We do not keep what you
				ask for. See the <a href="/privacy">privacy policy</a>.
			</p>

			<div class="code">
				<div class="code-head"><span>Using a token</span></div>
				<pre><code>{`curl "${origin}/api/v1/games?q=example" \\
  -H "Authorization: Bearer spk_your_token_here"`}</code></pre>
			</div>

			<h3>Your tokens</h3>
			{#if !user}
				<div class="signin">
					<p>Sign in with GitHub to make a token for a higher limit. We only read your GitHub username.</p>
					<form action="/auth/signin/github" method="post">
						<input type="hidden" name="callbackUrl" value="/docs/api#authentication" />
						<button type="submit" class="github-btn">
							<Icon icon="mdi:github" width="20" />
							<span>Sign in with GitHub</span>
						</button>
					</form>
				</div>
			{:else}
				{#if form?.created}
					<div class="fresh" role="status">
						<p class="fresh-title"><Icon icon="mdi:key-variant" width="18" /> Your new token{form.created.name ? `, ${form.created.name}` : ''}</p>
						<div class="fresh-token">
							<code>{form.created.token}</code>
							<button type="button" onclick={() => copy(form.created.token, 'fresh')} aria-label="Copy the token">
								<Icon icon={copied === 'fresh' ? 'mdi:check' : 'mdi:content-copy'} width="16" />
								{copied === 'fresh' ? 'Copied' : 'Copy'}
							</button>
						</div>
						<p class="fresh-note">This is the only time it is shown. Keep it somewhere safe; if you lose it, revoke it and make another.</p>
					</div>
				{/if}

				{#if form?.message}<p class="form-error" role="alert">{form.message}</p>{/if}

				{#if data.tokens.length}
					<div class="table-wrap">
						<table>
							<thead><tr><th>Name</th><th>Token</th><th>Made</th><th>Last used</th><th></th></tr></thead>
							<tbody>
								{#each data.tokens as t (t.id)}
									<tr>
										<td>{t.name || 'Untitled'}</td>
										<td><code>{t.display}…</code></td>
										<td class="type">{fmt(t.createdAt)}</td>
										<td class="type">{t.lastUsedAt ? fmt(t.lastUsedAt) : 'Never'}</td>
										<td>
											<form method="post" action="?/revoke" use:enhance>
												<input type="hidden" name="id" value={t.id} />
												<button type="submit" class="revoke">Revoke</button>
											</form>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<p class="soft">You have no tokens yet.</p>
				{/if}

				<form method="post" action="?/create" use:enhance class="make">
					<label>
						<span>What is it for? <small>(optional)</small></span>
						<input name="name" maxlength="40" placeholder="My discord bot" autocomplete="off" />
					</label>
					<button type="submit" class="make-btn" disabled={data.tokens.length >= data.maxTokens}>Make a token</button>
				</form>
				<p class="soft">Signed in as <strong>{user.login}</strong>. You can hold up to {data.maxTokens} tokens at a time.</p>
			{/if}

			<p class="soft">
				<code>/api/v1/status</code>, <code>/api/health</code>,
				<code>/api/version</code>, the image proxy and the share images
				have no limit of this kind and need no token.
			</p>
		</section>

		<section id="conventions">
			<h2>Conventions</h2>
			<ul class="plain">
				<li><strong>Read only.</strong> Every endpoint here is a <code>GET</code>. There is nothing in this API that changes data.</li>
				<li><strong>JSON</strong> in UTF-8, except the image endpoints. Times are ISO 8601 in UTC.</li>
				<li><strong>Title IDs</strong> are 16 hexadecimal digits, such as <code>0100000000010000</code>. Games that are the same game in another region or edition share a <code>groupId</code>, and their data is shared too.</li>
				<li><strong>Frame rates and resolutions</strong> in a profile are what the game targets, from community reports: <code>target_fps</code> is a number or <code>"Unlocked"</code>, <code>resolution</code> is <code>"1920x1080"</code>, and <code>resolution_type</code> is how it scales (<code>Fixed</code>, <code>Dynamic</code> and so on).</li>
				<li><strong>Browsers.</strong> The JSON endpoints do not send CORS headers, so call them from a server or a script, not from another site&rsquo;s page, and keep your token out of anything a visitor can read. The image proxy does allow cross-site use.</li>
			</ul>
		</section>

		{#each endpoints as e (e.id)}
			<section id={e.id} class="endpoint">
				<h2>{e.title}</h2>
				<p class="route"><span class="method">GET</span><code>{e.path}</code></p>
				<p>{e.summary}</p>

				{#if e.params?.length}
					<h3>Parameters</h3>
					<div class="table-wrap">
						<table>
							<thead><tr><th>Name</th><th>Type</th><th>What it does</th></tr></thead>
							<tbody>
								{#each e.params as param (param.name)}
									<tr>
										<td><code>{param.name}</code>{#if param.required}<span class="req">required</span>{/if}</td>
										<td class="type">{param.type}</td>
										<td>{param.desc}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}

				<h3>Example</h3>
				<div class="code">
					<div class="code-head">
						<span>Request</span>
						<button onclick={() => copy(curlFor(e), e.id)} aria-label="Copy as a curl command">
							<Icon icon={copied === e.id ? 'mdi:check' : 'mdi:content-copy'} width="15" />
							{copied === e.id ? 'Copied' : 'Copy curl'}
						</button>
					</div>
					<pre><code>{e.request}</code></pre>
				</div>
				<div class="code">
					<div class="code-head"><span>Response</span></div>
					<pre><code>{e.response}</code></pre>
				</div>

				{#if e.notes?.length}
					<ul class="notes">
						{#each e.notes as note (note)}<li>{note}</li>{/each}
					</ul>
				{/if}
			</section>
		{/each}

		<section id="errors">
			<h2>Errors</h2>
			<p>A request that cannot be answered gets an ordinary HTTP status, with a short message.</p>
			<div class="table-wrap">
				<table>
					<thead><tr><th>Status</th><th>Meaning</th></tr></thead>
					<tbody>
						<tr><td><code>400</code></td><td>A required parameter is missing.</td></tr>
						<tr><td><code>401</code></td><td>A token was sent, but it is not valid or has been revoked. (Sending none is fine.)</td></tr>
						<tr><td><code>403</code></td><td>The image proxy was asked for an address it does not serve.</td></tr>
						<tr><td><code>404</code></td><td>No such game.</td></tr>
						<tr><td><code>429</code></td><td>Over the limit: 30 a minute without a token, 300 with one. <code>Retry-After</code> says how many seconds to wait.</td></tr>
						<tr><td><code>500</code></td><td>Something went wrong on our side. The message is deliberately vague. Try again shortly, and check <a href="/status">the status page</a>.</td></tr>
						<tr><td><code>503</code></td><td>Only from <code>/api/v1/status?strict=1</code>, when the system is down.</td></tr>
					</tbody>
				</table>
			</div>
			<div class="code">
				<div class="code-head"><span>An error</span></div>
				<pre><code>{`{ "message": "Game not found" }`}</code></pre>
			</div>
		</section>

		<section id="etiquette">
			<h2>Using it kindly</h2>
			<ul class="plain">
				<li>This is a community project run on a small budget. Without a token the limit is 30 a minute, with one 300, and every answer carries <code>X-RateLimit-Limit</code>, <code>X-RateLimit-Remaining</code> and <code>X-RateLimit-Tier</code> headers. A few a second is plenty, and a crawl of the whole library should be spread out.</li>
				<li>Cache what you fetch. Profiles change when a pull request is merged, not by the minute, so an hour or a day is usually fresh enough. <code>/api/v1/status</code> is cached for 30 seconds already.</li>
				<li>To read the entire library, page through <code>/api/v1/games</code> rather than asking for every game one by one. Or take the data straight from its source, below.</li>
				<li>If you run something regular, make a token for it and name it, so that if it misbehaves it can be revoked without stopping anything else. Never put a token in code that is published or that visitors can read.</li>
				<li>The signed-in endpoints the site uses for favourites, requests and preferences (<code>/api/v1/favorites</code>, <code>/api/v1/requests</code>, <code>/api/v1/preferences</code>) work from a signed-in browser session. They are not part of this API, and may change without notice.</li>
			</ul>
		</section>

		<section id="data">
			<h2>The data</h2>
			<p>
				Performance profiles, graphics settings and video links are
				collected in the open, in the
				<a href="https://github.com/biase-d/nx-performance" target="_blank" rel="noopener noreferrer">nx-performance</a>
				repository, one file per game and version, each added by a pull
				request with its author credited. This API is a reading view of
				that repository. If you want all of it, or want to correct
				something, that is the place to go.
			</p>
			<p>
				The site&rsquo;s own code is open source under the AGPL v3, at
				<a href="https://github.com/biase-d/titledb-browser" target="_blank" rel="noopener noreferrer">titledb-browser</a>.
				Found something wrong in the API or these docs?
				<a href="https://github.com/biase-d/titledb-browser/issues" target="_blank" rel="noopener noreferrer">Open an issue</a>.
			</p>
			<p class="small">Nintendo Switch is a trademark of Nintendo. Switch Performance is not affiliated with Nintendo.</p>
		</section>
	</article>
</div>

<style>
	.docs {
		max-width: 1100px;
		margin: 0 auto;
		padding: 2.5rem 1.5rem 1rem;
		display: grid;
		grid-template-columns: 1fr;
		gap: 2rem;
	}

	@media (min-width: 960px) {
		.docs { grid-template-columns: 13rem minmax(0, 1fr); gap: 3.5rem; }
	}

	.toc { display: none; }

	@media (min-width: 960px) {
		.toc { display: block; position: sticky; top: 6rem; align-self: start; max-height: calc(100vh - 8rem); overflow-y: auto; }
	}

	.toc-title {
		font: 800 0.72rem var(--font-mono, ui-monospace, monospace);
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--text-secondary);
		margin: 0 0 0.75rem;
	}

	.toc nav { display: flex; flex-direction: column; border-left: 2px solid var(--border-color); }
	.toc a {
		padding: 0.35rem 0 0.35rem 0.9rem;
		margin-left: -2px;
		border-left: 2px solid transparent;
		color: var(--text-secondary);
		text-decoration: none;
		font-size: 0.88rem;
		transition: color 0.2s, border-color 0.2s;
	}
	.toc a:hover { color: var(--text-primary); border-left-color: var(--primary-color); }

	article { min-width: 0; }

	.eyebrow {
		font: 800 0.72rem var(--font-mono, ui-monospace, monospace);
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--primary-color);
		margin: 0 0 0.6rem;
	}

	h1 { font-size: clamp(2.2rem, 5vw, 3rem); font-weight: 900; letter-spacing: -0.03em; margin: 0 0 1rem; }
	.lede { font-size: 1.1rem; line-height: 1.65; color: var(--text-secondary); max-width: 40rem; margin: 0 0 1.5rem; }

	.base {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.55rem 0.9rem;
		border: 1px solid var(--border-color);
		border-radius: 12px;
		background: var(--surface-color);
		max-width: 100%;
	}
	.base span { font: 800 0.68rem var(--font-mono, ui-monospace, monospace); letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-secondary); }
	.base code { overflow-wrap: anywhere; }

	section { padding-top: 2.75rem; scroll-margin-top: 5.5rem; }
	section + section { margin-top: 0.5rem; border-top: 1px solid var(--border-color); margin-top: 2.75rem; }
	h2 { font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 0.9rem; }
	h3 { font: 800 0.72rem var(--font-mono, ui-monospace, monospace); letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-secondary); margin: 1.6rem 0 0.7rem; }
	p { line-height: 1.65; margin: 0 0 1rem; }
	.small { font-size: 0.8rem; color: var(--text-secondary); }

	.route { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
	.method {
		padding: 0.15rem 0.5rem;
		border-radius: 6px;
		background: color-mix(in srgb, #10b981 18%, transparent);
		color: #0d9a6b;
		font: 800 0.72rem var(--font-mono, ui-monospace, monospace);
		letter-spacing: 0.08em;
	}

	code { font-family: var(--font-mono, ui-monospace, monospace); font-size: 0.88em; }
	p code, li code, td code { padding: 0.1rem 0.35rem; border-radius: 5px; background: var(--input-bg); }

	.plain, .notes { padding-left: 1.2rem; margin: 0 0 1rem; display: flex; flex-direction: column; gap: 0.6rem; line-height: 1.6; }
	.notes { color: var(--text-secondary); font-size: 0.92rem; margin-top: 1rem; }

	.table-wrap { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 12px; }
	table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
	th, td { text-align: left; padding: 0.65rem 0.9rem; vertical-align: top; }
	th { font: 800 0.68rem var(--font-mono, ui-monospace, monospace); letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-secondary); background: var(--surface-color); }
	tr + tr td { border-top: 1px solid var(--border-color); }
	td.type { color: var(--text-secondary); white-space: nowrap; font-family: var(--font-mono, ui-monospace, monospace); font-size: 0.82rem; }
	td:first-child { white-space: nowrap; }
	.req { margin-left: 0.5rem; font: 700 0.65rem var(--font-mono, ui-monospace, monospace); letter-spacing: 0.08em; text-transform: uppercase; color: var(--primary-color); }

	.code { margin: 0 0 0.9rem; border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; background: #0d1117; }
	.code-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.4rem 0.8rem;
		background: rgba(255, 255, 255, 0.05);
		font: 700 0.68rem var(--font-mono, ui-monospace, monospace);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.55);
	}
	.code-head button { display: inline-flex; align-items: center; gap: 0.35rem; background: none; border: 0; color: inherit; font: inherit; cursor: pointer; }
	.code-head button:hover { color: #fff; }
	pre { margin: 0; padding: 0.9rem 1rem; overflow-x: auto; }
	pre code { color: #d6deeb; font-size: 0.82rem; line-height: 1.6; background: none; padding: 0; }

	@media (max-width: 560px) {
		td:first-child { white-space: normal; }
	}

	.signin, .fresh {
		padding: 1.1rem 1.2rem;
		border: 1px solid var(--border-color);
		border-radius: 12px;
		background: var(--surface-color);
		margin-bottom: 1rem;
	}
	.signin p { margin: 0 0 0.9rem; color: var(--text-secondary); }
	.github-btn { display: inline-flex; align-items: center; gap: 0.6rem; height: 2.6rem; padding: 0 1.2rem; border: 0; border-radius: 10px; background: #24292f; color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
	.github-btn:hover { background: #32383f; }

	.fresh { border-color: color-mix(in srgb, var(--primary-color) 55%, var(--border-color)); }
	.fresh-title { display: flex; align-items: center; gap: 0.5rem; font-weight: 800; margin: 0 0 0.7rem; }
	.fresh-token { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.8rem; border-radius: 8px; background: #0d1117; }
	.fresh-token code { flex: 1; min-width: 0; overflow-wrap: anywhere; color: #d6deeb; font-size: 0.85rem; }
	.fresh-token button { display: inline-flex; align-items: center; gap: 0.35rem; flex: none; background: none; border: 0; color: rgba(255, 255, 255, 0.7); font: inherit; font-size: 0.8rem; cursor: pointer; }
	.fresh-token button:hover { color: #fff; }
	.fresh-note { margin: 0.7rem 0 0; font-size: 0.88rem; color: var(--text-secondary); }

	.form-error { color: #dc2626; font-weight: 600; }
	.soft { color: var(--text-secondary); font-size: 0.9rem; }

	.make { display: flex; align-items: flex-end; gap: 0.75rem; flex-wrap: wrap; margin: 1rem 0 0.75rem; }
	.make label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.85rem; font-weight: 600; }
	.make small { font-weight: 400; color: var(--text-secondary); }
	.make input { height: 2.6rem; width: 16rem; max-width: 100%; padding: 0 0.8rem; border-radius: 10px; border: 1px solid var(--border-color); background: var(--input-bg); color: var(--text-primary); font: inherit; }
	.make-btn { height: 2.6rem; padding: 0 1.2rem; border: 0; border-radius: 10px; background: var(--primary-color); color: var(--primary-action-text, #fff); font: inherit; font-weight: 700; cursor: pointer; }
	.make-btn:disabled { opacity: 0.45; cursor: not-allowed; }
	.revoke { background: none; border: 1px solid var(--border-color); border-radius: 8px; padding: 0.25rem 0.7rem; color: var(--text-secondary); font: inherit; font-size: 0.82rem; cursor: pointer; }
	.revoke:hover { color: #dc2626; border-color: #dc2626; }
</style>
