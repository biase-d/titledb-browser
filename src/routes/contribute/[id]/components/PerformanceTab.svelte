<script>
	import Icon from '@iconify/svelte'
	let { performanceProfiles = $bindable(), addNewVersion, removeVersion } = $props()
</script>

<section class="form-section">
	{#each performanceProfiles as profile, i (profile.id || profile.tempId)}
		<div class="form-card version-card">
			<div class="version-header">
				<h3 class="version-title">Profile for Version</h3>
				<div class="version-controls">
					<div class="form-field">
						<label for="game_version_{i}">Game Version</label>
						<input id="game_version_{i}" type="text" bind:value={profile.gameVersion} placeholder="e.g. 1.1.0" required />
					</div>
					<div class="form-field">
						<label for="version_suffix_{i}">Region / Suffix</label>
						<input id="version_suffix_{i}" type="text" bind:value={profile.suffix} placeholder="e.g. 'jp'" oninput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^a-zA-Z0-9_-]/g, '') }} />
					</div>
				</div>
				{#if performanceProfiles.length > 1}
					<button type="button" class="remove-version-btn" onclick={() => removeVersion(profile.id || profile.tempId)} aria-label={`Remove version ${profile.gameVersion || ''}`}>
						<Icon icon="mdi:delete-outline" aria-hidden="true" />
					</button>
				{/if}
			</div>
			<div class="mode-container">
				<!-- Handheld Performance -->
				<fieldset class="handheld">
					<legend>Handheld</legend>
					<div class="form-grid">
						<div class="form-group">
							<label for="handheld_resolution_type_{i}">Resolution Type</label>
							<select id="handheld_resolution_type_{i}" bind:value={profile.profiles.handheld.resolution_type}>
								<option value="Fixed">Fixed</option>
								<option value="Dynamic">Dynamic</option>
								<option value="Multiple Fixed">Multiple Fixed</option>
							</select>
						</div>
						{#if profile.profiles.handheld.resolution_type === 'Fixed'}
							<div class="form-group">
								<label for="handheld_resolution_{i}">Resolution</label>
								<input type="text" id="handheld_resolution_{i}" bind:value={profile.profiles.handheld.resolution} placeholder="e.g., 1280x720" />
							</div>
						{/if}
						{#if profile.profiles.handheld.resolution_type === 'Dynamic'}
							<div class="form-group">
								<label for="handheld_min_res_{i}">Min Resolution</label>
								<input type="text" id="handheld_min_res_{i}" bind:value={profile.profiles.handheld.min_res} placeholder="e.g., 960x540" />
							</div>
							<div class="form-group">
								<label for="handheld_max_res_{i}">Max Resolution</label>
								<input type="text" id="handheld_max_res_{i}" bind:value={profile.profiles.handheld.max_res} placeholder="e.g., 1280x720" />
							</div>
						{/if}
						{#if profile.profiles.handheld.resolution_type === 'Multiple Fixed'}
							<div class="form-group">
								<label for="handheld_resolutions_{i}">Resolutions (comma separated)</label>
								<input type="text" id="handheld_resolutions_{i}" bind:value={profile.profiles.handheld.resolutions} placeholder="e.g., 1280x720, 1024x576" />
							</div>
						{/if}
						<div class="form-group form-group-full">
							<label for="handheld_resolution_notes_{i}">Resolution Notes</label>
							<textarea id="handheld_resolution_notes_{i}" bind:value={profile.profiles.handheld.resolution_notes} placeholder="Upscaling, visual quality, etc."></textarea>
						</div>
						<div class="form-group">
							<label for="handheld_fps_behavior_{i}">
								FPS Stability
								<div class="tooltip">
									<Icon icon="mdi:help-circle-outline" />
									<span class="tooltip-text">
										<strong>Locked:</strong> 99.9-100% of time at target<br>
										<strong>Stable:</strong> 99-99.9% of time at target<br>
										<strong>Unstable:</strong> 90-99% of time at target<br>
										<strong>Very Unstable:</strong> 0-90% of time at target
									</span>
								</div>
							</label>
							<select id="handheld_fps_behavior_{i}" bind:value={profile.profiles.handheld.fps_behavior}>
								<option value="Locked">Locked</option>
								<option value="Stable">Stable</option>
								<option value="Unstable">Unstable</option>
								<option value="Very Unstable">Very Unstable</option>
							</select>
						</div>
						<div class="form-group">
							<label for="handheld_target_fps_{i}">Target FPS</label>
							<input type="number" id="handheld_target_fps_{i}" bind:value={profile.profiles.handheld.target_fps} placeholder="e.g., 30" />
						</div>
						<div class="form-group form-group-full">
							<label for="handheld_fps_notes_{i}">FPS Notes</label>
							<textarea id="handheld_fps_notes_{i}" bind:value={profile.profiles.handheld.fps_notes} placeholder="Common dips, stability details, etc."></textarea>
						</div>
					</div>
				</fieldset>
				<!-- Docked Performance -->
				<fieldset class="docked">
					<legend>Docked</legend>
					<div class="form-grid">
						<div class="form-group">
							<label for="docked_resolution_type_{i}">Resolution Type</label>
							<select id="docked_resolution_type_{i}" bind:value={profile.profiles.docked.resolution_type}>
								<option value="Fixed">Fixed</option>
								<option value="Dynamic">Dynamic</option>
								<option value="Multiple Fixed">Multiple Fixed</option>
							</select>
						</div>
						{#if profile.profiles.docked.resolution_type === 'Fixed'}
							<div class="form-group">
								<label for="docked_resolution_{i}">Resolution</label>
								<input type="text" id="docked_resolution_{i}" bind:value={profile.profiles.docked.resolution} placeholder="e.g., 1920x1080" />
							</div>
						{/if}
						{#if profile.profiles.docked.resolution_type === 'Dynamic'}
							<div class="form-group">
								<label for="docked_min_res_{i}">Min Resolution</label>
								<input type="text" id="docked_min_res_{i}" bind:value={profile.profiles.docked.min_res} placeholder="e.g., 1600x900" />
							</div>
							<div class="form-group">
								<label for="docked_max_res_{i}">Max Resolution</label>
								<input type="text" id="docked_max_res_{i}" bind:value={profile.profiles.docked.max_res} placeholder="e.g., 1920x1080" />
							</div>
						{/if}
						{#if profile.profiles.docked.resolution_type === 'Multiple Fixed'}
							<div class="form-group">
								<label for="docked_resolutions_{i}">Resolutions (comma separated)</label>
								<input type="text" id="docked_resolutions_{i}" bind:value={profile.profiles.docked.resolutions} placeholder="e.g., 1920x1080, 1600x900" />
							</div>
						{/if}
						<div class="form-group form-group-full">
							<label for="docked_resolution_notes_{i}">Resolution Notes</label>
							<textarea id="docked_resolution_notes_{i}" bind:value={profile.profiles.docked.resolution_notes} placeholder="Upscaling, visual quality, etc."></textarea>
						</div>
						<div class="form-group">
							<label for="docked_fps_behavior_{i}">
								FPS Stability
								<div class="tooltip">
									<Icon icon="mdi:help-circle-outline" />
									<span class="tooltip-text">
										<strong>Locked:</strong> 99.9-100% of time at target.<br>
										<strong>Stable:</strong> 99-99.9% of time.<br>
										<strong>Unstable:</strong> 90-99% of time.<br>
										<strong>Very Unstable:</strong> Below 90% of time.
									</span>
								</div>
							</label>
							<select id="docked_fps_behavior_{i}" bind:value={profile.profiles.docked.fps_behavior}>
								<option value="Locked">Locked</option>
								<option value="Stable">Stable</option>
								<option value="Unstable">Unstable</option>
								<option value="Very Unstable">Very Unstable</option>
							</select>
						</div>
						<div class="form-group">
							<label for="docked_target_fps_{i}">Target FPS</label>
							<input type="number" id="docked_target_fps_{i}" bind:value={profile.profiles.docked.target_fps} placeholder="e.g., 60" />
						</div>
						<div class="form-group form-group-full">
							<label for="docked_fps_notes_{i}">FPS Notes</label>
							<textarea id="docked_fps_notes_{i}" bind:value={profile.profiles.docked.fps_notes} placeholder="Common dips, stability details, etc."></textarea>
						</div>
					</div>
				</fieldset>
			</div>
		</div>
	{/each}
	<button type="button" class="add-version-btn" onclick={addNewVersion}>
		<Icon icon="mdi:plus-circle-outline" /> Add Data for Another Version
	</button>
</section>

<style>
	.form-card {
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
	}
	.version-card + .version-card { margin-top: 1.5rem; }
	.version-header {
		display: flex;
		align-items: flex-end;
		flex-wrap: wrap;
		gap: 1rem;
		padding-bottom: 1.5rem;
		margin-bottom: 1.5rem;
		border-bottom: 1px solid var(--border-color);
	}
	.version-title {
		font-size: 1.1rem;
		font-weight: 600;
		margin: 0;
	}
	.version-controls {
		display: flex;
		gap: 1rem;
		margin-left: auto;
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
	.form-field label, .form-group label {
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
	.form-field input { width: 120px; }
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
	.remove-version-btn {
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
	.remove-version-btn:hover {
		background-color: color-mix(in srgb, #ef4444 10%, transparent);
		border-color: #ef4444;
	}
	.add-version-btn {
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
	.add-version-btn:hover {
		border-color: var(--primary-color);
		background-color: color-mix(in srgb, var(--primary-color) 5%, transparent);
	}
	.tooltip { position: relative; display: inline-flex; align-items: center; color: var(--text-secondary); margin-left: 0.25rem; }
	.tooltip .tooltip-text { visibility: hidden; width: 250px; background-color: #333; color: #fff; text-align: left; border-radius: 6px; padding: 8px; position: absolute; z-index: 10; bottom: 125%; left: 50%; margin-left: -125px; opacity: 0; transition: opacity 0.3s; font-size: 0.8rem; line-height: 1.4; pointer-events: none; }
	.tooltip:hover .tooltip-text { visibility: visible; opacity: 1; }
	.tooltip-text strong { color: #eee; }
</style>