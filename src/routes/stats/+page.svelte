<script>
	import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, BarController, LineElement, PointElement, LineController, Filler } from 'chart.js';
	import BarChart from './BarChart.svelte';
	import LineChart from './LineChart.svelte';

	export let data;

	ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, BarController, LineElement, PointElement, LineController, Filler);

	let selectedPublisher = '';

	$: filteredTitles = selectedPublisher
		? data.titles.filter(t => t.publisher === selectedPublisher)
		: data.titles;

	let totalTitles, busiestDay, largestGame, totalPublishers;
	let releasesByYear, topPublishers, sizeDistribution;

	$: {
		totalTitles = filteredTitles.length;
		busiestDay = { date: 'N/A', count: 0 };
		largestGame = { name: 'N/A', size: 0 };
		totalPublishers = new Set(filteredTitles.map(t => t.publisher).filter(p => p && p !== 'N/A')).size;

		const releasesByDate = new Map();
		filteredTitles.forEach(game => {
			if (game.releaseDate) {
				const date = game.releaseDate.toString();
				releasesByDate.set(date, (releasesByDate.get(date) || 0) + 1);
			}
			if (game.sizeInBytes > largestGame.size) {
				largestGame = { name: game.names[0], size: game.sizeInBytes };
			}
		});
		for (const [date, count] of releasesByDate.entries()) {
			if (count > busiestDay.count) busiestDay = { date, count };
		}

		const yearCounts = filteredTitles.reduce((acc, game) => {
			if (game.releaseDate) {
				const year = game.releaseDate.toString().substring(0, 4);
				acc[year] = (acc[year] || 0) + 1;
			}
			return acc;
		}, {});
		releasesByYear = {
			labels: Object.keys(yearCounts).sort(),
			datasets: [{ label: 'Games Released', data: Object.values(yearCounts), borderColor: 'rgb(59, 130, 246)', backgroundColor: 'rgba(59, 130, 246, 0.5)', tension: 0.1, fill: true }]
		};

		const publisherCounts = filteredTitles.reduce((acc, game) => {
			if (game.publisher && game.publisher !== 'N/A') {
				acc[game.publisher] = (acc[game.publisher] || 0) + 1;
			}
			return acc;
		}, {});
		const sortedPublishers = Object.entries(publisherCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
		topPublishers = {
			labels: sortedPublishers.map(p => p[0]),
			datasets: [{ label: 'Games Published', data: sortedPublishers.map(p => p[1]), backgroundColor: 'rgba(59, 130, 246, 0.5)', borderColor: 'rgba(59, 130, 246, 1)', borderWidth: 1 }]
		};

		const sizeBuckets = { '<1GB': 0, '1-5GB': 0, '5-10GB': 0, '10-20GB': 0, '>20GB': 0 };
		const GIGABYTE = 1024 ** 3;
		filteredTitles.forEach(game => {
			const size = game.sizeInBytes;
			if (size < GIGABYTE) sizeBuckets['<1GB']++;
			else if (size < 5 * GIGABYTE) sizeBuckets['1-5GB']++;
			else if (size < 10 * GIGABYTE) sizeBuckets['5-10GB']++;
			else if (size < 20 * GIGABYTE) sizeBuckets['10-20GB']++;
			else sizeBuckets['>20GB']++;
		});
		sizeDistribution = {
			labels: Object.keys(sizeBuckets),
			datasets: [{ label: 'Number of Games', data: Object.values(sizeBuckets), backgroundColor: 'rgba(59, 130, 246, 0.5)', borderColor: 'rgba(59, 130, 246, 1)', borderWidth: 1 }]
		};
	}

	const chartOptions = { responsive: true, maintainAspectRatio: false };
	const topPublishersOptions = { ...chartOptions, indexAxis: 'y' };

	function handlePublisherChartClick({ detail }) {
		const { event, chart } = detail;
		if (!chart) return;
		const elements = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
		if (elements.length > 0) {
			const clickedElementIndex = elements[0].index;
			const publisher = chart.data.labels[clickedElementIndex];
			selectedPublisher = selectedPublisher === publisher ? '' : publisher;
		}
	}
</script>

<svelte:head>
	<title>Statistics - Titledb Browser</title>
</svelte:head>

<div class="stats-container">
	<div class="header-container">
		<h1 class="page-title">Titledb Dashboard</h1>
		{#if selectedPublisher}
			<div class="filter-status">
				<span>Showing stats for: <strong>{selectedPublisher}</strong></span>
				<button on:click={() => selectedPublisher = ''}>× Clear</button>
			</div>
		{/if}
	</div>

	<div class="kpi-grid">
		<div class="kpi-card">
			<span class="value">{totalTitles.toLocaleString()}</span>
			<span class="label">Total Titles Indexed</span>
		</div>
		<div class="kpi-card">
			<span class="value">{totalPublishers.toLocaleString()}</span>
			<span class="label">Unique Publishers</span>
		</div>
		<div class="kpi-card">
			<span class="value">{busiestDay.count}</span>
			<span class="label">Busiest Day ({busiestDay.date})</span>
		</div>
		<div class="kpi-card">
			<span class="value">{(largestGame.size / 1024**3).toFixed(2)} GB</span>
			<span class="label">Largest Game ({largestGame.name})</span>
		</div>
	</div>

	<div class="chart-section">
		<h2>Game Releases by Year</h2>
		<div class="chart-wrapper">
			<LineChart data={releasesByYear} options={chartOptions} />
		</div>
	</div>

	<div class="chart-section">
		<h2>Top 10 Publishers by Release Count</h2>
		<div class="chart-wrapper">
			<BarChart data={topPublishers} options={topPublishersOptions} on:chartClick={handlePublisherChartClick} />
		</div>
	</div>

	<div class="chart-section">
		<h2>Game Size Distribution</h2>
		<div class="chart-wrapper">
			<BarChart data={sizeDistribution} options={chartOptions} />
		</div>
	</div>
</div>

<style>
	.stats-container { display: flex; flex-direction: column; gap: 2.5rem; }
	.page-title { font-size: 2.5rem; font-weight: 700; color: var(--text-primary); padding-bottom: 1rem; }
	.header-container { border-bottom: 2px solid var(--border-color); }
	.filter-status {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1.5rem;
		margin-bottom: 1rem;
		background-color: var(--input-bg);
		border-radius: var(--border-radius);
	}
	.filter-status span { font-size: 1rem; color: var(--text-secondary); }
	.filter-status strong { color: var(--text-primary); }
	.filter-status button {
		background: none;
		border: none;
		color: var(--primary-color);
		font-weight: 500;
		cursor: pointer;
		font-size: 0.9rem;
	}
	.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; }
	.kpi-card { background-color: var(--surface-color); padding: 1.5rem; border-radius: var(--border-radius); box-shadow: var(--box-shadow); display: flex; flex-direction: column; gap: 0.25rem; overflow: hidden; }
	.kpi-card .value { font-size: 2rem; font-weight: 600; color: var(--primary-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.kpi-card .label { font-size: 0.9rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.chart-section { background-color: var(--surface-color); padding: 2rem; border-radius: var(--border-radius); box-shadow: var(--box-shadow); }
	.chart-section h2 { margin-top: 0; margin-bottom: 1.5rem; font-size: 1.5rem; }
	.chart-wrapper { height: 400px; position: relative; }
</style>