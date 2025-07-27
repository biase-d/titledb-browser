<script>
	import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, BarController, LineElement, PointElement, LineController, Filler } from 'chart.js';
	import BarChart from './BarChart.svelte';
	import LineChart from './LineChart.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { browser } from '$app/environment'

	/** @type {import('./$types').PageData} */
	let data = $props();

	let stats = $derived(data.stats);

	let filters = $state({
		publisher: null,
		year: null,
		sizeBucket: null,
	});

	$effect(() => {
		if (stats?.activeFilters) {
			filters.publisher = stats.activeFilters.publisher;
			filters.year = stats.activeFilters.year;
			filters.sizeBucket = stats.activeFilters.sizeBucket;
		}
	});

	$effect(() => {
		const url = new URL(page.url);

		const updateParam = (key, value) => {
			if (value) url.searchParams.set(key, value);
			else url.searchParams.delete(key);
		};

		updateParam('publisher', filters.publisher);
		updateParam('year', filters.year);
		updateParam('sizeBucket', filters.sizeBucket);

		if (url.href !== page.url.href) {
			goto(url.href, { keepData: false, noScroll: true, replaceState: true });
		}
	});

	let releasesByYear = $derived(stats ? {
		labels: stats.releasesByYear.map(item => item.year),
		datasets: [{ label: 'Games Released', data: stats.releasesByYear.map(item => item.count), borderColor: 'rgb(59, 130, 246)', backgroundColor: 'rgba(59, 130, 246, 0.5)', tension: 0.1, fill: true }]
	} : { labels: [], datasets: [] });

	let topPublishers = $derived(stats ? {
		labels: stats.topPublishers.map(p => p.publisher),
		datasets: [{ label: 'Games Published', data: stats.topPublishers.map(p => p.count), backgroundColor: 'rgba(59, 130, 246, 0.5)', borderColor: 'rgba(59, 130, 246, 1)', borderWidth: 1 }]
	} : { labels: [], datasets: [] });

	let sizeDistribution = $derived(stats ? {
		labels: stats.sizeDistribution.map(b => b.bucket),
		datasets: [{ label: 'Number of Games', data: stats.sizeDistribution.map(b => b.count), backgroundColor: 'rgba(59, 130, 246, 0.5)', borderColor: 'rgba(59, 130, 246, 1)', borderWidth: 1 }]
	} : { labels: [], datasets: [] });

	if (browser) {
		ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, BarController, LineElement, PointElement, LineController, Filler);
	}

	const chartOptions = { responsive: true, maintainAspectRatio: false };
	const topPublishersOptions = { ...chartOptions, indexAxis: 'y' };

	function handleChartClick(chart, event, filterType) {
		if (!chart) return;
		const elements = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
		if (elements.length > 0) {
			const index = elements[0].index;
			const label = chart.data.labels[index];

			if (filters[filterType] === label) {
				filters[filterType] = null;
			} else {
				filters[filterType] = label;
			}
		}
	}

	function clearFilter(filterType) {
		filters[filterType] = null;
	}

	function createHomeUrl() {
		const params = new URLSearchParams();
		if (filters.publisher) params.set('publisher', filters.publisher);
		if (filters.year) {
			params.set('minYear', filters.year);
			params.set('maxYear', filters.year);
		}
		if (filters.sizeBucket) {
			const ranges = { '<5GB': [0, 5120], '5-10GB': [5120, 10240], '10-15GB': [10240, 15360], '15-20GB': [15360, 20480], '>20GB': [20480, ''] };
			if (ranges[filters.sizeBucket]) {
				params.set('minSizeMB', ranges[filters.sizeBucket][0]);
				params.set('maxSizeMB', ranges[filters.sizeBucket][1]);
			}
		}
		return `/?${params.toString()}`;
	}
</script>

<svelte:head>
	<title>Statistics - Titledb Browser</title>
</svelte:head>

{#if stats}
<div class="stats-container">
	<div class="header-container">
		<h1 class="page-title">Titledb Dashboard</h1>
		{#if filters.publisher || filters.year || filters.sizeBucket}
			<div class="filter-status">
				<div class="active-filters">
					<span>Active Filters:</span>
					{#if filters.publisher}
						<span class="filter-tag">{filters.publisher} <button onclick={() => clearFilter('publisher')}>×</button></span>
					{/if}
					{#if filters.year}
						<span class="filter-tag">Year: {filters.year} <button onclick={() => clearFilter('year')}>×</button></span>
					{/if}
					{#if filters.sizeBucket}
						<span class="filter-tag">Size: {filters.sizeBucket} <button onclick={() => clearFilter('sizeBucket')}>×</button></span>
					{/if}
				</div>
				<a href={createHomeUrl()} class="view-results-btn">View Results</a>
			</div>
		{/if}
	</div>

	<div class="kpi-grid">
		<div class="kpi-card">
			<span class="value">{parseInt(stats.kpis.total_titles).toLocaleString()}</span>
			<span class="label">Matching Titles</span>
		</div>
		<div class="kpi-card">
			<span class="value">{parseInt(stats.kpis.total_publishers).toLocaleString()}</span>
			<span class="label">Unique Publishers</span>
		</div>
	</div>

	<div class="chart-section">
		<h2>Game Releases by Year</h2>
		<div class="chart-wrapper">
			<LineChart data={releasesByYear} options={chartOptions} on:chartClick={({detail}) => handleChartClick(detail.chart, detail.event, 'year')} />
		</div>
	</div>

	<div class="chart-section">
		<h2>Top 10 Publishers by Release Count</h2>
		<div class="chart-wrapper">
			<BarChart data={topPublishers} options={topPublishersOptions} on:chartClick={({detail}) => handleChartClick(detail.chart, detail.event, 'publisher')} />
		</div>
	</div>

	<div class="chart-section">
		<h2>Game Size Distribution</h2>
		<div class="chart-wrapper">
			<BarChart data={sizeDistribution} options={chartOptions} on:chartClick={({detail}) => handleChartClick(detail.chart, detail.event, 'sizeBucket')} />
		</div>
	</div>
</div>
{:else}
	<p class="loading-message">Loading statistics...</p>
{/if}

<style>
	.loading-message { text-align: center; padding: 4rem; font-size: 1.2rem; color: var(--text-secondary); }
	.stats-container { display: flex; flex-direction: column; gap: 2.5rem; }
	.header-container { border-bottom: 2px solid var(--border-color); padding-bottom: 1rem; }
	.page-title { font-size: 2.5rem; font-weight: 700; color: var(--text-primary); }

	.filter-status { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; padding: 0.75rem; margin-top: 1rem; background-color: var(--input-bg); border-radius: var(--border-radius); }
	.active-filters { display: flex; align-items: center; flex-wrap: wrap; gap: 0.75rem; }
	.active-filters span:first-child { color: var(--text-secondary); font-weight: 500; }
	.filter-tag { display: inline-flex; align-items: center; gap: 0.5rem; background-color: var(--primary-color); color: var(--primary-action-text); padding: 6px 12px; border-radius: 999px; font-size: 0.9rem; }
	.filter-tag button { background: rgba(0,0,0,0.2); border: none; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
	.view-results-btn { background-color: var(--primary-color); color: var(--primary-action-text); padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: 500; }

	.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; }
	.kpi-card { background-color: var(--surface-color); padding: 1.5rem; border-radius: var(--border-radius); box-shadow: var(--box-shadow); display: flex; flex-direction: column; gap: 0.25rem; overflow: hidden; }
	.kpi-card .value { font-size: 2rem; font-weight: 600; color: var(--primary-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.kpi-card .label { font-size: 0.9rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

	.chart-section { background-color: var(--surface-color); padding: 2rem; border-radius: var(--border-radius); box-shadow: var(--box-shadow); }
	.chart-section h2 { margin-top: 0; margin-bottom: 1.5rem; font-size: 1.5rem; }
	.chart-wrapper { height: 400px; position: relative; }
</style>