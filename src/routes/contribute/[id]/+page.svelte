	<script>
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { getDraft, saveDraft, deleteDraft } from '$lib/db.js';
	import { page } from '$app/state';
	import { browser } from '$app/environment'

	export let data;
	/** @type {import('./$types').ActionData} */
	export let form;

	const { id, name, existingData } = data;

	let performanceData = existingData || {
		docked: { resolution_type: 'Fixed', resolution: '', resolutions: '', min_res: '', max_res: '', resolution_notes: '', fps_behavior: 'Locked', target_fps: 30, fps_notes: '' },
		handheld: { resolution_type: 'Fixed', resolution: '', resolutions: '', min_res: '', max_res: '', resolution_notes: '', fps_behavior: 'Locked', target_fps: 30, fps_notes: '' }
	};

	$: if (performanceData.docked.resolution_type !== 'Multiple Fixed') {
		performanceData.docked.resolutions = '';
	}
	$: if (performanceData.handheld.resolution_type !== 'Multiple Fixed') {
		performanceData.handheld.resolutions = '';
	}

	let debounceTimer;

	onMount(async () => {
		const savedDraft = await getDraft(id);
		if (savedDraft) {
			const fromDrafts = page.url.searchParams.get('from_draft') === 'true';

			if (fromDrafts) {
				performanceData = savedDraft;
			} else {
				if (confirm('You have a saved draft for this game. Would you like to restore it?')) {
					performanceData = savedDraft;
				}
			}
		}
	});

	$: if (browser && performanceData) {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			saveDraft(id, performanceData);
		}, 500);
	}

</script>

<svelte:head>
	<title>Contribute Data for {name}</title>
</svelte:head>

<div class="form-container">
	<a href={`/title/${id}`} class="back-link">← Back to Game Page</a>
	<h1>Contribute Performance Data</h1>
	<p class="subtitle">You are adding data for: <strong>{name}</strong> ({id})</p>

	{#if form?.success}
		<div class="success-message">
			<h2>Submission Successful!</h2>
			<p>Your contribution has been submitted for review. Thank you!</p>
			<a href={form.prUrl} target="_blank" rel="noopener noreferrer" class="pr-link">View Pull Request on GitHub</a>
			<a href="/" class="back-link-main">Return to Home</a>
		</div>
	{:else}
		<form method="POST" use:enhance={() => {
			return async ({ update }) => {
				await deleteDraft(id);
				await update();
			};
		}}>
			<!-- Hidden inputs to pass crucial data to the form action -->
			<input type="hidden" name="titleId" value={id} />
			<input type="hidden" name="gameName" value={name} />
			<input type="hidden" name="performanceData" value={JSON.stringify(performanceData)} />
			<input type="hidden" name="sha" value={data.existingSha ?? ''} />

			<div class="mode-grid">
				<fieldset>
					<legend>Handheld Mode</legend>
					<div class="form-group">
						<label for="handheld-res-type">Resolution Type</label>
						<select id="handheld-res-type" bind:value={performanceData.handheld.resolution_type}>
							<option value="Fixed">Fixed</option>
							<option value="Dynamic">Dynamic</option>
							<option value="Multiple Fixed">Multiple Fixed</option>
						</select>
					</div>
					{#if performanceData.handheld.resolution_type === 'Fixed'}
						<div class="form-group"><label for="handheld-res">Resolution</label><input id="handheld-res" type="text" placeholder="e.g., 720p" bind:value={performanceData.handheld.resolution} /></div>
					{:else if performanceData.handheld.resolution_type === 'Dynamic'}
						<div class="form-group-inline">
							<div class="form-group"><label for="handheld-min-res">Min Resolution</label><input id="handheld-min-res" type="text" placeholder="e.g., 540p" bind:value={performanceData.handheld.min_res} /></div>
							<div class="form-group"><label for="handheld-max-res">Max Resolution</label><input id="handheld-max-res" type="text" placeholder="e.g., 720p" bind:value={performanceData.handheld.max_res} /></div>
						</div>
					{:else if performanceData.handheld.resolution_type === 'Multiple Fixed'}
						<div class="form-group">
							<label for="handheld-resolutions">Resolutions (comma-separated)</label>
							<input id="handheld-resolutions" type="text" placeholder="e.g., 1280x720, 960x540" bind:value={performanceData.handheld.resolutions} disabled={performanceData.handheld.resolution_type !== 'Multiple Fixed'} />
						</div>
					{/if}

					<div class="form-group">
						<label for="handheld-res-notes">Resolution Notes</label>
						<textarea id="handheld-res-notes" placeholder="e.g. Graphics settings has no impact" bind:value={performanceData.handheld.resolution_notes}></textarea>
					</div>
					<div class="form-group-inline">
						<div class="form-group"><label for="handheld-fps-behavior">FPS Behavior</label><select id="handheld-fps-behavior" bind:value={performanceData.handheld.fps_behavior}><option value="Locked">Locked</option><option value="Unlocked">Unlocked</option></select></div>
						<div class="form-group"><label for="handheld-target-fps">Target FPS</label><input id="handheld-target-fps" type="number" placeholder="e.g., 30" bind:value={performanceData.handheld.target_fps} /></div>
					</div>

					<div class="form-group">
						<label for="handheld-fps-notes">Framerate Notes</label>
						<textarea id="handheld-fps-notes" placeholder="e.g., More frequent dips than docked..." bind:value={performanceData.handheld.fps_notes}></textarea>
					</div>
				</fieldset>
				<fieldset>
					<legend>Docked Mode</legend>
					<div class="form-group">
						<label for="docked-res-type">Resolution Type</label>
						<select id="docked-res-type" bind:value={performanceData.docked.resolution_type}>
							<option value="Fixed">Fixed</option>
							<option value="Dynamic">Dynamic</option>
							<option value="Multiple Fixed">Multiple Fixed</option>
						</select>
					</div>
					{#if performanceData.docked.resolution_type === 'Fixed'}
						<div class="form-group"><label for="docked-res">Resolution</label><input id="docked-res" type="text" placeholder="e.g., 1080p" bind:value={performanceData.docked.resolution} /></div>
					{:else if performanceData.docked.resolution_type === 'Dynamic'}
						<div class="form-group-inline">
							<div class="form-group"><label for="docked-min-res">Min Resolution</label><input id="docked-min-res" type="text" placeholder="e.g., 672p" bind:value={performanceData.docked.min_res} /></div>
							<div class="form-group"><label for="docked-max-res">Max Resolution</label><input id="docked-max-res" type="text" placeholder="e.g., 900p" bind:value={performanceData.docked.max_res} /></div>
						</div>
				{:else if performanceData.docked.resolution_type === 'Multiple Fixed'}
					<div class="form-group">
						<label for="docked-resolutions">Resolutions (comma-separated)</label>
						<input id="docked-resolutions" type="text" placeholder="e.g., 1920x1080, 1600x900" bind:value={performanceData.docked.resolutions} disabled={performanceData.docked.resolution_type !== 'Multiple Fixed'} />
					</div>
				{/if}

				<div class="form-group">
					<label for="docked-res-notes">Resolution Notes</label>
					<textarea id="docked-res-notes" placeholder="e.g., Quality vs Performance modes, anamorphic scaling..." bind:value={performanceData.docked.resolution_notes}></textarea>
				</div>
					<div class="form-group-inline">
						<div class="form-group"><label for="docked-fps-behavior">FPS Behavior</label><select id="docked-fps-behavior" bind:value={performanceData.docked.fps_behavior}><option value="Locked">Locked</option><option value="Unlocked">Unlocked</option></select></div>
						<div class="form-group"><label for="docked-target-fps">Target FPS</label><input id="docked-target-fps" type="number" placeholder="e.g., 30" bind:value={performanceData.docked.target_fps} /></div>
					</div>

				<div class="form-group">
					<label for="docked-fps-notes">Framerate Notes</label>
					<textarea id="docked-fps-notes" placeholder="e.g., Dips in certain areas, unlocked in menus..." bind:value={performanceData.docked.fps_notes}></textarea>
				</div>
				</fieldset>
			</div>
			<div class="form-footer"><button type="submit" class="submit-button">Submit for Review</button></div>
		</form>
	{/if}

	{#if form?.error}
		<p class="error-message">Error: {form.error}</p>
	{/if}
</div>

<style>
	.success-message {
		background-color: #dcfce7;
		color: #166534;
		border: 1px solid #4ade80;
		padding: 1.5rem;
		border-radius: var(--border-radius);
		text-align: center;
	}
	.success-message h2 {
		margin: 0 0 0.5rem;
		color: var(--text-primary);
	}
	.success-message p {
		margin-bottom: 1.5rem;
		color: var(--text-secondary);
	}

	.pr-link {
		display: inline-block;
		padding: 10px 20px;
		background-color: #16a34a;
		color: white;
		text-decoration: none;
		border-radius: 6px;
		font-weight: 500;
	}

	.back-link-main {
		display: block;
		margin-top: 1.5rem;
		color: var(--text-secondary);
	}

	.error-message {
		color: #b91c1c;
		background-color: #fee2e2;
		border: 1px solid #f87171;
		padding: 1rem;
		border-radius: var(--border-radius);
		margin-top: 1rem;
		font-weight: 500;
	}

	body.dark .error-message {
		color: #fca5a5;
		background-color: #450a0a;
		border-color: #ef4444;
	}

	.form-container {
		max-width: 800px;
		margin: 0 auto;
	}

	.back-link {
		display: inline-block;
		margin-bottom: 2rem;
		color: var(--text-secondary);
	}

	h1 {
		font-size: 2.5rem;
		font-weight: 700;
		margin: 0;
		color: var(--text-primary);
	}

	.subtitle {
		font-size: 1.1rem;
		margin: 0.5rem 0 2.5rem;
		color: var(--text-secondary);
	}

	.mode-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2.5rem;
	}
	@media (max-width: 800px) {
		.mode-grid {
			grid-template-columns: 1fr;
		}
	}

	fieldset {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		padding: 1.5rem;
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
	}

	legend {
		padding: 0 0.5rem;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.form-group {
		display: flex;
		flex-direction: column;
	}

	.form-group-inline {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	label {
		margin-bottom: 0.5rem;
		font-weight: 500;
		font-size: 0.9rem;
	}

	input,
	select,
	textarea {
		width: 100%;
		padding: 10px 12px;
		font-size: 1rem;
		color: var(--text-primary);
		background-color: var(--input-bg);
		border: 1px solid var(--border-color);
		border-radius: 6px;
		box-sizing: border-box;
	}

	textarea {
		min-height: 80px;
		resize: vertical;
	}

	.form-footer {
		margin-top: 2rem;
		padding-top: 1.5rem;
		text-align: right;
		border-top: 1px solid var(--border-color);
	}

	.submit-button {
		padding: 12px 24px;
		font-size: 1rem;
		font-weight: 500;
		color: var(--primary-action-text);
		background-color: var(--primary-color);
		border: none;
		border-radius: 6px;
		cursor: pointer;
	}
</style>
