<script>
	import Icon from '@iconify/svelte';
	let { graphicsData = $bindable(), addResolution, removeResolution, addAdditionalLock, removeAdditionalLock, addGraphicsField, updateGraphicsKey, removeGraphicsField } = $props();
</script>

<section class="form-section">
	<div class="form-card">
		<div class="mode-container">
			<!-- Handheld Graphics Form -->
			<fieldset>
				<legend>Handheld Mode</legend>
				<h4 class="sub-legend">Resolution</h4>
				<div class="form-grid">
					<div class="form-group">
						<label>Resolution Type</label>
						<select bind:value={graphicsData.handheld.resolution.resolutionType}>
							<option value="Fixed">Fixed</option>
							<option value="Dynamic">Dynamic</option>
							<option value="Multiple Fixed">Multiple Fixed</option>
						</select>
					</div>
					{#if graphicsData.handheld.resolution.resolutionType === 'Fixed'}
					<div class="form-group">
						<label>Resolution</label>
						<input placeholder="e.g., 1280x720" bind:value={graphicsData.handheld.resolution.fixedResolution} />
					</div>
					{/if}
					{#if graphicsData.handheld.resolution.resolutionType === 'Dynamic'}
						<div class="form-group">
							<label>Min Resolution</label>
							<input placeholder="e.g., 960x540" bind:value={graphicsData.handheld.resolution.minResolution} />
						</div>
						<div class="form-group">
							<label>Max Resolution</label>
							<input placeholder="e.g., 1280x720" bind:value={graphicsData.handheld.resolution.maxResolution} />
						</div>
					{/if}
				</div>
				{#if graphicsData.handheld.resolution.resolutionType === 'Multiple Fixed'}
					<div class="additional-locks-section">
						<label class="group-label">Resolutions</label>
						{#each graphicsData.handheld.resolution.multipleResolutions as res, i}
							<div class="additional-lock-row resolution">
								<input placeholder="e.g., 1024x576" bind:value={graphicsData.handheld.resolution.multipleResolutions[i]} />
								{#if graphicsData.handheld.resolution.multipleResolutions.length > 1}
									<button type="button" class="remove-btn" onclick={() => removeResolution('handheld', i)}>
										<Icon icon="mdi:minus-circle" />
									</button>
								{/if}
							</div>
						{/each}
						<button type="button" class="add-btn" onclick={() => addResolution('handheld')}>
							<Icon icon="mdi:plus" /> Add Resolution
						</button>
					</div>
				{/if}
				<div class="form-group form-group-full notes-field">
					<label>Resolution Notes</label>
					<textarea placeholder="e.g., May exhibit some aliasing..." bind:value={graphicsData.handheld.resolution.notes}></textarea>
				</div>
				<hr/>
				<h4 class="sub-legend">Framerate</h4>
				<div class="form-grid">
					<div class="form-group">
						<label>Default FPS Lock Type</label>
						<select bind:value={graphicsData.handheld.framerate.lockType}>
							<option value="Unlocked">Unlocked</option>
							<option value="API">API</option>
							<option value="Custom">Custom</option>
							<option value="Unknown">Unknown</option>
						</select>
					</div>
					<div class="form-group">
						<label for="api_buffering">Buffering Type</label>
						<select id="api_buffering" bind:value={graphicsData.handheld.framerate.apiBuffering}>
							<option value="Unknown">Unknown</option>
							<option value="Double">Double buffer</option>
							<option value="Double (Reversed)">Double buffer (Reversed)</option>
							<option value="Triple">Triple buffer</option>
							<option value="Quadruple">Quadruple buffer</option>
						</select>
					</div>
					{#if graphicsData.handheld.framerate.lockType !== 'Unlocked'}
					<div class="form-group">
						<label>Default Target FPS</label>
						<input type="number" placeholder="e.g., 30" bind:value={graphicsData.handheld.framerate.targetFps} />
					</div>
					{/if}
				</div>
				<div class="form-group form-group-full">
					<label>Default Framerate Notes</label>
					<textarea placeholder="Details on default stability, common dips, etc." bind:value={graphicsData.handheld.framerate.notes}></textarea>
				</div>
				<div class="additional-locks-section">
					<label class="group-label">Additional FPS Lock Type</label>
					{#each graphicsData.handheld.framerate.additionalLocks || [] as lock, index}
						<div class="additional-lock-item">
							<div class="additional-lock-row">
								<select bind:value={lock.lockType} aria-label="Additional lock type">
									<option value="API">API Lock</option>
									<option value="Custom">Custom Lock</option>
									<option value="Unlocked">Unlocked</option>
									<option value="Unknown">Unknown</option>
								</select>
								<input type="number" placeholder="Target FPS" bind:value={lock.targetFps} disabled={lock.lockType === 'Unlocked'} aria-label="Additional target FPS" />
								<button type="button" class="remove-btn" onclick={() => removeAdditionalLock('handheld', index)}>
									<Icon icon="mdi:minus-circle" />
								</button>
							</div>
							<textarea class="notes-input" placeholder="Notes for this mode (e.g., 'Quality Mode')" bind:value={lock.notes}></textarea>
						</div>
					{/each}
					<button type="button" class="add-btn" onclick={() => addAdditionalLock('handheld')}>
						<Icon icon="mdi:plus" /> Add FPS Lock Type
					</button>
				</div>
				<hr/>
				<h4 class="sub-legend">Custom Settings</h4>
				{#each Object.entries(graphicsData.handheld.custom || {}) as [key, fieldData]}
					<div class="field-wrapper">
						<div class="field-row">
							<input type="text" placeholder="Custom Setting" value={key} onchange={(e) => updateGraphicsKey('handheld', key, e.currentTarget.value, 'custom')} />
							<input type="text" placeholder="Value" bind:value={fieldData.value} />
							<button type="button" class="remove-btn" onclick={() => removeGraphicsField('handheld', key, 'custom')}><Icon icon="mdi:minus-circle" /></button>
						</div>
						<textarea placeholder="Notes..." bind:value={fieldData.notes} class="notes-input"></textarea>
					</div>
				{/each}
				<button type="button" class="add-btn" onclick={() => addGraphicsField('handheld', 'custom')}><Icon icon="mdi:plus" /> Add Custom Setting</button>
			</fieldset>
			<!-- Docked Mode Graphics Form -->
			<fieldset class="docked">
				<legend>Docked Mode</legend>
				<h4 class="sub-legend">Resolution</h4>
				<div class="form-grid">
					<div class="form-group">
						<label>Resolution Type</label>
						<select bind:value={graphicsData.docked.resolution.resolutionType}>
							<option value="Fixed">Fixed</option>
							<option value="Dynamic">Dynamic</option>
							<option value="Multiple Fixed">Multiple Fixed</option>
						</select>
					</div>
					{#if graphicsData.docked.resolution.resolutionType === 'Fixed'}
						<div class="form-group">
							<label>Resolution</label>
							<input placeholder="e.g., 1920x1080" bind:value={graphicsData.docked.resolution.fixedResolution} />
						</div>
					{/if}
					{#if graphicsData.docked.resolution.resolutionType === 'Dynamic'}
						<div class="form-group">
							<label>Min Resolution</label>
							<input placeholder="e.g., 1600x900" bind:value={graphicsData.docked.resolution.minResolution} />
						</div>
						<div class="form-group">
							<label>Max Resolution</label>
							<input placeholder="e.g., 1920x1080" bind:value={graphicsData.docked.resolution.maxResolution} />
						</div>
					{/if}
				</div>
				{#if graphicsData.docked.resolution.resolutionType === 'Multiple Fixed'}
					<div class="additional-locks-section">
						<label class="group-label">Resolutions</label>
						{#each graphicsData.docked.resolution.multipleResolutions as res, i}
							<div class="additional-lock-row resolution">
								<input placeholder="e.g., 1280x720" bind:value={graphicsData.docked.resolution.multipleResolutions[i]} />
								{#if graphicsData.docked.resolution.multipleResolutions.length > 1}
									<button type="button" class="remove-btn" onclick={() => removeResolution('docked', i)}>
										<Icon icon="mdi:minus-circle" />
									</button>
								{/if}
							</div>
						{/each}
						<button type="button" class="add-btn" onclick={() => addResolution('docked')}>
							<Icon icon="mdi:plus" /> Add Resolution
						</button>
					</div>
				{/if}
				<div class="form-group form-group-full notes-field">
					<label>Resolution Notes</label>
					<textarea placeholder="e.g., Utilizes TAAU, FSR 1.0..." bind:value={graphicsData.docked.resolution.notes}></textarea>
				</div>
				<hr/>
				<h4 class="sub-legend">Framerate</h4>
				<div class="form-grid">
					<div class="form-group">
						<label>Default FPS Lock Type</label>
						<select bind:value={graphicsData.docked.framerate.lockType}>
							<option value="Unlocked">Unlocked</option>
							<option value="API">API</option>
							<option value="Custom">Custom</option>
							<option value="Unknown">Unknown</option>
						</select>
					</div>
					<div class="form-group">
						<label for="api_buffering">Buffering Type</label>
						<select id="api_buffering" bind:value={graphicsData.docked.framerate.apiBuffering}>
							<option value="Unknown">Unknown</option>
							<option value="Double">Double buffer</option>
							<option value="Double (Reversed)">Double buffer (Reversed)</option>
							<option value="Triple">Triple buffer</option>
							<option value="Quadruple">Quadruple buffer</option>
						</select>
					</div>
					{#if graphicsData.docked.framerate.lockType !== 'Unlocked'}
						<div class="form-group">
							<label>Default Target FPS</label>
							<input type="number" placeholder="e.g., 60" bind:value={graphicsData.docked.framerate.targetFps} />
						</div>
					{/if}
				</div>
				<div class="form-group form-group-full">
					<label>Default Framerate Notes</label>
					<textarea placeholder="Details on default stability, common dips, etc." bind:value={graphicsData.docked.framerate.notes}></textarea>
				</div>
				<div class="additional-locks-section">
					<label class="group-label">Additional FPS Lock Type</label>
					{#each graphicsData.docked.framerate.additionalLocks || [] as lock, index}
						<div class="additional-lock-item">
							<div class="additional-lock-row">
								<select bind:value={lock.lockType} aria-label="Additional lock type">
									<option value="API">API Lock</option>
									<option value="Custom">Custom Lock</option>
									<option value="Unlocked">Unlocked</option>
									<option value="Unknown">Unknown</option>
								</select>
								<input type="number" placeholder="Target FPS" bind:value={lock.targetFps} disabled={lock.lockType === 'Unlocked'} aria-label="Additional target FPS" />
								<button type="button" class="remove-btn" onclick={() => removeAdditionalLock('docked', index)}>
									<Icon icon="mdi:minus-circle" />
								</button>
							</div>
							<textarea class="notes-input" placeholder="Notes for this mode (e.g., 'Performance Mode')" bind:value={lock.notes}></textarea>
						</div>
					{/each}
					<button type="button" class="add-btn" onclick={() => addAdditionalLock('docked')}>
						<Icon icon="mdi:plus" /> Add FPS Lock Type
					</button>
				</div>
				<hr/>
				<h4 class="sub-legend">Custom Settings</h4>
				{#each Object.entries(graphicsData.docked.custom || {}) as [key, fieldData]}
					<div class="field-wrapper">
						<div class="field-row">
							<input type="text" placeholder="Custom Setting" value={key} onchange={(e) => updateGraphicsKey('docked', key, e.currentTarget.value, 'custom')} />
							<input type="text" placeholder="Value" bind:value={fieldData.value} />
							<button type="button" class="remove-btn" onclick={() => removeGraphicsField('docked', key, 'custom')}><Icon icon="mdi:minus-circle" /></button>
						</div>
						<textarea placeholder="Notes..." bind:value={fieldData.notes} class="notes-input"></textarea>
					</div>
				{/each}
				<button type="button" class="add-btn" onclick={() => addGraphicsField('docked', 'custom')}><Icon icon="mdi:plus" /> Add Custom Setting</button>
			</fieldset>
			<fieldset>
				<legend>Shared Settings</legend>
				{#each Object.entries(graphicsData.shared || {}) as [key, fieldData]}
					<div class="field-wrapper">
						<div class="field-row">
							<input type="text" placeholder="Shared Setting" value={key} onchange={(e) => updateGraphicsKey('shared', key, e.currentTarget.value, null)} />
							<input type="text" placeholder="Value" bind:value={fieldData.value} />
							<button type="button" class="remove-btn" onclick={() => removeGraphicsField('shared', key, null)}><Icon icon="mdi:minus-circle" /></button>
						</div>
						<textarea placeholder="Notes..." bind:value={fieldData.notes} class="notes-input"></textarea>
					</div>
				{/each}
				<button type="button" class="add-btn" onclick={() => addGraphicsField('shared', null)}><Icon icon="mdi:plus" /> Add Shared Setting</button>
			</fieldset>
		</div>
	</div>
</section>

<style>
	.form-card {
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
	}
	.mode-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	.form-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
	}
	@media (min-width: 640px) {
		.form-grid {
			grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		}
	}
	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.form-group-full { grid-column: 1 / -1; }
	.form-group label {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--text-secondary);
	}
	input, select, textarea {
		width: 100%;
		padding: 8px 12px;
		font-size: 1rem;
		font-family: inherit;
		color: var(--text-primary);
		background-color: var(--input-bg);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
	}
	textarea { min-height: 80px; resize: vertical; }
	fieldset {
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 1rem 1.5rem 1.5rem;
		background-color: var(--input-bg);
	}
	fieldset.docked {
		background-image: radial-gradient(color-mix(in srgb, var(--border-color) 30%, transparent) 1px, transparent 1px);
		background-size: 10px 10px;
	}
	legend {
		font-weight: 600;
		padding: 0 0.5rem;
		color: var(--primary-color);
	}
	.sub-legend {
		font-size: 1rem;
		font-weight: 500;
		margin: 1rem 0;
		padding-top: 1rem;
		border-top: 1px solid var(--border-color);
	}
	hr {
		border: none;
		border-top: 1px solid var(--border-color);
		margin: 1rem 0;
	}
	.additional-locks-section {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.75rem;
		margin-top: 1rem;
		width: 100%;
	}
	.additional-locks-section .group-label {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--text-secondary);
	}
	.additional-locks-section .add-btn {
		margin-top: 0.5rem;
		padding: 0.5rem 1rem;
	}
	.additional-lock-item {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
		padding-bottom: 0.75rem;
		border-bottom: 1px dashed var(--border-color);
	}
	.additional-lock-item:last-of-type {
		border-bottom: none;
		padding-bottom: 0;
	}
	.additional-lock-row {
		display: grid;
		grid-template-columns: 1fr 1fr auto;
		gap: 0.75rem;
		width: 100%;
		align-items: center;
	}
	.additional-lock-row.resolution {
		grid-template-columns: 1fr auto;
	}
	.additional-lock-row .remove-btn {
		height: 100%;
	}
	.notes-field {
		margin-top: 1rem;
	}
	.notes-input {
		font-size: 0.9rem;
		min-height: 40px !important;
	}
	.remove-btn {
		background: transparent;
		color: #ef4444;
		border: 1px solid transparent;
		border-radius: 50%;
		width: 38px;
		height: 38px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}
	.remove-btn:hover {
		background-color: color-mix(in srgb, #ef4444 10%, transparent);
		border-color: #ef4444;
	}
	.add-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		margin-top: 1.5rem;
		padding: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		color: var(--primary-color);
		background-color: var(--surface-color);
		border: 2px dashed var(--border-color);
		border-radius: var(--radius-lg);
		transition: all 0.2s;
	}
	.add-btn:hover {
		border-color: var(--primary-color);
		background-color: color-mix(in srgb, var(--primary-color) 5%, transparent);
	}
	.field-wrapper { margin-bottom: 1.5rem; }
	.field-row {
		display: grid;
		grid-template-columns: 1fr 1fr auto;
		gap: 1rem;
		align-items: center;
		margin-bottom: 0.5rem;
	}
</style>