<script>
	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import { browser } from "$app/environment";
	import { onMount } from "svelte";
	import Icon from "@iconify/svelte";
	import ListItem from "../../ListItem.svelte";
	import GridItem from "../../GridItem.svelte";

	let { data } = $props();

	let results = $derived(data.results);
	let pagination = $derived(data.pagination);
	let publisherName = $derived(data.publisherName);
	let stats = $derived(data.stats || null);

	let viewMode = $state("list");

	onMount(() => {
		const savedView = localStorage.getItem("viewMode");
		if (savedView === "grid" || savedView === "list") viewMode = savedView;
	});

	function changePage(newPage) {
		const url = new URL(window.location.href);
		url.searchParams.set("page", newPage.toString());
		goto(url, { noScroll: true });
		if (browser) window.scrollTo({ top: 0, behavior: "smooth" });
	}

	function toggleView(mode) {
		viewMode = mode;
		if (browser) localStorage.setItem("viewMode", mode);
	}
</script>

<svelte:head>
	<title>{publisherName} Games - Switch Performance</title>
</svelte:head>

<main class="page-container">
	<div class="header">
		<a href="/" class="back-link">← Back to Search</a>
		<h1>{publisherName}</h1>

		{#if stats}
			<div class="report-card">
				<div class="stat-group">
					<span class="stat-value">{stats.totalGames}</span>
					<span class="stat-label">Total Games</span>
				</div>

				<div class="tier-distribution">
					<div class="tier-bar">
						{#if stats.tiers.Perfect > 0}
							<div
								class="tier-segment perfect"
								style="flex-grow: {stats.tiers.Perfect}"
								title="Perfect: {stats.tiers.Perfect}"
							></div>
						{/if}
						{#if stats.tiers.Great > 0}
							<div
								class="tier-segment great"
								style="flex-grow: {stats.tiers.Great}"
								title="Great: {stats.tiers.Great}"
							></div>
						{/if}
						{#if stats.tiers.Playable > 0}
							<div
								class="tier-segment playable"
								style="flex-grow: {stats.tiers.Playable}"
								title="Playable: {stats.tiers.Playable}"
							></div>
						{/if}
						{#if stats.tiers.Rough > 0}
							<div
								class="tier-segment rough"
								style="flex-grow: {stats.tiers.Rough}"
								title="Rough: {stats.tiers.Rough}"
							></div>
						{/if}
						{#if stats.tiers.Unknown > 0}
							<div
								class="tier-segment unknown"
								style="flex-grow: {stats.tiers.Unknown}"
								title="Unknown: {stats.tiers.Unknown}"
							></div>
						{/if}
					</div>
					<div class="tier-legend">
						{#if stats.tiers.Perfect > 0}
							<span class="legend-item"
								><span class="dot perfect"></span> Perfect ({stats
									.tiers.Perfect})</span
							>
						{/if}
						{#if stats.tiers.Great > 0}
							<span class="legend-item"
								><span class="dot great"></span> Great ({stats
									.tiers.Great})</span
							>
						{/if}
						{#if stats.tiers.Playable > 0}
							<span class="legend-item"
								><span class="dot playable"></span> Playable ({stats
									.tiers.Playable})</span
							>
						{/if}
						{#if stats.tiers.Rough > 0}
							<span class="legend-item"
								><span class="dot rough"></span> Rough ({stats
									.tiers.Rough})</span
							>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<p class="subtitle">
			Showing {pagination.totalItems} games published by {publisherName}
		</p>
	</div>

	<div class="controls">
		<div class="view-switcher">
			<button
				class:active={viewMode === "list"}
				onclick={() => toggleView("list")}
				title="List View"><Icon icon="mdi:view-list" /></button
			>
			<button
				class:active={viewMode === "grid"}
				onclick={() => toggleView("grid")}
				title="Grid View"><Icon icon="mdi:view-grid" /></button
			>
		</div>
	</div>

	<div class="results-container {viewMode}">
		{#each results as item (item.id)}
			{#if viewMode === "list"}
				<ListItem titleData={item} />
			{:else}
				<GridItem titleData={item} />
			{/if}
		{:else}
			<div class="no-results">
				<h3>No Games Found</h3>
				<p>
					We couldn't find any games for this publisher in our
					database.
				</p>
			</div>
		{/each}
	</div>

	{#if pagination?.totalPages > 1}
		<div class="pagination">
			<button
				disabled={pagination.currentPage <= 1}
				onclick={() => changePage(pagination.currentPage - 1)}
				>← Previous</button
			>
			<span>Page {pagination.currentPage} of {pagination.totalPages}</span
			>
			<button
				disabled={pagination.currentPage >= pagination.totalPages}
				onclick={() => changePage(pagination.currentPage + 1)}
				>Next →</button
			>
		</div>
	{/if}
</main>

<style>
	.page-container {
		max-width: 1100px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}

	.header {
		margin-bottom: 2rem;
	}

	.back-link {
		display: inline-block;
		margin-bottom: 1rem;
		color: var(--text-secondary);
		text-decoration: none;
		font-size: 0.9rem;
	}
	.back-link:hover {
		text-decoration: underline;
	}

	h1 {
		font-size: 2.5rem;
		margin: 0 0 0.5rem;
		color: var(--text-primary);
	}

	.report-card {
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		margin: 1.5rem 0;
		display: flex;
		gap: 2rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.stat-group {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		min-width: 100px;
	}

	.stat-value {
		font-size: 2rem;
		font-weight: 700;
		color: var(--text-primary);
		line-height: 1;
	}

	.stat-label {
		font-size: 0.85rem;
		color: var(--text-secondary);
		margin-top: 0.25rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 600;
	}

	.tier-distribution {
		flex-grow: 1;
		min-width: 250px;
	}

	.tier-bar {
		display: flex;
		height: 12px;
		border-radius: 6px;
		overflow: hidden;
		background-color: var(--input-bg);
		margin-bottom: 0.75rem;
	}

	.tier-segment {
		height: 100%;
	}
	.tier-segment.perfect {
		background-color: #4ade80;
	} /* green-400 */
	.tier-segment.great {
		background-color: #60a5fa;
	} /* blue-400 */
	.tier-segment.playable {
		background-color: #facc15;
	} /* yellow-400 */
	.tier-segment.rough {
		background-color: #f87171;
	} /* red-400 */
	.tier-segment.unknown {
		background-color: var(--border-color);
	}

	.tier-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		font-size: 0.8rem;
		color: var(--text-secondary);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}
	.dot.perfect {
		background-color: #4ade80;
	}
	.dot.great {
		background-color: #60a5fa;
	}
	.dot.playable {
		background-color: #facc15;
	}
	.dot.rough {
		background-color: #f87171;
	}

	.subtitle {
		color: var(--text-secondary);
		font-size: 1.1rem;
	}

	.controls {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 1.5rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--border-color);
	}

	.view-switcher {
		display: flex;
		gap: 0.5rem;
	}

	.view-switcher button {
		padding: 0.5rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		background: none;
		color: var(--text-secondary);
		cursor: pointer;
		line-height: 1;
		transition: all 0.2s;
	}

	.view-switcher button.active {
		background-color: var(--primary-color);
		border-color: var(--primary-color);
		color: white;
	}

	.results-container.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 1.5rem;
	}

	.results-container.list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.no-results {
		grid-column: 1 / -1;
		padding: 4rem 2rem;
		text-align: center;
		color: var(--text-secondary);
		background-color: var(--surface-color);
		border-radius: var(--radius-lg);
		border: 1px dashed var(--border-color);
	}

	.no-results h3 {
		margin: 0 0 0.5rem;
		font-size: 1.5rem;
		color: var(--text-primary);
	}

	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		margin-top: 3rem;
	}

	.pagination button {
		padding: 8px 16px;
		font-weight: 500;
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		color: var(--primary-color);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all 0.2s;
	}

	.pagination button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.pagination button:not(:disabled):hover {
		background-color: var(--input-bg);
		border-color: var(--primary-color);
	}
</style>
