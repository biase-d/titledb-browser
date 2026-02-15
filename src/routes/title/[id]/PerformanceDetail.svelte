<script>
	import Icon from '@iconify/svelte'

	const fpsBehaviorDefinitions = {
		Locked: '99.9-100% of time at target FPS.',
		Stable: '99-99.9% of time at target FPS.',
		Unstable: '90-99% of time at target FPS.',
		'Very Unstable': '0-90% of time at target FPS.',
	}

	/**
	 * @param {any} modeData
	 */
	function hasResolutionData (modeData) {
		return !!(
			modeData?.resolution ||
			(modeData?.resolutions &&
				modeData.resolutions.split(',').filter(Boolean).length > 0) ||
			modeData?.min_res ||
			modeData?.max_res
		)
	}
	let { performance } = $props()

	function formatResolution (modeData) {
		if (!modeData) return 'N/A'
		switch (modeData.resolution_type) {
			case 'Fixed': {
				const { resolution } = modeData
				return resolution ? `Fixed at ${resolution}` : 'N/A'
			}
			case 'Dynamic': {
				if (!modeData.min_res && !modeData.max_res) return 'Dynamic'
				const min = modeData.min_res || '?'
				const max = modeData.max_res || '?'
				return `Dynamic ${min} ~ ${max}`
			}
			case 'Multiple Fixed': {
				const resolutions =
					modeData.resolutions
						?.split(',')
						.filter(Boolean)
						.map((r) => r.trim())
						.join(', ') || 'N/A'
				return `Multiple: ${resolutions}`
			}
			default:
				return 'N/A'
		}
	}

	function formatFramerate (modeData) {
		if (!modeData) return 'N/A'
		if (!modeData.target_fps) return modeData.fps_behavior || 'N/A'
		return `${modeData.fps_behavior} ${modeData.target_fps} FPS`
	}
</script>

{#if !performance || (!performance.docked && !performance.handheld)}
	<div class="notice-card">
		<p>No performance data has been submitted for this version.</p>
	</div>
{:else}
	<div class="perf-card">
		{#if performance.handheld}
			{@const handheld = performance.handheld}
			<div class="mode-section">
				<h3 class="perf-mode-title">Handheld</h3>
				<div class="perf-grid">
					{#if hasResolutionData(handheld)}
						<div class="perf-item">
							<p class="label">Resolution</p>
							<p class="value">{formatResolution(handheld)}</p>
							{#if handheld.resolution_notes}<p class="subtext">
									{handheld.resolution_notes}
								</p>{/if}
						</div>
					{/if}
					{#if handheld.fps_behavior}
						<div class="perf-item">
							<p class="label">Framerate</p>
							<div class="value-with-tooltip">
								<p class="value">{formatFramerate(handheld)}</p>
								{#if handheld.fps_behavior && fpsBehaviorDefinitions[handheld.fps_behavior]}
									<div class="tooltip">
										<Icon icon="mdi:help-circle-outline" />
										<span class="tooltip-text"
											>{fpsBehaviorDefinitions[
												handheld.fps_behavior
											]}</span
										>
									</div>
								{/if}
							</div>
							{#if handheld.fps_notes}<p class="subtext">
									{handheld.fps_notes}
								</p>{/if}
						</div>
					{/if}
				</div>
			</div>
		{/if}

		{#if performance.docked}
			{@const docked = performance.docked}
			<div class="mode-section perf-mode-separator">
				<h3 class="perf-mode-title">Docked</h3>
				<div class="perf-grid">
					{#if hasResolutionData(docked)}
						<div class="perf-item">
							<p class="label">Resolution</p>
							<p class="value">{formatResolution(docked)}</p>
							{#if docked.resolution_notes}<p class="subtext">
									{docked.resolution_notes}
								</p>{/if}
						</div>
					{/if}
					{#if docked.fps_behavior}
						<div class="perf-item">
							<p class="label">Framerate</p>
							<div class="value-with-tooltip">
								<p class="value">{formatFramerate(docked)}</p>
								{#if docked.fps_behavior && fpsBehaviorDefinitions[docked.fps_behavior]}
									<div class="tooltip">
										<Icon icon="mdi:help-circle-outline" />
										<span class="tooltip-text"
											>{fpsBehaviorDefinitions[
												docked.fps_behavior
											]}</span
										>
									</div>
								{/if}
							</div>
							{#if docked.fps_notes}<p class="subtext">
									{docked.fps_notes}
								</p>{/if}
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
		border-radius: var(--radius-lg);
		padding: 2rem;
		border: 1px solid var(--border-color);
	}

	.perf-mode-title {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0 0 1.5rem 0;
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
		margin: 0;
	}

	.label {
		font-size: 0.875rem;
		color: var(--text-secondary);
		margin-bottom: 0.25rem;
	}

	.value {
		font-weight: 600;
		font-size: 1.1rem;
		color: var(--text-primary);
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

	.notice-card {
		padding: 2rem;
		text-align: center;
		background-color: var(--surface-color);
		border-radius: var(--radius-lg);
		border: 1px dashed var(--border-color);
	}
	.notice-card p {
		margin: 0;
	}

	.value-with-tooltip {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.tooltip {
		position: relative;
		display: inline-flex;
		align-items: center;
		color: var(--text-secondary);
		cursor: help;
	}

	.tooltip .tooltip-text {
		visibility: hidden;
		width: 220px;
		background-color: #333;
		color: #fff;
		text-align: center;
		border-radius: 6px;
		padding: 8px;
		position: absolute;
		z-index: 10;
		bottom: 125%;
		left: 50%;
		margin-left: -110px;
		opacity: 0;
		transition: opacity 0.3s;
		font-size: 0.85rem;
		font-weight: 400;
		line-height: 1.4;
		pointer-events: none;
	}

	.tooltip:hover .tooltip-text {
		visibility: visible;
		opacity: 1;
	}
</style>
