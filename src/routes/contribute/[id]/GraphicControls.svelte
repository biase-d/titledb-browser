<script>
	import Icon from '@iconify/svelte';
	import ResolutionSettingsControls from './ResolutionSettingsControls.svelte';
	import FpsSettingsControls from './FpsSettingsControls.svelte';

	let {
		initialSettings = null,
		onUpdate = (/** @type {any} */ settings) => {}
	} = $props();

	// State is structured by mode with dedicated keys for structured and custom data
	let settings = $state({
		docked: {
			resolution: initialSettings?.docked?.resolution || {},
			framerate: initialSettings?.docked?.framerate || {},
			custom: initialSettings?.docked?.custom || {}
		},
		handheld: {
			resolution: initialSettings?.handheld?.resolution || {},
			framerate: initialSettings?.handheld?.framerate || {},
			custom: initialSettings?.handheld?.custom || {}
		},
		shared: initialSettings?.shared || {}
	});

	let isVisible = $state(Object.keys(initialSettings || {}).length > 0);

	$effect(() => {
		onUpdate(settings);
	});

	function hideAndReset() {
		isVisible = false;
		// Reset state to a blank slate to prevent submitting hidden data
		settings.docked = { resolution: {}, framerate: {}, custom: {} };
		settings.handheld = { resolution: {}, framerate: {}, custom: {} };
		settings.shared = {};
	}

	function addField(section) {
		settings[section][''] = { value: '', notes: '' };
	}
	function updateKey(section, oldKey, newKey) {
		if (oldKey === newKey || newKey === '') return;
		const value = settings[section][oldKey];
		delete settings[section][oldKey];
		settings[section][newKey] = value;
	}
	function removeField(section, key) {
		delete settings[section][key];
	}

	function addCustomField(mode) {
		settings[mode].custom[''] = { value: '', notes: '' };
	}
	function updateCustomKey(mode, oldKey, newKey) {
		if (oldKey === newKey || newKey === '') return;
		const value = settings[mode].custom[oldKey];
		delete settings[mode].custom[oldKey];
		settings[mode].custom[newKey] = value;
	}
	function removeCustomField(mode, key) {
		delete settings[mode].custom[key];
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
					<ResolutionSettingsControls bind:settingsData={settings.handheld.resolution} />
				</div>
				<hr />
				<div class="structured-grid">
					<FpsSettingsControls bind:settingsData={settings.handheld.framerate} />
				</div>
				{#each Object.entries(settings.handheld.custom) as [key, fieldData]}
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
			<fieldset>
				<legend>Docked Mode</legend>
				<div class="structured-grid">
					<ResolutionSettingsControls bind:settingsData={settings.docked.resolution} />
				</div>
				<hr />
				<div class="structured-grid">
					<FpsSettingsControls bind:settingsData={settings.docked.framerate} />
				</div>
				{#each Object.entries(settings.docked.custom) as [key, fieldData]}
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
				{#each Object.entries(settings.shared) as [key, fieldData]}
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