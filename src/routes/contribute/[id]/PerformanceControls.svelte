<script>
	let { mode, modeData = $bindable() } = $props()

	$effect(() => {
		if (modeData.resolution_type !== 'Multiple Fixed') {
			modeData.resolutions = '';
		}
		if (modeData.resolution_type !== 'Dynamic') {
			modeData.min_res = '';
			modeData.max_res = '';
		}
		if (modeData.resolution_type !== 'Fixed') {
			modeData.resolution = '';
		}
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
				<input type="text" id="{mode.toLowerCase()}_resolution" bind:value={modeData.resolution} placeholder="e.g., 1920x1080" />
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
			<div class="form-group">
				<label for="{mode.toLowerCase()}_resolutions">Resolutions (comma-separated)</label>
				<input type="text" id="{mode.toLowerCase()}_resolutions" bind:value={modeData.resolutions} placeholder="e.g., 1280x720,960x540" />
			</div>
		{/if}

		<div class="form-group form-group-full">
			<label for="{mode.toLowerCase()}_resolution_notes">Resolution Notes</label>
			<textarea id="{mode.toLowerCase()}_resolution_notes" bind:value={modeData.resolution_notes} placeholder="Any details about upscaling, visual quality, etc."></textarea>
		</div>

		<div class="form-group">
			<label for="{mode.toLowerCase()}_fps_behavior">FPS Behavior</label>
			<select id="{mode.toLowerCase()}_fps_behavior" bind:value={modeData.fps_behavior}>
				<option value="Locked">Locked</option>
				<option value="Unlocked">Unlocked</option>
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
</style>