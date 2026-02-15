<script>
	import {
		Chart as ChartJS,
		Title,
		Tooltip,
		Legend,
		BarElement,
		CategoryScale,
		LinearScale,
		BarController,
		LineElement,
		PointElement,
		LineController,
		Filler,
	} from 'chart.js'
	import BarChart from './BarChart.svelte'
	import LineChart from './LineChart.svelte'
	import { goto } from '$app/navigation'
	import { page } from '$app/state'
	import { browser } from '$app/environment'
	import Icon from '@iconify/svelte'

	/** @type {{ data: { stats: any } }} */
	let { data } = $props()

	/** @type {any} */
	let stats = $derived(data.stats)

	/**
	 * @param {number | string | null} bytes
	 * @returns {string}
	 */
	function formatSize (bytes) {
		if (!bytes) return '0.00 GB'
		const val = typeof bytes === 'string' ? parseFloat(bytes) : bytes
		const gb = val / (1024 * 1024 * 1024)
		return `${gb.toFixed(2)} GB`
	}

	let filters = $state({
		publisher: null,
		year: null,
		sizeBucket: null,
	})

	$effect(() => {
		if (stats?.activeFilters) {
			filters.publisher = stats.activeFilters.publisher
			filters.year = stats.activeFilters.year
			filters.sizeBucket = stats.activeFilters.sizeBucket
		}
	})

	$effect(() => {
		const url = new URL(page.url)

		/**
		 * @param {string} key
		 * @param {string | null} value
		 */
		const updateParam = (key, value) => {
			if (value) url.searchParams.set(key, value)
			else url.searchParams.delete(key)
		}

		updateParam('publisher', filters.publisher)
		updateParam('year', filters.year)
		updateParam('sizeBucket', filters.sizeBucket)

		if (url.href !== page.url.href) {
			goto(url.href, {
				noScroll: true,
				replaceState: true,
			})
		}
	})

	const chartData = $derived(
		stats
			? {
					releasesByYear: {
						labels: stats.releasesByYear.map(
							(/** @type {any} */ item) => item.year,
						),
						datasets: [
							{
								label: 'Games Released',
								data: stats.releasesByYear.map(
									(/** @type {any} */ item) => item.count,
								),
								borderColor: '#3b82f6',
								backgroundColor: 'rgba(59, 130, 246, 0.1)',
								borderWidth: 3,
								fill: true,
								tension: 0.4,
								pointBackgroundColor: '#3b82f6',
								pointBorderColor: '#fff',
								pointHoverRadius: 6,
							},
						],
					},
					topPublishers: {
						labels: stats.topPublishers.map(
							(/** @type {any} */ p) => p.publisher,
						),
						datasets: [
							{
								label: 'Games Published',
								data: stats.topPublishers.map(
									(/** @type {any} */ p) => p.count,
								),
								backgroundColor: 'rgba(59, 130, 246, 0.5)',
								borderColor: '#3b82f6',
								borderWidth: 1,
								borderRadius: 8,
							},
						],
					},
					sizeDistribution: {
						labels: stats.sizeDistribution.map(
							(/** @type {any} */ b) => b.bucket,
						),
						datasets: [
							{
								label: 'Number of Games',
								data: stats.sizeDistribution.map(
									(/** @type {any} */ b) => b.count,
								),
								backgroundColor: 'rgba(167, 139, 250, 0.5)',
								borderColor: '#a78bfa',
								borderWidth: 1,
								borderRadius: 8,
							},
						],
					},
				}
			: null,
	)

	if (browser) {
		ChartJS.register(
			Title,
			Tooltip,
			Legend,
			BarElement,
			CategoryScale,
			LinearScale,
			BarController,
			LineElement,
			PointElement,
			LineController,
			Filler,
		)
	}

	const chartOptions = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: { display: false },
			tooltip: {
				backgroundColor: 'rgba(23, 23, 23, 0.95)',
				titleFont: { size: 13, weight: 'bold' },
				padding: 12,
				cornerRadius: 12,
				borderColor: 'rgba(255, 255, 255, 0.1)',
				borderWidth: 1,
			},
		},
		scales: {
			y: {
				grid: { color: 'rgba(255, 255, 255, 0.05)' },
				ticks: { color: 'rgba(255, 255, 255, 0.5)' },
			},
			x: {
				grid: { display: false },
				ticks: { color: 'rgba(255, 255, 255, 0.5)' },
			},
		},
	}

	const horizontalBarOptions = {
		...chartOptions,
		indexAxis: 'y',
		scales: {
			x: {
				grid: { color: 'rgba(255, 255, 255, 0.05)' },
				ticks: { color: 'rgba(255, 255, 255, 0.5)' },
			},
			y: {
				grid: { display: false },
				ticks: { color: 'rgba(255, 255, 255, 0.5)' },
			},
		},
	}

	/**
	 * @param {any} chart
	 * @param {any} event
	 * @param {'publisher' | 'year' | 'sizeBucket'} filterType
	 */
	function handleChartClick (chart, event, filterType) {
		if (!chart) return
		const elements = chart.getElementsAtEventForMode(
			event,
			'nearest',
			{ intersect: true },
			true,
		)
		if (elements.length > 0) {
			const index = elements[0].index
			const label = chart.data.labels[index]
			filters[filterType] = filters[filterType] === label ? null : label
		}
	}

	/**
	 * @param {'publisher' | 'year' | 'sizeBucket'} filterType
	 */
	function clearFilter (filterType) {
		filters[filterType] = null
	}

	function createHomeUrl () {
		const params = new URLSearchParams()
		if (filters.publisher) params.set('publisher', filters.publisher)
		if (filters.year) {
			params.set('minYear', filters.year)
			params.set('maxYear', filters.year)
		}
		if (filters.sizeBucket) {
			const ranges = {
				'<1GB': [0, 1024],
				'1-2GB': [1024, 2048],
				'2-3GB': [2048, 3072],
				'3-4GB': [3072, 4096],
				'4-5GB': [4096, 5120],
				'5-10GB': [5120, 10240],
				'10-15GB': [10240, 15360],
				'15-20GB': [15360, 20480],
				'>20GB': [20480, ''],
			}
			if (ranges[filters.sizeBucket]) {
				params.set('minSizeMB', ranges[filters.sizeBucket][0])
				params.set('maxSizeMB', ranges[filters.sizeBucket][1])
			}
		}
		return `/?${params.toString()}`
	}
</script>

<svelte:head>
	<title>Data Insights - Switch Performance</title>
	<meta
		name="description"
		content="Explore comprehensive statistics and insights about the Nintendo Switch game library — release timelines, top publishers, storage distribution, and community trends."
	/>
</svelte:head>

<div class="stats-dashboard">
	<header class="dashboard-header">
		<div class="header-title">
			<h1 class="title-main">Data Insights</h1>
			<p class="title-sub">
				Comprehensive overview of the Switch Performance ecosystem.
			</p>
		</div>

		{#if filters.publisher || filters.year || filters.sizeBucket}
			<div class="active-filters-glass border-yellow">
				<div class="filter-pills-container">
					{#if filters.publisher}
						<span class="filter-pill">
							{filters.publisher}
							<button
								onclick={() => clearFilter('publisher')}
								aria-label="Remove publisher filter"
								><Icon icon="mdi:close" /></button
							>
						</span>
					{/if}
					{#if filters.year}
						<span class="filter-pill">
							{filters.year}
							<button
								onclick={() => clearFilter('year')}
								aria-label="Remove year filter"
								><Icon icon="mdi:close" /></button
							>
						</span>
					{/if}
					{#if filters.sizeBucket}
						<span class="filter-pill">
							{filters.sizeBucket}
							<button
								onclick={() => clearFilter('sizeBucket')}
								aria-label="Remove size filter"
								><Icon icon="mdi:close" /></button
							>
						</span>
					{/if}
				</div>
				<div class="filter-divider"></div>
				<a href={createHomeUrl()} class="results-link">
					View matching titles
				</a>
			</div>
		{/if}
	</header>

	{#if stats}
		<section class="metrics-section">
			<h2 class="section-label">Global Database Metrics</h2>
			<div class="metrics-grid">
				<div class="kpi-card glass-panel">
					<div class="kpi-icon blue">
						<Icon icon="mdi:controller-classic" />
					</div>
					<div class="kpi-content">
						<span class="value"
							>{parseInt(
								stats.kpis.total_titles,
							).toLocaleString()}</span
						>
						<span class="label">Total Games</span>
					</div>
				</div>
				<div class="kpi-card glass-panel">
					<div class="kpi-icon teal">
						<Icon icon="mdi:layers-outline" />
					</div>
					<div class="kpi-content">
						<span class="value"
							>{parseInt(
								stats.kpis.total_groups,
							).toLocaleString()}</span
						>
						<span class="label">Library Groups</span>
					</div>
				</div>
				<div class="kpi-card glass-panel">
					<div class="kpi-icon purple">
						<Icon icon="mdi:domain" />
					</div>
					<div class="kpi-content">
						<span class="value"
							>{parseInt(
								stats.kpis.total_publishers,
							).toLocaleString()}</span
						>
						<span class="label">Publishers</span>
					</div>
				</div>
				<div class="kpi-card glass-panel">
					<div class="kpi-icon orange">
						<Icon icon="mdi:database-outline" />
					</div>
					<div class="kpi-content">
						<span class="value small"
							>{formatSize(stats.kpis.total_size)}</span
						>
						<span class="label">Total Data Size</span>
					</div>
				</div>

				<div class="kpi-card glass-panel">
					<div class="kpi-icon yellow">
						<Icon icon="mdi:speedometer" />
					</div>
					<div class="kpi-content">
						<span class="value"
							>{parseInt(
								stats.kpis.total_performance,
							).toLocaleString()}</span
						>
						<span class="label">Performance Profiles</span>
					</div>
				</div>
				<div class="kpi-card glass-panel">
					<div class="kpi-icon indigo"><Icon icon="mdi:tune" /></div>
					<div class="kpi-content">
						<span class="value"
							>{parseInt(
								stats.kpis.total_graphics,
							).toLocaleString()}</span
						>
						<span class="label">Graphics Settings</span>
					</div>
				</div>
				<div class="kpi-card glass-panel">
					<div class="kpi-icon red"><Icon icon="mdi:youtube" /></div>
					<div class="kpi-content">
						<span class="value"
							>{parseInt(
								stats.kpis.total_youtube,
							).toLocaleString()}</span
						>
						<span class="label">Gameplay Videos</span>
					</div>
				</div>
				<div class="kpi-card glass-panel">
					<div class="kpi-icon pink">
						<Icon icon="mdi:account-heart-outline" />
					</div>
					<div class="kpi-content">
						<span class="value"
							>{parseInt(
								stats.kpis.total_contributors,
							).toLocaleString()}</span
						>
						<span class="label">Unique Contributors</span>
					</div>
				</div>
				<div class="kpi-card glass-panel">
					<div class="kpi-icon green">
						<Icon icon="mdi:account-group-outline" />
					</div>
					<div class="kpi-content">
						<span class="value"
							>{parseInt(
								stats.kpis.total_requests +
									stats.kpis.total_favorites,
							).toLocaleString()}</span
						>
						<span class="label">Community Interactions</span>
					</div>
				</div>
			</div>
		</section>

		<section class="metrics-section">
			<h2 class="section-label">Community Trends</h2>
			<div class="trends-grid">
				<div class="trend-card glass-panel">
					<div class="trend-header">
						<Icon icon="mdi:fire" class="trend-icon red-text" />
						<h3 class="trend-title">Most Requested</h3>
					</div>
					<div class="trend-list">
						{#each stats.topRequested as item}
							<div class="trend-item">
								<span class="trend-name">{item.name}</span>
								<span class="trend-count"
									>{item.count} requests</span
								>
							</div>
						{/each}
					</div>
				</div>
				<div class="trend-card glass-panel">
					<div class="trend-header">
						<Icon icon="mdi:heart" class="trend-icon purple-text" />
						<h3 class="trend-title">Fan Favorites</h3>
					</div>
					<div class="trend-list">
						{#each stats.topFavorited as item}
							<div class="trend-item">
								<span class="trend-name">{item.name}</span>
								<span class="trend-count"
									>{item.count} favorites</span
								>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</section>

		<div class="charts-container">
			<section class="chart-card glass-panel">
				<div class="chart-header">
					<h3 class="chart-title">Release Timeline</h3>
					<div class="chart-subtitle">Games per Year</div>
				</div>
				<div class="chart-h">
					{#if chartData}
						<LineChart
							data={chartData.releasesByYear}
							options={chartOptions}
							on:chartClick={({ detail }) =>
								handleChartClick(
									detail.chart,
									detail.event,
									'year',
								)}
						/>
					{/if}
				</div>
			</section>

			<section class="chart-card glass-panel">
				<div class="chart-header">
					<h3 class="chart-title">Top Publishers</h3>
					<div class="chart-subtitle">By Title Count</div>
				</div>
				<div class="chart-h">
					{#if chartData}
						<BarChart
							data={chartData.topPublishers}
							options={horizontalBarOptions}
							on:chartClick={({ detail }) =>
								handleChartClick(
									detail.chart,
									detail.event,
									'publisher',
								)}
						/>
					{/if}
				</div>
			</section>

			<section class="chart-card glass-panel col-span-full">
				<div class="chart-header">
					<h3 class="chart-title">Storage Distribution</h3>
					<div class="chart-subtitle">File Size Buckets</div>
				</div>
				<div class="chart-h-large">
					{#if chartData}
						<BarChart
							data={chartData.sizeDistribution}
							options={chartOptions}
							on:chartClick={({ detail }) =>
								handleChartClick(
									detail.chart,
									detail.event,
									'sizeBucket',
								)}
						/>
					{/if}
				</div>
			</section>
		</div>
	{:else}
		<div class="loading-state">
			<div class="loading-content">
				<Icon
					icon="mdi:chart-scatter-plot"
					class="loading-icon"
					width="64"
				/>
				<span class="loading-text">Aggregating Statistics...</span>
			</div>
		</div>
	{/if}
</div>

<style>
	.stats-dashboard {
		max-width: 1200px;
		margin: 0 auto;
		padding: 3rem 1.5rem;
	}

	.dashboard-header {
		margin-bottom: 3rem;
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1.5rem;
	}

	.title-main {
		font-size: 2.25rem;
		font-weight: 900;
		margin-bottom: 0.5rem;
		letter-spacing: -0.025em;
		color: white;
	}

	.title-sub {
		color: #9ca3af;
		font-size: 1.125rem;
	}

	.active-filters-glass {
		background: rgba(23, 23, 23, 0.4);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.08);
		padding: 1rem;
		border-radius: 1rem;
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.active-filters-glass.border-yellow {
		border-color: rgba(234, 179, 8, 0.2);
	}

	.filter-pills-container {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.filter-pill {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.8rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		font-size: 0.8rem;
		font-weight: 700;
		color: white;
	}

	.filter-pill button {
		color: rgba(255, 255, 255, 0.4);
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		transition: color 0.2s;
		display: flex;
	}

	.filter-pill button:hover {
		color: #f87171;
	}

	.filter-divider {
		height: 2rem;
		width: 1px;
		background-color: rgba(255, 255, 255, 0.1);
	}

	.results-link {
		color: #60a5fa;
		font-weight: 700;
		text-decoration: none;
		font-size: 0.875rem;
		transition: color 0.15s ease-in-out;
	}

	.results-link:hover {
		color: #93c5fd;
	}

	.glass-panel {
		background: rgba(23, 23, 23, 0.4);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 24px;
	}

	.metrics-section {
		margin-bottom: 3rem;
	}

	.section-label {
		font-size: 0.75rem;
		font-weight: 700;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: 1.5rem;
		padding-left: 0.25rem;
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(1, minmax(0, 1fr));
		gap: 1.5rem;
	}

	@media (min-width: 640px) {
		.metrics-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (min-width: 1024px) {
		.metrics-grid {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}

	.kpi-card {
		padding: 1.5rem;
		display: flex;
		align-items: center;
		gap: 1.5rem;
		transition: transform 0.3s ease;
	}

	.kpi-card:hover {
		transform: translateY(-4px);
		border-color: rgba(255, 255, 255, 0.15);
	}

	.kpi-icon {
		width: 54px;
		height: 54px;
		border-radius: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.kpi-icon.blue {
		background: rgba(59, 130, 246, 0.1);
		color: #3b82f6;
	}
	.kpi-icon.teal {
		background: rgba(20, 184, 166, 0.1);
		color: #14b8a6;
	}
	.kpi-icon.purple {
		background: rgba(167, 139, 250, 0.1);
		color: #a78bfa;
	}
	.kpi-icon.orange {
		background: rgba(249, 115, 22, 0.1);
		color: #f97316;
	}
	.kpi-icon.yellow {
		background: rgba(250, 204, 21, 0.1);
		color: #facc15;
	}
	.kpi-icon.indigo {
		background: rgba(99, 102, 241, 0.1);
		color: #6366f1;
	}
	.kpi-icon.red {
		background: rgba(248, 113, 113, 0.1);
		color: #f87171;
	}
	.kpi-icon.green {
		background: rgba(34, 197, 94, 0.1);
		color: #22c55e;
	}
	.kpi-icon.pink {
		background: rgba(236, 72, 153, 0.1);
		color: #ec4899;
	}

	.kpi-content {
		display: flex;
		flex-direction: column;
	}

	.kpi-content .value {
		font-size: 1.5rem;
		font-weight: 800;
		color: white;
		line-height: 1;
		margin-bottom: 0.25rem;
	}

	.kpi-content .value.small {
		font-size: 1.25rem;
	}

	.kpi-content .label {
		font-size: 0.8rem;
		font-weight: 600;
		color: #9ca3af;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.trends-grid {
		display: grid;
		grid-template-columns: repeat(1, minmax(0, 1fr));
		gap: 1.5rem;
		margin-bottom: 3rem;
	}

	@media (min-width: 768px) {
		.trends-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	.trend-card {
		padding: 1.5rem;
	}

	.trend-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.trend-header :global(.trend-icon) {
		font-size: 1.25rem;
	}
	.trend-header :global(.trend-icon.red-text) {
		color: #f87171;
	}
	.trend-header :global(.trend-icon.purple-text) {
		color: #a78bfa;
	}

	.trend-title {
		font-size: 1rem;
		font-weight: 700;
		margin: 0;
		color: white;
	}

	.trend-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.trend-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.trend-name {
		font-size: 0.9rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.trend-count {
		font-size: 0.75rem;
		font-weight: 700;
		color: #4b5563;
		background: rgba(255, 255, 255, 0.05);
		padding: 0.25rem 0.6rem;
		border-radius: 9999px;
		white-space: nowrap;
	}

	.charts-container {
		display: grid;
		grid-template-columns: repeat(1, minmax(0, 1fr));
		gap: 2rem;
	}

	@media (min-width: 1024px) {
		.charts-container {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.col-span-full {
			grid-column: span 2 / span 2;
		}
	}

	.chart-card {
		padding: 2rem;
		transition: border-color 0.3s ease;
	}

	.chart-card:hover {
		border-color: rgba(255, 255, 255, 0.15);
	}

	.chart-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 2rem;
	}

	.chart-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: white;
	}

	.chart-subtitle {
		font-size: 0.75rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
			monospace;
		color: #6b7280;
	}

	.chart-h {
		height: 320px;
	}
	.chart-h-large {
		height: 400px;
	}

	.loading-state {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 8rem 0;
	}

	.loading-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.loading-content :global(.loading-icon) {
		color: #374151;
		animation: pulse-op 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	@keyframes pulse-op {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.loading-text {
		color: #6b7280;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		font-size: 0.75rem;
	}
</style>
