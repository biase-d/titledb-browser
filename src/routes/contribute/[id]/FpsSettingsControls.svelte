<script>
	let { settingsData } = $props();

	let lockType = $state(settingsData.lockType || 'Unlocked');
	let targetFps = $state(settingsData.targetFps || '');
	let apiBuffering = $state(settingsData.apiBuffering || 'Unknown');
	let notes = $state(settingsData.notes || '');

	// Effect to sync state back to the parent object
	$effect(() => {
		settingsData.lockType = lockType;
		settingsData.targetFps = targetFps;
		settingsData.apiBuffering = apiBuffering;
		settingsData.notes = notes;

		if (lockType === 'Unlocked') {
			settingsData.targetFps = '';
		}
	});
</script>

<div class="form-group">
	<label for="fps_lock_type">FPS Lock Type</label>
	<select id="fps_lock_type" bind:value={lockType}>
		<option value="Unlocked">Unlocked</option>
		<option value="API">API Lock</option>
		<option value="Custom">Custom FPS Lock</option>
	</select>
</div>

<div class="form-group">
	<label for="api_buffering">Buffering Type</label>
	<select id="api_buffering" bind:value={apiBuffering}>
		<option value="Unknown">Unknown</option>
		<option value="Double">Double buffer</option>
		<option value="Double (Reversed)">Double buffer (Reversed)</option>
		<option value="Triple">Triple buffer</option>
		<option value="Quadruple">Quadruple buffer</option>
	</select>
</div>


{#if lockType !== 'Unlocked'}
	<div class="form-group">
		<label for="target_fps">Locked to X FPS</label>
		<input type="number" id="target_fps" bind:value={targetFps} placeholder="e.g., 30 or 60" />
	</div>
{/if}


{#if lockType === 'Custom' || lockType === 'API'}
	<div class="form-group form-group-full">
		<label for="fps_notes">Notes</label>
		<textarea id="fps_notes" bind:value={notes} placeholder="Any details about the FPS lock (e.g., custom methods, specific behaviors)..."></textarea>
	</div>
{/if}

<style>
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