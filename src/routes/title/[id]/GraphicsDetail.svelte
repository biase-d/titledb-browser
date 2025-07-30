<script>
	let { settings } = $props();

	let resolutionSettings = $derived(settings?.Resolution || null);
	let framerateSettings = $derived(settings?.Framerate || null);
	let customSettings = $derived(omit(settings, ['Resolution', 'Framerate']));

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
				return `Locked to ${fpsData.targetFps} FPS (API)`;
			case 'Custom':
				return `Locked to ${fpsData.targetFps} FPS (Custom)`;
			default:
				return 'N/A';
		}
	}
</script>

<div class="section-container">
	<h2 class="section-title">Graphics Settings</h2>

	{#if !settings || Object.keys(settings).length === 0}
		<p class="no-data-message">No graphics settings have been submitted for this title yet.</p>
	{:else}
		<div class="card">
			<div class="setting-section">
				<div class="fields-grid">
					{#if resolutionSettings}
						<div class="field">
							<span class="field-key">Resolution</span>
							<span class="field-value">{formatResolution(resolutionSettings)}</span>
						</div>
					{/if}
					{#if framerateSettings}
						<div class="field">
							<span class="field-key">Framerate</span>
							<span class="field-value">{formatFramerate(framerateSettings)}</span>
							{#if framerateSettings.customLockDetails}
								<span class="field-note">{framerateSettings.customLockDetails}</span>
							{/if}
						</div>
					{/if}
				</div>
			</div>

			{#each Object.entries(customSettings) as [sectionName, fields]}
				<div class="setting-section">
					<h3 class="setting-section-title">{sectionName}</h3>
					<div class="fields-grid">
						{#each Object.entries(fields) as [key, value]}
							<div class="field">
								<span class="field-key">{key}</span>
								<span class="field-value">{value}</span>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.section-container {
		margin-top: 3rem;
	}
	.section-title {
		font-size: 1.5rem;
		font-weight: 700;
		margin-bottom: 1rem;
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