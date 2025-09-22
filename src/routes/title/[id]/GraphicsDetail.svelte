<script>
	let { settings } = $props();

	let dockedSettings = $derived(settings?.docked || {});
	let handheldSettings = $derived(settings?.handheld || {});
	let sharedSettings = $derived(settings?.shared || {});
	let hasSharedSettings = $derived(sharedSettings && Object.entries(sharedSettings).some(([key, data]) => key && data.value));

 	function formatResolution(resData) {
 		if (!resData) return 'N/A';
 		switch (resData.resolutionType) {
			case 'Fixed':
				let { fixedRes } = resData;
				return fixedRes ? `Fixed at ${fixedRes}` : 'N/A'
 			case 'Dynamic':
 				const min = resData.minResolution || '?';
 				const max = resData.maxResolution || '?';
 				if (min === '?' && max === '?') return 'Dynamic';
 				return `Dynamic, ${min} to ${max}`;
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
		<p class="notice-card">No graphics settings have been submitted for this title yet</p>
	{:else}
		<div class="card">
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

							{#if handheldSettings.framerate.additionalLocks?.length > 0}
								<div class="additional-notes">
									<span class="field-note-extra">Additional FPS Lock:</span>
									<ul>
										{#each handheldSettings.framerate.additionalLocks as lock}
											<li>
												{formatFramerate(lock)}
												{#if lock.notes}<span class="field-note-nested">{lock.notes}</span>{/if}
											</li>
										{/each}
									</ul>
								</div>
							{/if}

							{#if handheldSettings.framerate.apiBuffering !== 'Unknown'}
								<span class="field-note">{formatBuffering(handheldSettings.framerate.apiBuffering)}</span>
							{/if}

							{#if handheldSettings.framerate.notes}
								<span class="field-note">{handheldSettings.framerate.notes}</span>
							{/if}

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

							{#if dockedSettings.framerate.additionalLocks?.length > 0}
								<div class="additional-notes">
									<span class="field-note-extra">Additional FPS Lock:</span>
									<ul>
										{#each dockedSettings.framerate.additionalLocks as lock}
											<li>
												{formatFramerate(lock)}
												{#if lock.notes}<span class="field-note-nested">{lock.notes}</span>{/if}
											</li>
										{/each}
									</ul>
								</div>
							{/if}

							{#if dockedSettings.framerate.apiBuffering !== 'Unknown'}
								<span class="field-note">{formatBuffering(dockedSettings.framerate.apiBuffering)}</span>
							{/if}
							
							{#if dockedSettings.framerate.notes}
								<span class="field-note">{dockedSettings.framerate.notes}</span>
							{/if}

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
	.card {
		background-color: var(--surface-color);
		border-radius: var(--radius-lg);
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
		font-size: 0.875rem;
		color: var(--text-secondary);
	}
	.field-value {
		font-weight: 600;
		color: var(--text-primary);
	}
	.field-note {
		font-size: 0.9rem;
		color: var(--text-secondary);
	}
	.field-note-extra {
		color: var(--primary-color);
		font-weight: 500;
		margin-top: 0.25rem;
	}
	.additional-notes {
		margin-top: 0.75rem;
	}
	.additional-notes ul {
		list-style-type: disc;
		padding-left: 1.25rem;
		margin: 0.5rem 0 0;
		font-size: 0.9rem;
		color: var(--text-secondary);
	}
	.additional-notes li {
		margin-bottom: 0.25rem;
	}
	.field-note-nested {
		display: block;
		margin-left: 1.25rem;
		font-style: italic;
		opacity: 0.8;
	}
	.notice-card {
		padding: 2rem;
		text-align: center;
		background-color: var(--surface-color);
		border-radius: var(--radius-lg);
		border: 1px dashed var(--border-color);
	}
</style>
