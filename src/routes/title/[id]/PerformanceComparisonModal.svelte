<script>
	import { fade } from 'svelte/transition'
	import Icon from '@iconify/svelte'

	let { show = $bindable(), performanceHistory } = $props()

	let selectedIndices = $state(new Set([0]))
	const MAX_SELECTIONS = 4

	function toggleSelection (index) {
		if (selectedIndices.has(index)) {
			if (selectedIndices.size > 1) {
				selectedIndices.delete(index)
			}
		} else {
			if (selectedIndices.size < MAX_SELECTIONS) {
				selectedIndices.add(index)
			} else {
				alert(
					`You can select a maximum of ${MAX_SELECTIONS} versions to compare`,
				)
			}
		}
	}

	let comparisonData = $derived(
		Array.from(selectedIndices)
			.map((i) => performanceHistory[i])
			.sort((a, b) =>
				a.gameVersion.localeCompare(b.gameVersion, undefined, {
					numeric: true,
				}),
			),
	)

	function formatResolution (modeData) {
		if (!modeData) return 'N/A'
		switch (modeData.resolution_type) {
			case 'Fixed':
				return modeData.resolution || 'N/A'
			case 'Dynamic':
				if (!modeData.min_res && !modeData.max_res) return 'Dynamic'
				return `${modeData.min_res || '?'} ~ ${modeData.max_res || '?'}`
			case 'Multiple Fixed':
				return 'Multiple'
			default:
				return 'N/A'
		}
	}

	function formatFramerate (modeData) {
		if (!modeData?.target_fps) return modeData?.fps_behavior || 'N/A'
		return `${modeData.fps_behavior} ${modeData.target_fps} FPS`
	}

	function hasDifference (metric, mode) {
		if (comparisonData.length <= 1) return false
		const values = new Set()
		for (const profile of comparisonData) {
			const data = profile.profiles?.[mode]
			if (metric === 'resolution') {
				values.add(formatResolution(data))
			} else if (metric === 'framerate') {
				values.add(formatFramerate(data))
			}
		}
		return values.size > 1
	}
</script>

{#if show}
	<div
		class="modal-overlay"
		onclick={() => (show = false)}
		onkeydown={(e) => e.key === 'Escape' && (show = false)}
		transition:fade={{ duration: 150 }}
		role="presentation"
	>
		<div
			class="modal-content"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-label="Compare Performance Versions"
			tabindex="-1"
		>
			<div class="modal-header">
				<h2>Compare Performance Versions</h2>
				<button class="close-btn" onclick={() => (show = false)}
					><Icon icon="mdi:close" /></button
				>
			</div>
			<div class="modal-body">
				<div class="version-selector">
					<h4>Select up to {MAX_SELECTIONS} versions to compare:</h4>
					<div class="version-tags">
						{#each performanceHistory as profile, i}
							<button
								class="version-tag"
								class:selected={selectedIndices.has(i)}
								onclick={() => toggleSelection(i)}
							>
								{profile.suffix
									? `${profile.gameVersion} (${profile.suffix})`
									: profile.gameVersion}
							</button>
						{/each}
					</div>
				</div>

				<div class="comparison-table-wrapper">
					<table class="comparison-table">
						<thead>
							<tr>
								<th class="metric-header">Metric</th>
								{#each comparisonData as profile}
									<th
										>{profile.suffix
											? `${profile.gameVersion} (${profile.suffix})`
											: profile.gameVersion}</th
									>
								{/each}
							</tr>
						</thead>
						<tbody>
							<tr class="mode-row"
								><td colspan={comparisonData.length + 1}
									>Docked</td
								></tr
							>
							<tr
								class:has-diff={hasDifference(
									'resolution',
									'docked',
								)}
							>
								<td>Resolution</td>
								{#each comparisonData as profile}
									<td
										>{formatResolution(
											profile.profiles?.docked,
										)}</td
									>
								{/each}
							</tr>
							<tr
								class:has-diff={hasDifference(
									'framerate',
									'docked',
								)}
							>
								<td>Framerate</td>
								{#each comparisonData as profile}
									<td
										>{formatFramerate(
											profile.profiles?.docked,
										)}</td
									>
								{/each}
							</tr>
							<tr class="mode-row"
								><td colspan={comparisonData.length + 1}
									>Handheld</td
								></tr
							>
							<tr
								class:has-diff={hasDifference(
									'resolution',
									'handheld',
								)}
							>
								<td>Resolution</td>
								{#each comparisonData as profile}
									<td
										>{formatResolution(
											profile.profiles?.handheld,
										)}</td
									>
								{/each}
							</tr>
							<tr
								class:has-diff={hasDifference(
									'framerate',
									'handheld',
								)}
							>
								<td>Framerate</td>
								{#each comparisonData as profile}
									<td
										>{formatFramerate(
											profile.profiles?.handheld,
										)}</td
									>
								{/each}
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}
	.modal-content {
		background-color: var(--surface-color);
		width: 90%;
		max-width: 1000px;
		max-height: 90vh;
		border-radius: var(--radius-lg);
		display: flex;
		flex-direction: column;
		box-shadow: var(--shadow-lg);
	}
	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid var(--border-color);
	}
	.modal-header h2 {
		margin: 0;
		font-size: 1.5rem;
	}
	.close-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.5rem;
		color: var(--text-secondary);
	}

	.modal-body {
		padding: 1.5rem;
		overflow-y: auto;
	}

	.version-selector h4 {
		margin: 0 0 1rem;
		font-size: 1rem;
		font-weight: 500;
	}
	.version-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-bottom: 2rem;
	}
	.version-tag {
		padding: 0.5rem 1rem;
		border: 1px solid var(--border-color);
		background-color: var(--surface-color);
		color: var(--text-secondary);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all 0.2s ease;
	}
	.version-tag:hover {
		border-color: var(--primary-color);
		color: var(--primary-color);
	}
	.version-tag.selected {
		background-color: var(--primary-color);
		border-color: var(--primary-color);
		color: var(--primary-action-text);
		font-weight: 500;
	}

	.comparison-table-wrapper {
		overflow-x: auto;
	}
	.comparison-table {
		width: 100%;
		border-collapse: collapse;
	}
	.comparison-table th,
	.comparison-table td {
		padding: 0.75rem 1rem;
		text-align: left;
		border-bottom: 1px solid var(--border-color);
	}
	.comparison-table th {
		font-weight: 600;
		color: var(--text-primary);
		white-space: nowrap;
	}
	.comparison-table .metric-header {
		position: sticky;
		left: 0;
		background-color: var(--surface-color);
		z-index: 1;
	}

	.comparison-table tbody td:first-child {
		font-weight: 500;
		color: var(--text-secondary);
		position: sticky;
		left: 0;
		background-color: var(--surface-color);
		z-index: 1;
	}

	.mode-row td {
		background-color: var(--input-bg);
		font-weight: 600;
		color: var(--text-primary);
	}

	.has-diff td {
		background-color: color-mix(
			in srgb,
			var(--primary-color) 10%,
			transparent
		);
	}
</style>
