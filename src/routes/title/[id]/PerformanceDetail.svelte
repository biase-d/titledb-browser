<script>
	/**
	 * @param {any} modeData
	 */
	function hasResolutionData(modeData) { return !!(modeData?.resolution || (modeData?.resolutions && modeData.resolutions.split(',').filter(Boolean).length > 0) || modeData?.min_res || modeData?.max_res); }
	let { performance, gameId } = $props();

	function formatResolution(modeData) {
		if (!modeData) return 'N/A';
		const getVerticalRes = (res) => res?.trim().split('x')[1] || '?';
		switch (modeData.resolution_type) {
			case 'Fixed':
				return `Fixed at ${getVerticalRes(modeData.resolution)}p`;
			case 'Dynamic':
				const min = getVerticalRes(modeData.min_res);
				const max = getVerticalRes(modeData.max_res);
				return `Dynamic ${min}p ~ ${max}p`;
			case 'Multiple Fixed':
				const resolutions = modeData.resolutions?.split(',').filter(Boolean).map(r => `${getVerticalRes(r)}p`).join(', ') || 'N/A';
				return `Multiple: ${resolutions}`;
			default:
				return 'N/A';
		}
	}

	function formatFramerate(modeData) {
		if (!modeData) return 'N/A';
		if (!modeData.target_fps) return modeData.fps_behavior || 'N/A';
		return `${modeData.target_fps} FPS`;
	}
</script>

{#if !performance || performance.docked == {} && performance.handheld == {}}
	<p class="no-data-message">No performance data has been submitted for this version</p>
{:else}
	<div class="perf-card">
		{#if performance.docked}
			{@const docked = performance.docked}
			<div>
				<h3 class="perf-mode-title">Docked</h3>
				<div class="perf-grid">
					{#if hasResolutionData(docked)}
						<div class="perf-item">
							<p class="label">Resolution</p>
							<p class="value">{formatResolution(docked)}</p>
							{#if docked.resolution_notes}<p class="subtext">{docked.resolution_notes}</p>{/if}
						</div>
					{/if}
					{#if docked.target_fps}
						<div class="perf-item">
							<p class="label">Framerate</p>
							<p class="value">{formatFramerate(docked)}</p>
							{#if docked.fps_notes}<p class="subtext">{docked.fps_notes}</p>{/if}
						</div>
					{/if}
				</div>
			</div>
		{/if}

		{#if performance.handheld}
			{@const handheld = performance.handheld}
			<div class="perf-mode-separator">
				<h3 class="perf-mode-title">Handheld</h3>
				<div class="perf-grid">
					{#if hasResolutionData(handheld)}
						<div class="perf-item">
							<p class="label">Resolution</p>
							<p class="value">{formatResolution(handheld)}</p>
							{#if handheld.resolution_notes}<p class="subtext">{handheld.resolution_notes}</p>{/if}
						</div>
					{/if}
					{#if handheld.target_fps}
						<div class="perf-item">
							<p class="label">Framerate</p>
							<p class="value">{formatFramerate(handheld)}</p>
							{#if handheld.fps_notes}<p class="subtext">{handheld.fps_notes}</p>{/if}
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.perf-card {
		background-color: var(--surface-color);
		border-radius: var(--border-radius);
		padding: 1.5rem 2rem;
		border: 1px solid var(--border-color);
	}
	.perf-mode-title {
		font-size: 1.25rem;
		font-weight: 600;
        margin-bottom: 1rem;
	}
	.perf-grid {
		display: grid;
		gap: 1.5rem;
	}
	@media (min-width: 640px) {
		.perf-grid {
			grid-template-columns: 1fr 1fr;
			gap: 2rem;
		}
	}
	.perf-item p {
        padding-bottom: 1rem;
		margin: 0;
	}
	.label {
		font-size: 0.875rem;
		color: var(--text-secondary);
		display: flex;
		align-items: cent
	}
	.value {
		font-weight: 600;
		font-size: 1.1rem;
	}
	.subtext {
		font-size: 0.9rem;
		color: var(--text-secondary);
		margin-top: 0.5rem;
		white-space: pre-wrap;
		word-break: break-word;
	}
	.perf-mode-separator {
		margin-top: 2rem;
		padding-top: 2rem;
		border-top: 1px solid var(--border-color);
	}
	.no-data-message {
		padding: 2rem;
		text-align: center;
		background-color: var(--surface-color);
		border-radius: var(--border-radius);
		border: 1px solid var(--border-color);
	}
</style>