<script>
	import Icon from '@iconify/svelte';
	let { settingsData } = $props();

	let resolutionType = $state(settingsData.resolutionType || 'Fixed');
	let fixedResolution = $state(settingsData.fixedResolution || '');
	let minResolution = $state(settingsData.minResolution || '');
	let maxResolution = $state(settingsData.maxResolution || '');
	let multipleResolutions = $state(settingsData.multipleResolutions || ['']);
	let notes = $state(settingsData.notes || '');

	$effect(() => {
		settingsData.resolutionType = resolutionType;
		settingsData.fixedResolution = fixedResolution;
		settingsData.minResolution = minResolution;
		settingsData.maxResolution = maxResolution;
		settingsData.multipleResolutions = multipleResolutions;
		settingsData.notes = notes;

		if (resolutionType !== 'Multiple Fixed') settingsData.multipleResolutions = [''];
		if (resolutionType !== 'Dynamic') {
			settingsData.minResolution = '';
			settingsData.maxResolution = '';
		}
		if (resolutionType !== 'Fixed') settingsData.fixedResolution = '';
	});
</script>

<div class="form-group">
	<label for="resolution_type">Resolution Type</label>
	<select id="resolution_type" bind:value={resolutionType}>
		<option value="Fixed">Fixed</option>
		<option value="Dynamic">Dynamic</option>
		<option value="Multiple Fixed">Multiple Fixed</option>
	</select>
</div>

{#if resolutionType === 'Fixed'}
	<div class="form-group">
		<label for="resolution">Resolution</label>
		<input
			type="text"
			id="resolution"
			bind:value={fixedResolution}
			placeholder="e.g., 1920x1080"
			oninput={(e) => {
				e.currentTarget.value = e.currentTarget.value.replace(/[^0-9x]/g, '');
				fixedResolution = e.currentTarget.value;
			}}
		/>
	</div>
{/if}

{#if resolutionType === 'Dynamic'}
	<div class="form-group">
		<label for="min_res">Min Resolution</label>
		<input type="text" id="min_res" bind:value={minResolution} placeholder="e.g., 1280x720" />
	</div>
	<div class="form-group">
		<label for="max_res">Max Resolution</label>
		<input type="text" id="max_res" bind:value={maxResolution} placeholder="e.g., 1600x900" />
	</div>
{/if}

{#if resolutionType === 'Multiple Fixed'}
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
	<label for="resolution_notes">Resolution Notes</label>
	<textarea id="resolution_notes" bind:value={notes} placeholder="Any details about upscaling, visual quality, etc."></textarea>
</div>

<style>
	textarea {
		min-height: 80px;
		resize: vertical;
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
	.remove-btn, .add-btn {
		background: none;
		border: none;
		cursor: pointer;
		line-height: 1;
	}
	.remove-btn {
		color: var(--text-secondary);
	}
	.add-btn {
		background-color: transparent;
		color: var(--primary-color);
		border: 1px solid var(--primary-color);
		padding: 0.5rem 1rem;
		border-radius: var(--border-radius);
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.5rem;
		font-weight: 500;
		align-self: flex-start;
	}
</style>