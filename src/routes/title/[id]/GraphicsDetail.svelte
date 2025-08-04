<script>
	let { settings } = $props();

	let dockedSettings = $derived(settings?.docked || {});
	let handheldSettings = $derived(settings?.handheld || {});
	let sharedSettings = $derived(settings?.shared || {});
	let hasSharedSettings = $derived(sharedSettings && Object.entries(sharedSettings).some(([key, data]) => key && data.value));

	function omit(obj, keys) {
		if (!obj) return {};
		const newObj = {};
		for (const key in obj) {
			if (!keys.includes(key)) {
				newObj[key] = obj[key];
			}
		}
		return newObj;
	}

	function formatResolution(resData) {
		if (!resData) return 'N/A';
		switch (resData.resolutionType) {
			case 'Fixed':
				return resData.fixedResolution || 'N/A';
			case 'Dynamic':
				return `Dynamic, ${resData.minResolution || '?'} to ${resData.maxResolution || '?'}`;
			case 'Multiple Fixed':
				return resData.multipleResolutions?.filter(Boolean).join(', ') || 'N/A';
			default:
				return 'N/A';
		}
	}

	function formatFramerate(fpsData) {
		if (!fpsData) return 'N/A';
		switch (fpsData.lockType) {
			case 'Unlocked':
				return 'Unlocked';
			case 'API':				
				return `API Locked to ${fpsData.targetFps} FPS`;
			case 'Custom':
				return `Custom Lock to ${fpsData.targetFps} FPS`;
			default:
				return 'N/A';
		}
	}

	function formatBuffering(buffering) {
		if (!buffering) return '';
		switch (buffering) {
			case 'Double':
				return 'Double buffer';
			case 'Double (Reversed)':
				return 'Double buffer (Reversed)';
			case 'Triple':
				return 'Triple buffer';
			case 'Quadruple':
				return 'Quadruple buffer';
			default:
				return buffering;
		}
	}

</script>

<div class="section-container">
	{#if !settings || Object.keys(settings).length === 0}
		<p class="no-data-message">No graphics settings have been submitted for this title yet</p>
	{:else}
		<div class="card">
			<!-- Docked -->
			<div class="setting-section">
				<h3 class="setting-section-title">Docked</h3>
				<div class="fields-grid">
					{#if dockedSettings.resolution}
						<div class="field">
							<span class="field-key">Resolution</span>
							<span class="field-value">{formatResolution(dockedSettings.resolution)}</span>
							{#if dockedSettings.resolution.notes}<span class="field-note">{dockedSettings.resolution.notes}</span>{/if}
						</div>
					{/if}
					{#if dockedSettings.framerate}
						<div class="field">
							<span class="field-key">Framerate</span>
							<span class="field-value">{formatFramerate(dockedSettings.framerate)}</span>							
							{#if dockedSettings.framerate.apiBuffering && dockedSettings.framerate.apiBuffering !== 'Unknown'}
								<span class="field-note">{formatBuffering(dockedSettings.framerate.apiBuffering)}</span>
							{/if}
							{#if dockedSettings.framerate.notes}<span class="field-note">{dockedSettings.framerate.notes}</span>{/if}
						</div>
					{/if}
					{#each Object.entries(dockedSettings.custom || {}).filter(([key, data]) => key && data.value) as [key, fieldData]}
						<div class="field">
							<span class="field-key">{key}</span>
							<span class="field-value">{fieldData.value}</span>
							{#if fieldData.notes}<span class="field-note">{fieldData.notes}</span>{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- Handheld -->
			<div class="setting-section">
				<h3 class="setting-section-title">Handheld</h3>
				<div class="fields-grid">
					{#if handheldSettings.resolution}
						<div class="field">
							<span class="field-key">Resolution</span>
							<span class="field-value">{formatResolution(handheldSettings.resolution)}</span>
							{#if handheldSettings.resolution.notes}<span class="field-note">{handheldSettings.resolution.notes}</span>{/if}
						</div>
					{/if}
					{#if handheldSettings.framerate}
						<div class="field">
							<span class="field-key">Framerate</span>
							<span class="field-value">{formatFramerate(handheldSettings.framerate)}</span>							
							{#if handheldSettings.framerate.apiBuffering && handheldSettings.framerate.apiBuffering !== 'Unknown'}
								<span class="field-note">{formatBuffering(handheldSettings.framerate.apiBuffering)}</span>
							{/if}
							{#if handheldSettings.framerate.notes}<span class="field-note">{handheldSettings.framerate.notes}</span>{/if}
						</div>
					{/if}
					{#each Object.entries(handheldSettings.custom || {}).filter(([key, data]) => key && data.value) as [key, fieldData]}
						<div class="field">
							<span class="field-key">{key}</span>
							<span class="field-value">{fieldData.value}</span>
							{#if fieldData.notes}<span class="field-note">{fieldData.notes}</span>{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- Shared -->
			{#if hasSharedSettings}
				<div class="setting-section">
					<h3 class="setting-section-title">Shared</h3>
					<div class="fields-grid">
						{#each Object.entries(sharedSettings) as [key, fieldData]}
							<div class="field">
								<span class="field-key">{key}</span>
								<span class="field-value">{fieldData.value}</span>
								{#if fieldData.notes}<span class="field-note">{fieldData.notes}</span>{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.section-container {
		margin-top: 1rem;
	}
	.card {
		background-color: var(--surface-color);
		border-radius: var(--border-radius);
		padding: 2rem;
		border: 1px solid var(--border-color);
	}
	.setting-section + .setting-section {
		margin-top: 2rem;
		padding-top: 2rem;
		border-top: 1px solid var(--border-color);
	}
	.setting-section-title {
		margin: 0 0 1.5rem 0;
		font-size: 1.25rem;
		font-weight: 600;
	}
	.fields-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 1.5rem;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.field-key {
		color: var(--text-secondary);
	}
	.field-value {
		font-weight: 600;
	}
	.field-note {
		font-size: 0.8rem;
		color: var(--text-secondary);
	}
	.no-data-message {
		padding: 2rem;
		text-align: center;
		background-color: var(--surface-color);
		border-radius: var(--border-radius);
		border: 1px solid var(--border-color);
	}
</style>