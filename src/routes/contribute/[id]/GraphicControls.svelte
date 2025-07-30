<script>
	import Icon from '@iconify/svelte';
	import ResolutionSettingsControls from './ResolutionSettingsControls.svelte';
	import FpsSettingsControls from './FpsSettingsControls.svelte';

	let {
		initialSettings = null,
		onUpdate = (/** @type {any} */ settings) => {}
	} = $props();

	let resolutionSettings = $state(initialSettings?.Resolution || {});
	let fpsSettings = $state(initialSettings?.Framerate || {});
	let customSettings = $state(omit(initialSettings, ['Resolution', 'Framerate']));
	
	let newSectionName = $state('');
	let isVisible = $state(Object.keys(initialSettings || {}).length > 0);

	function omit(obj, keys) {
		const newObj = {};
		for (const key in obj) {
			if (!keys.includes(key)) {
				newObj[key] = obj[key];
			}
		}
		return newObj;
	}

	$effect(() => {
		const allSettings = {
			...(Object.keys(resolutionSettings).length > 0 && { Resolution: resolutionSettings }),
			...(Object.keys(fpsSettings).length > 0 && { Framerate: fpsSettings }),
			...customSettings
		};
		onUpdate(allSettings);
	});
	
	function addInitialSection() {
		isVisible = true;
	}

	function addSection() {
		if (newSectionName && !customSettings[newSectionName]) {
			customSettings[newSectionName] = { '': '' };
			newSectionName = '';
		}
	}

	function removeSection(sectionName) {
		delete customSettings[sectionName];
	}

	function addField(sectionName) {
		customSettings[sectionName][''] = '';
	}

	function updateKey(sectionName, oldKey, newKey) {
		if (oldKey === newKey || newKey === '') return;
		const value = customSettings[sectionName][oldKey];
		delete customSettings[sectionName][oldKey];
		customSettings[sectionName][newKey] = value;
	}

	function removeField(sectionName, key) {
		delete customSettings[sectionName][key];
		if (Object.keys(customSettings[sectionName]).length === 0) {
			delete customSettings[sectionName];
		}
	}
</script>

<div class="graphics-controls-container">
	<div class="header">
		<h3>Graphics Settings</h3>
		{#if isVisible}
			<button type="button" class="toggle-visibility-btn" onclick={() => isVisible = false}>
				Hide
			</button>
		{/if}
	</div>
	
	{#if !isVisible}
		<button type="button" class="add-initial-btn" onclick={addInitialSection}>
			<Icon icon="mdi:plus" /> Add Graphics Settings
		</button>
	{:else}
		<p>Detail the game's graphical options. This data is for what the game *offers*, not necessarily what it achieves.</p>
		
		<fieldset class="section-fieldset">
			<legend>Resolution</legend>
			<div class="structured-grid">
				<ResolutionSettingsControls bind:settingsData={resolutionSettings} />
			</div>
		</fieldset>

		<fieldset class="section-fieldset">
			<legend>Framerate</legend>
			<div class="structured-grid">
				<FpsSettingsControls bind:settingsData={fpsSettings} />
			</div>
		</fieldset>

		<div class="custom-settings-header">
			<h4>Custom Settings</h4>
		</div>

		{#each Object.entries(customSettings) as [sectionName, fields] (sectionName)}
			<fieldset class="section-fieldset">
				<legend>
					{sectionName}
					<button type="button" class="remove-btn" onclick={() => removeSection(sectionName)} title="Remove Section">
						<Icon icon="mdi:close-circle-outline" />
					</button>
				</legend>
				
				{#each Object.entries(fields) as [key, value] (`${sectionName}-${key}`)}
					<div class="field-row">
						<input
							type="text"
							placeholder="Setting Name (e.g., V-Sync)"
							value={key}
							onchange={(e) => updateKey(sectionName, key, e.currentTarget.value)}
							class="key-input"
						/>
						<input
							type="text"
							placeholder="Value (e.g., Double-Buffered)"
							bind:value={customSettings[sectionName][key]}
							class="value-input"
						/>
						<button type="button" class="remove-btn" onclick={() => removeField(sectionName, key)} title="Remove Field">
							<Icon icon="mdi:minus-circle" />
						</button>
					</div>
				{/each}
				<button type="button" class="add-field-btn" onclick={() => addField(sectionName)}>
					<Icon icon="mdi:plus-circle" /> Add Field
				</button>
			</fieldset>
		{/each}

		<div class="add-section-form">
			<input type="text" bind:value={newSectionName} placeholder="New Custom Section" />
			<button type="button" onclick={addSection}>Add Section</button>
		</div>
	{/if}
</div>

<style>
	.graphics-controls-container {
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border-color);
	}
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.header h3 {
		margin: 0;
	}
	.toggle-visibility-btn {
		background: none;
		border: 1px solid var(--border-color);
		color: var(--text-secondary);
		padding: 4px 12px;
		border-radius: var(--border-radius);
		font-weight: 500;
		cursor: pointer;
	}
	p {
		font-size: 0.9rem;
		color: var(--text-secondary);
		margin-bottom: 1.5rem;
	}
	.section-fieldset {
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
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.structured-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem 1.5rem;
	}
	.field-row {
		display: grid;
		grid-template-columns: 1fr 1fr auto;
		gap: 1rem;
		align-items: center;
		margin-bottom: 0.75rem;
	}
	.key-input, .value-input {
		width: 100%;
		padding: 10px 12px;
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: 6px;
		color: var(--text-primary);
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
	.add-field-btn {
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
	}
	.add-field-btn:hover {
		background-color: var(--primary-color);
		color: white;
	}
	.add-initial-btn {
		background-color: var(--button-bg);
		color: var(--button-text);
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: var(--border-radius);
		cursor: pointer;
		font-weight: 600;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}
	.add-section-form {
		display: flex;
		gap: 1rem;
		margin-top: 1.5rem;
	}
	.add-section-form input {
		flex-grow: 1;
		padding: 10px 12px;
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: 6px;
		color: var(--text-primary);
	}
	.add-section-form button {
		background-color: var(--button-bg);
		color: var(--button-text);
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: var(--border-radius);
		cursor: pointer;
		font-weight: 600;
	}
	.custom-settings-header {
		margin-top: 2rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--border-color);
		margin-bottom: 1.5rem;
	}
	.custom-settings-header h4 {
		margin: 0;
		font-size: 1rem;
		color: var(--text-secondary);
	}
</style>