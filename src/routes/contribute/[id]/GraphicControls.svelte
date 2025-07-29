<script>
	import Icon from '@iconify/svelte';

	let {
		initialSettings = null,
		onUpdate = (/** @type {Record<string, Record<string, string>>} */ settings) => {}
	} = $props();

	let settings = $state(initialSettings || {});
	let newSectionName = $state('');

	function addInitialSection() {
		if (Object.keys(settings).length === 0) {
			settings['Default'] = { '': '' };
			onUpdate(settings);
		}
	}

	function addSection() {
		if (newSectionName && !settings[newSectionName]) {
			settings[newSectionName] = { '': '' };
			newSectionName = '';
			onUpdate(settings);
		}
	}

	/**
     * @param {string} sectionName
     */
	function removeSection(sectionName) {
		delete settings[sectionName];
		onUpdate(settings);
	}

	/**
     * @param {string} sectionName
     */
	function addField(sectionName) {
		settings[sectionName][''] = '';
		onUpdate(settings);
	}

	/**
     * @param {string} sectionName
     * @param {string} oldKey
     * @param {string} newKey
     */
	function updateKey(sectionName, oldKey, newKey) {
		if (oldKey === newKey || newKey === '') return;
		const value = settings[sectionName][oldKey];
		delete settings[sectionName][oldKey];
		settings[sectionName][newKey] = value;
		onUpdate(settings);
	}

	/**
     * @param {string} sectionName
     * @param {string} key
     */
	function removeField(sectionName, key) {
		delete settings[sectionName][key];
		if (Object.keys(settings[sectionName]).length === 0) {
			delete settings[sectionName];
		}
		onUpdate(settings);
	}
</script>

<div class="graphics-controls-container">
	<h3>Graphics Settings</h3>
	<p>Add sections and fields to detail the game's graphical options. This data is for what the game offers, not necessarily what it achieves</p>

	{#if Object.keys(settings).length === 0}
		<button type="button" class="add-initial-btn" onclick={addInitialSection}>
			<Icon icon="mdi:plus" /> Add Graphics Settings
		</button>
	{:else}
		{#each Object.entries(settings) as [sectionName, fields] (sectionName)}
			<fieldset class="section-fieldset">
				<legend>
				{sectionName}
				{#if sectionName !== 'Default'}
					<button class="remove-btn" onclick={() => removeSection(sectionName)} title="Remove Section">
						<Icon icon="mdi:close-circle-outline" />
					</button>
				{/if}
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
						bind:value={settings[sectionName][key]}
						oninput={() => onUpdate(settings)}
						class="value-input"
					/>
					<button class="remove-btn" onclick={() => removeField(sectionName, key)} title="Remove Field">
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
			<input type="text" bind:value={newSectionName} placeholder="New Section Name" />
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
	.graphics-controls-container h3 {
		margin-top: 0;
	}
	.graphics-controls-container p {
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
</style>