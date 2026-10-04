<script>
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import Icon from '@iconify/svelte'
  import CountryFlag from '$lib/components/CountryFlag.svelte'
  import { getRegionLabel } from '$lib/regions'
  import BarList from './BarList.svelte'
  import ColumnChart from './ColumnChart.svelte'
  import CartridgeStackChart from './CartridgeStackChart.svelte'
  import CountUp from '$lib/components/CountUp.svelte'

  /** @type {{ data: { stats: any } }} */
  let { data } = $props()

  /** @type {any} */
  let stats = $derived(data.stats)
  let kpis = $derived(stats.kpis)
  let filters = $derived(stats.activeFilters)

  const TABS = [
    { id: 'overview', label: 'Overview', icon: 'mdi:view-dashboard-outline' },
    { id: 'performance', label: 'Performance', icon: 'mdi:speedometer' },
    { id: 'community', label: 'Community', icon: 'mdi:account-group-outline' },
    { id: 'library', label: 'Library', icon: 'mdi:bookshelf' }
  ]

  let tab = $state('overview')

  /** @param {string} code */
  const regionName = (code) => getRegionLabel([code]) ?? code

  /** @param {number} bytes */
  function formatSize (bytes) {
    if (!bytes) return '—'
    const gb = bytes / 1024 ** 3
    if (gb >= 1024) return `${(gb / 1024).toFixed(2)} TB`
    return gb >= 1 ? `${gb.toFixed(2)} GB` : `${Math.round(bytes / 1024 ** 2)} MB`
  }

  /** @param {number} ratio */
  const percent = (ratio) => `${Math.round(ratio * 100)}%`

  /** 'YYYY-MM' -> 'Jan', with the year on January so a year boundary is visible */
  function monthLabel (/** @type {string} */ month) {
    const [y, m] = month.split('-').map(Number)
    const name = new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en', { month: 'short', timeZone: 'UTC' })
    return m === 1 ? `${name} ${String(y).slice(2)}` : name
  }

  /**
   * Sets or clears one filter. The page's data is loaded from the URL, so this
   * is just navigation
   * @param {'region' | 'publisher' | 'year' | 'sizeBucket'} key
   * @param {string | null} value
   */
  function setFilter (key, value) {
    const url = new URL(page.url)
    if (value && filters[key] !== value) url.searchParams.set(key, value)
    else url.searchParams.delete(key)
    goto(url, { noScroll: true, keepFocus: true, replaceState: true })
  }

  function clearFilters () {
    const url = new URL(page.url)
    for (const key of ['region', 'publisher', 'year', 'sizeBucket']) url.searchParams.delete(key)
    goto(url, { noScroll: true, keepFocus: true, replaceState: true })
  }

  let activeFilterCount = $derived(Object.values(filters).filter(Boolean).length)

  /** Where "browse these titles" goes: the library search supports region and publisher only */
  let libraryUrl = $derived.by(() => {
    // Local to this derivation, never reactive state
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const params = new URLSearchParams()
    if (filters.publisher) params.set('publisher', filters.publisher)
    if (filters.region) params.set('region_filter', filters.region)
    return params.size > 0 ? `/?${params}` : null
  })

  let scopeLabel = $derived(filters.region ? regionName(filters.region) : 'all regions')

  const coverageNote = $derived(
    kpis.groups === 0
      ? 'No titles match these filters.'
      : `${kpis.groupsWithData.toLocaleString()} of ${kpis.groups.toLocaleString()} games have performance or graphics data`
  )
</script>

<svelte:head>
  <title>Data Insights - Switch Performance</title>
  <meta
    name="description"
    content="Explore statistics for the Nintendo Switch library: how much of it has performance data, what frame rates it runs at, who contributes, and what the community is asking for. Filter by region."
  />
  <link rel="canonical" href="{page.url.origin}/stats" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="{page.url.origin}/stats" />
  <meta property="og:title" content="Data Insights - Switch Performance" />
  <meta
    property="og:description"
    content="Explore statistics for the Nintendo Switch library: data coverage, frame rates, contributors and community requests."
  />
  <meta property="og:site_name" content="Switch Performance" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="Data Insights - Switch Performance" />
  <meta
    name="twitter:description"
    content="Explore statistics for the Nintendo Switch library."
  />
</svelte:head>

<div class="stats-dashboard">
  <header class="dashboard-header">
    <div>
      <h1 class="title-main">Data Insights</h1>
      <p class="title-sub">
        {#if filters.region}
          Showing titles released in <strong>{regionName(filters.region)}</strong>.
        {:else}
          The whole library, across every region.
        {/if}
      </p>
    </div>

    <label class="region-picker">
      <span class="picker-label">Region</span>
      <span class="picker-control">
        {#if filters.region}
          <CountryFlag code={filters.region} size={18} />
        {:else}
          <Icon icon="mdi:earth" width="18" height="18" />
        {/if}
        <select
          value={filters.region ?? ''}
          onchange={(e) => setFilter('region', e.currentTarget.value || null)}
          aria-label="Filter statistics by region"
        >
          <option value="">All regions</option>
          {#each stats.regions as r (r.code)}
            <option value={r.code}>{regionName(r.code)} ({r.titles.toLocaleString()})</option>
          {/each}
        </select>
      </span>
    </label>
  </header>

  {#if activeFilterCount > 0}
    <div class="active-filters" role="status">
      <span class="filters-label">Filtered by</span>
      {#each [['region', filters.region ? regionName(filters.region) : null], ['publisher', filters.publisher], ['year', filters.year], ['sizeBucket', filters.sizeBucket]] as [key, text] (key)}
        {#if text}
          <span class="filter-pill">
            {text}
            <button onclick={() => setFilter(/** @type {any} */ (key), null)} aria-label="Remove {key} filter">
              <Icon icon="mdi:close" />
            </button>
          </span>
        {/if}
      {/each}
      <button class="clear-all" onclick={clearFilters}>Clear all</button>
      {#if libraryUrl}
        <a href={libraryUrl} class="results-link">Browse these titles <Icon icon="mdi:arrow-right" /></a>
      {/if}
    </div>
  {/if}

  <nav class="tabs" aria-label="Statistics sections">
    <div role="tablist" class="tablist">
      {#each TABS as t (t.id)}
        <button
          role="tab"
          id="tab-{t.id}"
          aria-selected={tab === t.id}
          aria-controls="panel-{t.id}"
          class:active={tab === t.id}
          onclick={() => (tab = t.id)}
        >
          <Icon icon={t.icon} />
          <span>{t.label}</span>
        </button>
      {/each}
    </div>
  </nav>

  {#if tab === 'overview'}
    <div id="panel-overview" role="tabpanel" aria-labelledby="tab-overview" class="panel">
      <div class="kpi-grid">
        <div class="kpi glass-panel">
          <span class="kpi-value"><CountUp value={kpis.titles} /></span>
          <span class="kpi-label">Titles</span>
          <span class="kpi-hint">{kpis.groups.toLocaleString()} games once regional versions are grouped</span>
        </div>
        <div class="kpi glass-panel">
          <span class="kpi-value"><CountUp value={Math.round(kpis.coverage * 100)} suffix="%" /></span>
          <span class="kpi-label">Games with data</span>
          <span class="kpi-hint">{coverageNote}</span>
        </div>
        <div class="kpi glass-panel">
          <span class="kpi-value"><CountUp value={kpis.profiles} /></span>
          <span class="kpi-label">Performance profiles</span>
          <span class="kpi-hint">{kpis.graphics.toLocaleString()} graphics settings · {kpis.videos.toLocaleString()} videos</span>
        </div>
        <div class="kpi glass-panel">
          <span class="kpi-value"><CountUp value={kpis.contributors} /></span>
          <span class="kpi-label">Contributors</span>
          <span class="kpi-hint">{kpis.contributions.toLocaleString()} contributions</span>
        </div>
        <div class="kpi glass-panel">
          <span class="kpi-value"><CountUp value={kpis.publishers} /></span>
          <span class="kpi-label">Publishers</span>
          <span class="kpi-hint">{formatSize(kpis.totalSize)} of games</span>
        </div>
        <div class="kpi glass-panel">
          <span class="kpi-value"><CountUp value={kpis.requests + kpis.favorites} /></span>
          <span class="kpi-label">Community signals</span>
          <span class="kpi-hint">{kpis.requests.toLocaleString()} requests · {kpis.favorites.toLocaleString()} favorites</span>
        </div>
      </div>

      <div class="card glass-panel">
        <div class="card-head">
          <h2>Data coverage</h2>
          <span class="card-note">{scopeLabel}</span>
        </div>
        <div class="coverage-bar" role="img" aria-label="{percent(kpis.coverage)} of games have data">
          <span style:width={percent(kpis.coverage)}></span>
        </div>
        <p class="card-text">{coverageNote}. Games with nothing yet are listed on the <a href="/contribute">contribute page</a>.</p>
      </div>

      <div class="card glass-panel">
        <div class="card-head">
          <h2>Profiles added</h2>
          <span class="card-note">last 12 months · {scopeLabel}</span>
        </div>
        <ColumnChart
          items={stats.activityByMonth.map((/** @type {any} */ m) => ({ label: monthLabel(m.month), value: m.count }))}
          caption="Performance profiles added per month"
        />
      </div>
    </div>
  {:else if tab === 'performance'}
    <div id="panel-performance" role="tabpanel" aria-labelledby="tab-performance" class="panel">
      <p class="panel-note">
        Based on the newest profile of each of the {stats.performance.sampled.toLocaleString()} games with data in {scopeLabel}.
      </p>
      <div class="two-col">
        <div class="card glass-panel">
          <div class="card-head"><h2>Docked frame rate</h2><span class="card-note">target FPS</span></div>
          <BarList items={stats.performance.dockedFps.map((/** @type {any} */ f) => ({ label: /^\d+$/.test(f.label) ? `${f.label} FPS` : f.label, value: f.count }))} />
        </div>
        <div class="card glass-panel">
          <div class="card-head"><h2>Handheld frame rate</h2><span class="card-note">target FPS</span></div>
          <BarList items={stats.performance.handheldFps.map((/** @type {any} */ f) => ({ label: /^\d+$/.test(f.label) ? `${f.label} FPS` : f.label, value: f.count }))} color="#a78bfa" />
        </div>
      </div>
      <div class="card glass-panel">
        <div class="card-head"><h2>Docked resolution</h2><span class="card-note">how the game scales</span></div>
        <BarList items={stats.performance.resolutionTypes.map((/** @type {any} */ r) => ({ label: r.label, value: r.count }))} color="#14b8a6" />
      </div>
    </div>
  {:else if tab === 'community'}
    <div id="panel-community" role="tabpanel" aria-labelledby="tab-community" class="panel">
      <div class="card glass-panel">
        <div class="card-head">
          <h2>Top contributors</h2>
          <span class="card-note">{kpis.contributors.toLocaleString()} people · {scopeLabel}</span>
        </div>
        {#if stats.topContributors.length === 0}
          <p class="card-text">No approved contributions for this selection yet.</p>
        {:else}
          <ol class="leaderboard">
            {#each stats.topContributors as person, i (person.name)}
              <li>
                <span class="rank">{i + 1}</span>
                <a href="/profile/{encodeURIComponent(person.name)}">{person.name}</a>
                <span class="leader-count">{person.contributions.toLocaleString()} <small>{person.contributions === 1 ? 'contribution' : 'contributions'}</small></span>
              </li>
            {/each}
          </ol>
          <p class="card-text small">A contribution is one pull request. Names are matched ignoring case, and a PR that adds both a profile and graphics settings counts once.</p>
        {/if}
      </div>

      <div class="two-col">
        <div class="card glass-panel">
          <div class="card-head"><h2>Most requested</h2><span class="card-note">wanted data</span></div>
          <BarList
            items={stats.topRequested.map((/** @type {any} */ g) => ({ label: g.name, value: g.count, href: `/title/${g.gameId}`, detail: `${g.count}` }))}
            color="#f87171"
          />
        </div>
        <div class="card glass-panel">
          <div class="card-head"><h2>Most favorited</h2><span class="card-note">saved by players</span></div>
          <BarList
            items={stats.topFavorited.map((/** @type {any} */ g) => ({ label: g.name, value: g.count, href: `/title/${g.gameId}`, detail: `${g.count}` }))}
            color="#a78bfa"
          />
        </div>
      </div>
    </div>
  {:else}
    <div id="panel-library" role="tabpanel" aria-labelledby="tab-library" class="panel">
      <p class="panel-note">Select a bar to filter every tab by it.</p>
      <div class="card glass-panel">
        <div class="card-head"><h2>Release timeline</h2><span class="card-note">games per year</span></div>
        <CartridgeStackChart
          items={stats.releasesByYear.map((/** @type {any} */ y) => ({ label: String(y.year), value: y.count }))}
          selected={filters.year}
          onselect={(label) => setFilter('year', label)}
          caption="Games released per year"
        />
      </div>

      <div class="two-col">
        <div class="card glass-panel">
          <div class="card-head"><h2>Top publishers</h2><span class="card-note">by title count</span></div>
          <BarList
            items={stats.topPublishers.map((/** @type {any} */ p) => ({ label: p.publisher, value: p.count }))}
            selected={filters.publisher}
            onselect={(label) => setFilter('publisher', label)}
          />
        </div>
        <div class="card glass-panel">
          <div class="card-head"><h2>Download size</h2><span class="card-note">titles per size</span></div>
          <BarList
            items={stats.sizeDistribution.map((/** @type {any} */ b) => ({ label: b.bucket, value: b.count }))}
            selected={filters.sizeBucket}
            onselect={(label) => setFilter('sizeBucket', label)}
            color="#a78bfa"
          />
        </div>
      </div>

      <div class="card glass-panel">
        <div class="card-head"><h2>Titles</h2><span class="card-note">newest 50 matching</span></div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th class="hide-narrow">Publisher</th>
                <th class="hide-narrow">Regions</th>
                <th class="num">Size</th>
              </tr>
            </thead>
            <tbody>
              {#each stats.filteredGames as game (game.id)}
                <tr>
                  <td class="name"><a href="/title/{game.id}">{game.name}</a></td>
                  <td class="hide-narrow">{game.publisher || '—'}</td>
                  <td class="hide-narrow">{(game.regions ?? []).join(', ') || '—'}</td>
                  <td class="num">{formatSize(game.sizeInBytes)}</td>
                </tr>
              {:else}
                <tr><td colspan="4" class="empty-state">No games match these filters.</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .stats-dashboard {
    max-width: 1100px;
    margin: 0 auto;
    padding: 2.5rem 1rem 4rem;
  }

  .dashboard-header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem 1.5rem;
    margin-bottom: 1.5rem;
  }

  .title-main {
    font-size: 2.25rem;
    font-weight: 900;
    margin: 0 0 0.375rem;
    letter-spacing: -0.025em;
    color: var(--text-primary);
  }

  .title-sub {
    margin: 0;
    color: var(--text-secondary);
    font-size: 1.0625rem;
  }

  .title-sub strong { color: var(--text-primary); }

  .region-picker {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 14rem;
  }

  .picker-label {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-secondary);
  }

  .picker-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0 0.75rem;
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    color: var(--text-secondary);
  }

  .picker-control:focus-within {
    border-color: var(--primary-color);
  }

  .picker-control select {
    flex: 1;
    min-width: 0;
    padding: 0.625rem 0;
    background: transparent;
    border: 0;
    color: var(--text-primary);
    font: inherit;
    font-weight: 600;
    outline: none;
    cursor: pointer;
  }

  .active-filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    margin-bottom: 1.5rem;
    background: color-mix(in srgb, var(--surface-color) 60%, transparent);
    border: 1px solid color-mix(in srgb, #eab308 30%, var(--border-color));
    border-radius: 14px;
  }

  .filters-label {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .filter-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.3rem 0.7rem;
    background: var(--input-bg);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .filter-pill button,
  .clear-all {
    background: none;
    border: 0;
    padding: 0;
    cursor: pointer;
    color: var(--text-secondary);
    display: inline-flex;
    font: inherit;
  }

  .filter-pill button:hover { color: #f87171; }

  .clear-all {
    font-size: 0.8rem;
    text-decoration: underline;
    margin-left: 0.25rem;
  }

  .results-link {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--primary-color);
    font-weight: 700;
    font-size: 0.875rem;
    text-decoration: none;
  }

  .results-link:hover { text-decoration: underline; }

  .tabs {
    margin-bottom: 1.5rem;
    border-bottom: 1px solid var(--border-color);
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .tabs::-webkit-scrollbar {
    display: none;
  }

  .tablist {
    display: flex;
    gap: 0.25rem;
    min-width: max-content;
  }

  .tablist button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: none;
    border: 0;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    color: var(--text-secondary);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }

  .tablist button:hover { color: var(--text-primary); }

  .tablist button.active {
    color: var(--primary-color);
    border-bottom-color: var(--primary-color);
  }

  .panel {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .panel-note {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.875rem;
  }

  .glass-panel {
    background: color-mix(in srgb, var(--surface-color) 40%, transparent);
    -webkit-backdrop-filter: blur(20px);
    backdrop-filter: blur(20px);
    border: 1px solid var(--border-color);
    border-radius: 20px;
  }

  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: 1rem;
  }

  .kpi {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    padding: 1.25rem;
  }

  .kpi-value {
    font-size: 2rem;
    font-weight: 800;
    line-height: 1.1;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
  }

  .kpi-label {
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-secondary);
  }

  .kpi-hint {
    margin-top: 0.375rem;
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .card { padding: 1.25rem 1.5rem; }

  .card-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.25rem 1rem;
    margin-bottom: 1rem;
  }

  .card-head h2 {
    margin: 0;
    font-size: 1.0625rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .card-note {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .card-text {
    margin: 0.75rem 0 0;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .card-text.small { font-size: 0.8rem; }
  .card-text a { color: var(--primary-color); }

  .coverage-bar {
    height: 0.75rem;
    border-radius: 999px;
    background: var(--input-bg);
    overflow: hidden;
  }

  .coverage-bar span {
    display: block;
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--primary-color), #14b8a6);
  }

  .two-col {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
    gap: 1.25rem;
  }

  .leaderboard {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .leaderboard li {
    display: grid;
    grid-template-columns: 2rem 1fr auto;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 0;
    border-bottom: 1px solid var(--border-color);
  }

  .leaderboard li:last-child { border-bottom: 0; }

  .rank {
    font-variant-numeric: tabular-nums;
    color: var(--text-secondary);
    font-weight: 700;
  }

  .leaderboard a {
    color: var(--text-primary);
    font-weight: 600;
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .leaderboard a:hover { color: var(--primary-color); }

  .leader-count {
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    color: var(--text-primary);
  }

  .leader-count small {
    font-weight: 400;
    color: var(--text-secondary);
  }

  .table-container {
    overflow-x: auto;
    margin: 0 -0.5rem;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .data-table th {
    padding: 0.5rem;
    text-align: left;
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border-color);
  }

  .data-table td {
    padding: 0.625rem 0.5rem;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-secondary);
  }

  .data-table tr:last-child td { border-bottom: 0; }
  .data-table .name a { color: var(--text-primary); font-weight: 600; text-decoration: none; }
  .data-table .name a:hover { color: var(--primary-color); }
  .data-table .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .empty-state { text-align: center; padding: 2rem 0.5rem; }

  @media (max-width: 640px) {
    .stats-dashboard { padding-top: 1.5rem; }
    .title-main { font-size: 1.75rem; }
    .region-picker { width: 100%; }
    .hide-narrow { display: none; }
    .tablist { min-width: 0; }
    .tablist button { flex: 1; justify-content: center; padding: 0.75rem 0.25rem; font-size: 0.875rem; }
    .tablist button :global(svg) { display: none; }
    .card { padding: 1rem; }
    .two-col { grid-template-columns: 1fr; }
    .results-link { margin-left: 0; width: 100%; }
  }
</style>
