<script>
	import Icon from '@iconify/svelte';
	import ResolutionSettingsControls from './ResolutionSettingsControls.svelte';
	import FpsSettingsControls from './FpsSettingsControls.svelte';

	let { settings = $bindable() } = $props();

	let internalSettings = $state({
		docked: {
			resolution: settings.docked?.resolution || {},
			framerate: settings.docked?.framerate || {},
			custom: settings.docked?.custom || {}
		},
		handheld: {
			resolution: settings.handheld?.resolution || {},
			framerate: settings.handheld?.framerate || {},
			custom: settings.handheld?.custom || {}
		},
		shared: settings.shared || {}
	});

	let isVisible = $state(Object.keys(settings).length > 0);
	
	$effect(() => {
		settings = isVisible ? internalSettings : {};
	});

	$effect(() => {
		if (isVisible) {
			const cleanSettings = JSON.parse(JSON.stringify(internalSettings));

			const filterEmpty = (customObj) => {
                if (!customObj) return {};
                const result = {};
                for (const key in customObj) {
                    if (key.trim() !== '' && customObj[key].value.trim() !== '') {
                        result[key] = customObj[key];
                    }
                }
                return result;
            }

			cleanSettings.docked.custom = filterEmpty(cleanSettings.docked.custom);
            cleanSettings.handheld.custom = filterEmpty(cleanSettings.handheld.custom);
            cleanSettings.shared = filterEmpty(cleanSettings.shared);

			onUpdate(cleanSettings);
		}
	});

	function hideAndReset() {
		isVisible = false;
		// Reset state to a blank slate
		internalSettings.docked = { resolution: {}, framerate: {}, custom: {} };
		internalSettings.handheld = { resolution: {}, framerate: {}, custom: {} };
		internalSettings.shared = {};
	}

	function addField(section) {
		internalSettings[section][''] = { value: '', notes: '' };
	}
	function updateKey(section, oldKey, newKey) {
		if (oldKey === newKey || newKey === '') return;
		const value = internalSettings[section][oldKey];
		delete internalSettings[section][oldKey];
		internalSettings[section][newKey] = value;
	}
	function removeField(section, key) {
		delete internalSettings[section][key];
	}

	function addCustomField(mode) {
		internalSettings[mode].custom[''] = { value: '', notes: '' };
	}
	function updateCustomKey(mode, oldKey, newKey) {
		if (oldKey === newKey || newKey === '') return;
		const value = internalSettings[mode].custom[oldKey];
		delete internalSettings[mode].custom[oldKey];
		internalSettings[mode].custom[newKey] = value;
	}
	function removeCustomField(mode, key) {
		delete internalSettings[mode].custom[key];
	}
</script>

<div class="container">
	<div class="header">
		<h3>Graphics Settings</h3>
		{#if isVisible}
			<button type="button" class="toggle-btn" onclick={hideAndReset}>Reset</button>
		{/if}
	</div>

	{#if !isVisible}
		<button type="button" class="add-initial-btn" onclick={() => isVisible = true}>
			<Icon icon="mdi:plus" /> Add Graphics Settings
		</button>
	{:else}
		<p>Detail the game's graphical options. Add settings that apply to both modes, or mode-specific ones.</p>
		
		<div class="settings-sections">
			<!-- Handheld Mode -->
			<fieldset>
				<legend>Handheld Mode</legend>
				<div class="structured-grid">
					<ResolutionSettingsControls bind:settingsData={internalSettings.handheld.resolution} />
				</div>
				<hr />
				<div class="structured-grid">
					<FpsSettingsControls bind:settingsData={internalSettings.handheld.framerate} />
				</div>
				{#each Object.entries(internalSettings.handheld.custom) as [key, fieldData]}
					<div class="field-wrapper">
						<div class="field-row">
							<input type="text" placeholder="Custom Setting" value={key} onchange={(e) => updateCustomKey('handheld', key, e.currentTarget.value)} />
							<input type="text" placeholder="Value" bind:value={fieldData.value} />
							<button type="button" class="remove-btn" onclick={() => removeCustomField('handheld', key)}><Icon icon="mdi:minus-circle" /></button>
						</div>
						<textarea placeholder="Notes (optional)..." bind:value={fieldData.notes} class="notes-input"></textarea>
					</div>
				{/each}
				<button type="button" class="add-btn" onclick={() => addCustomField('handheld')}><Icon icon="mdi:plus" /> Add Custom Handheld Setting</button>
			</fieldset>

			<!-- Docked Mode -->
			<fieldset class='docked'>
				<legend>Docked Mode</legend>
				<div class="structured-grid">
					<ResolutionSettingsControls bind:settingsData={internalSettings.docked.resolution} />
				</div>
				<hr />
				<div class="structured-grid">
					<FpsSettingsControls bind:settingsData={internalSettings.docked.framerate} />
				</div>
				{#each Object.entries(internalSettings.docked.custom) as [key, fieldData]}
					<div class="field-wrapper">
						<div class="field-row">
							<input type="text" placeholder="Custom Setting" value={key} onchange={(e) => updateCustomKey('docked', key, e.currentTarget.value)} />
							<input type="text" placeholder="Value" bind:value={fieldData.value} />
							<button type="button" class="remove-btn" onclick={() => removeCustomField('docked', key)}><Icon icon="mdi:minus-circle" /></button>
						</div>
						<textarea placeholder="Notes (optional)..." bind:value={fieldData.notes} class="notes-input"></textarea>
					</div>
				{/each}
				<button type="button" class="add-btn" onclick={() => addCustomField('docked')}><Icon icon="mdi:plus" /> Add Custom Docked Setting</button>
			</fieldset>

			<!-- Shared Settings -->
			<fieldset>
				<legend>Shared (Applies to Both)</legend>
				{#each Object.entries(internalSettings.shared) as [key, fieldData]}
					<div class="field-wrapper">
						<div class="field-row">
							<input type="text" placeholder="Shared Setting" value={key} onchange={(e) => updateKey('shared', key, e.currentTarget.value)} />
							<input type="text" placeholder="Value" bind:value={fieldData.value} />
							<button type="button" class="remove-btn" onclick={() => removeField('shared', key)}><Icon icon="mdi:minus-circle" /></button>
						</div>
						<textarea placeholder="Notes (optional)..." bind:value={fieldData.notes} class="notes-input"></textarea>
					</div>
				{/each}
				<button type="button" class="add-btn" onclick={() => addField('shared')}><Icon icon="mdi:plus" /> Add Shared Setting</button>
			</fieldset>
		</div>
	{/if}
</div>

<style>
	fieldset.docked {
		background-image: radial-gradient(color-mix(in srgb, var(--border-color) 30%, transparent) 1px, transparent 1px);
		background-size: 10px 10px;
	}
	.container {
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border-color);
	}

	.settings-sections {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
	}

	.structured-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem 1.5rem;
		margin-bottom: 1rem;
	}

	.field-wrapper {
		margin-bottom: 1.5rem;
	}
	.field-row {
		display: grid;
		grid-template-columns: 1fr 1fr auto;
		gap: 1rem;
		align-items: center;
		margin-bottom: 0.5rem;
	}
	.notes-input {
		font-size: 0.9rem;
		min-height: 60px;
		resize: vertical;
		width: 100%;
		padding: 10px 12px;
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: 6px;
		color: var(--text-primary);
	}
	/* Header */
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header h3 {
		margin: 0;
	}

	.toggle-btn {
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

	legend {
		font-weight: 600;
		padding: 0 0.5rem;
		color: var(--primary-color);
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
		font-weight: 500;
		margin-top: 1rem;
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

	.remove-btn {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--text-secondary);
	}

	input {
		width: 100%;
		padding: 10px 12px;
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: 6px;
		color: var(--text-primary);
	}

	fieldset {
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
		padding: 1.5rem;
		background-color: var(--input-bg);
	}

	hr {
		border: none;
		border-top: 1px solid var(--border-color);
		margin: 1.5rem 0;
	}
</style>