<script>
	import Icon from '@iconify/svelte';
	let { mode = $bindable(), modeData = $bindable() } = $props();

	// Convert comma separated string from old drafts/data to an array for the new UI
	let multipleResolutions = $state(
		Array.isArray(modeData.resolutions) ? modeData.resolutions : (modeData.resolutions?.split(',').filter(Boolean) || [''])
	);

	$effect(() => {
		if (modeData.resolution_type !== 'Multiple Fixed') {
			multipleResolutions = [''];
		}
		if (modeData.resolution_type !== 'Dynamic') {
			modeData.min_res = '';
			modeData.max_res = '';
		}
		if (modeData.resolution_type !== 'Fixed') {
			modeData.resolution = '';
		}
	});

	$effect(() => {
		modeData.resolutions = multipleResolutions.join(',');
	});
</script>

<fieldset>
	<legend>{mode}</legend>

	<div class="form-grid">
		<div class="form-group">
			<label for="{mode.toLowerCase()}_resolution_type">Resolution Type</label>
			<select id="{mode.toLowerCase()}_resolution_type" bind:value={modeData.resolution_type}>
				<option value="Fixed">Fixed</option>
				<option value="Dynamic">Dynamic</option>
				<option value="Multiple Fixed">Multiple Fixed</option>
			</select>
		</div>

		{#if modeData.resolution_type === 'Fixed'}
			<div class="form-group">
				<label for="{mode.toLowerCase()}_resolution">Resolution</label>
				<input
					type="text"
					id="{mode.toLowerCase()}_resolution"
					bind:value={modeData.resolution}
					placeholder="e.g., 1920x1080"
					oninput={(e) => {
						// Enforce the '1234x567' format by stripping invalid characters
						e.currentTarget.value = e.currentTarget.value.replace(/[^0-9x]/g, '');
						modeData.resolution = e.currentTarget.value;
					}}
				/>
			</div>
		{/if}

		{#if modeData.resolution_type === 'Dynamic'}
			<div class="form-group">
				<label for="{mode.toLowerCase()}_min_res">Min Resolution</label>
				<input type="text" id="{mode.toLowerCase()}_min_res" bind:value={modeData.min_res} placeholder="e.g., 1280x720" />
			</div>
			<div class="form-group">
				<label for="{mode.toLowerCase()}_max_res">Max Resolution</label>
				<input type="text" id="{mode.toLowerCase()}_max_res" bind:value={modeData.max_res} placeholder="e.g., 1600x900" />
			</div>
		{/if}

		{#if modeData.resolution_type === 'Multiple Fixed'}
			<div class="form-group form-group-full">
				<label>Resolutions</label>
				<div class="dynamic-list">
					{#each multipleResolutions as res, i}
						<div class="dynamic-row">
							<input
								type="text"
								bind:value={multipleResolutions[i]}
								placeholder="e.g., 1280x720"
							/>
							{#if multipleResolutions.length > 1}
								<button type="button" class="remove-btn" onclick={() => multipleResolutions.splice(i, 1)}>
									<Icon icon="mdi:minus-circle" />
								</button>
							{/if}
						</div>
					{/each}
					<button type="button" class="add-btn" onclick={() => multipleResolutions.push('')}>
						<Icon icon="mdi:plus-circle" /> Add Resolution
					</button>
				</div>
			</div>
		{/if}

		<div class="form-group form-group-full">
			<label for="{mode.toLowerCase()}_resolution_notes">Resolution Notes</label>
			<textarea id="{mode.toLowerCase()}_resolution_notes" bind:value={modeData.resolution_notes} placeholder="Any details about upscaling, visual quality, etc."></textarea>
		</div>

		<div class="form-group">
			<label for="{mode.toLowerCase()}_fps_behavior">
				FPS Stability
				<div class="tooltip">
					<Icon icon="mdi:help-circle-outline" />
					<span class="tooltip-text">
						<strong>Locked:</strong> 99.9-100% of time at target.<br>
						<strong>Stable:</strong> 99-99.9% of time.<br>
						<strong>Unstable:</strong> 90-99% of time.<br>
						<strong>Very Unstable:</strong> Below 90% of time.
					</span>
				</div>
			</label>
			<select id="{mode.toLowerCase()}_fps_behavior" bind:value={modeData.fps_behavior}>
				<option value="Locked">Locked</option>
				<option value="Stable">Stable</option>
				<option value="Unstable">Unstable</option>
				<option value="Very Unstable">Very Unstable</option>
			</select>
		</div>

		<div class="form-group">
			<label for="{mode.toLowerCase()}_target_fps">Target FPS</label>
			<input type="number" id="{mode.toLowerCase()}_target_fps" bind:value={modeData.target_fps} placeholder="e.g., 30 or 60" />
		</div>

		<div class="form-group form-group-full">
			<label for="{mode.toLowerCase()}_fps_notes">FPS Notes</label>
			<textarea id="{mode.toLowerCase()}_fps_notes" bind:value={modeData.fps_notes} placeholder="Details on stability, common dips, etc."></textarea>
		</div>
	</div>
</fieldset>

<style>
	fieldset {
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
		padding: 1rem 1.5rem 1.5rem;
		margin-bottom: 1.5rem;
		background-color: var(--input-bg);
	}
	legend {
		font-weight: 600;
		padding: 0 0.5rem;
		color: var(--primary-color);
	}
	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
	}
	.form-group {
		display: flex;
		flex-direction: column;
	}
	.form-group-full {
		grid-column: 1 / -1;
	}
	label {
		font-weight: 500;
		margin-bottom: 0.5rem;
		font-size: 0.9rem;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}
	.tooltip {
		position: relative;
		display: inline-flex;
		align-items: center;
		color: var(--text-secondary);
	}
	.tooltip .tooltip-text {
		visibility: hidden;
		width: 220px;
		background-color: #333;
		color: #fff;
		text-align: left;
		border-radius: 6px;
		padding: 8px;
		position: absolute;
		z-index: 1;
		bottom: 125%;
		left: 50%;
		margin-left: -110px;
		opacity: 0;
		transition: opacity 0.3s;
		font-size: 0.8rem;
		line-height: 1.4;
	}
	.tooltip:hover .tooltip-text {
		visibility: visible;
		opacity: 1;
	}
	input, select, textarea {
		width: 100%;
		padding: 10px 12px;
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: 6px;
		color: var(--text-primary);
		box-sizing: border-box;
	}
	textarea {
		min-height: 80px;
		resize: vertical;
	}
	.dynamic-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.dynamic-row {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.dynamic-row input {
		flex-grow: 1;
	}
	.remove-btn {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--text-secondary);
		padding: 0.25rem;
		line-height: 1;
	}
	.remove-btn:hover {
		color: #e53e3e;
	}
	.add-btn {
		background-color: transparent;
		color: var(--primary-color);
		border: 1px solid var(--primary-color);
		padding: 0.5rem 1rem;
		border-radius: var(--border-radius);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.5rem;
		font-weight: 500;
		align-self: flex-start;
	}
	.add-btn:hover {
		background-color: var(--primary-color);
		color: white;
	}
</style>