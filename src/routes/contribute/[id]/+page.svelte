<script>
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { getDraft, deleteDraft } from '$lib/indexedDB';
	import { draftsStore } from '$lib/stores';
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import GroupingControls from './GroupingControls.svelte';
	import GraphicsControls from './GraphicControls.svelte';
	import PerformanceControls from './PerformanceControls.svelte';
	import YoutubeControls from './YoutubeControls.svelte';
	import ConfirmationModal from './ConfirmationModal.svelte';
	import Icon from '@iconify/svelte';

	let { data, form } = $props();

	let { id, name, allTitlesInGroup, existingPerformance, existingGraphics, existingYoutubeLinks, shas } = $derived(data);
	// Add fallback to prevent crash if allTitlesInGroup is not ready
	let updatedGroup = $state([...(allTitlesInGroup || [])]);

	let performanceProfiles = $state(
		existingPerformance.length > 0
			? JSON.parse(JSON.stringify(existingPerformance))
			: []
	);

	let graphicsData = $state(existingGraphics || {});
	let youtubeLinks = $state(existingYoutubeLinks || []);
	let isSubmitting = $state(false);
	let showConfirmation = $state(false);
	let formElement = $state(/** @type {HTMLFormElement | null} */ (null));

	function addNewVersion() {
		let nextVersion = '1.0.0';

		if (performanceProfiles.length > 0) {
			const latestProfile = [...performanceProfiles]
				.filter(p => p.gameVersion)
				.sort((a, b) => {
					const partsA = a.gameVersion.split('.').map(part => parseInt(part, 10) || 0);
					const partsB = b.gameVersion.split('.').map(part => parseInt(part, 10) || 0);
					const len = Math.max(partsA.length, partsB.length);
					for (let i = 0; i < len; i++) {
						const numA = partsA[i] || 0;
						const numB = partsB[i] || 0;
						if (numB !== numA) return numB - numA;
					}
					return 0;
				})[0];

			if (latestProfile) {
				const parts = latestProfile.gameVersion.split('.').map(p => parseInt(p, 10) || 0);
				while (parts.length < 3) parts.push(0); // Ensure it has at least 3 parts for .patch
				parts[parts.length - 1]++; // Increment the last part (patch)
				nextVersion = parts.join('.');
			}
		}

		performanceProfiles.push({
			gameVersion: nextVersion,
			profiles: {
				docked: { resolution_type: 'Fixed', resolution: '', resolutions: '', min_res: '', max_res: '', resolution_notes: '', fps_behavior: 'Locked', target_fps: '', fps_notes: '' },
				handheld: { resolution_type: 'Fixed', resolution: '', resolutions: '', min_res: '', max_res: '', resolution_notes: '', fps_behavior: 'Locked', target_fps: '', fps_notes: '' }
			},
			isNew: true // Flag to identify new, unsaved entries
		});
	}

	function removeVersion(index) {
		performanceProfiles.splice(index, 1);
	}


	onMount(async () => {
		const savedDraft = await getDraft(id);
		if (savedDraft) {
			const restoreDraft = () => {
				if (savedDraft.performanceProfiles) performanceProfiles = savedDraft.performanceProfiles;
				if (savedDraft.group) updatedGroup = savedDraft.group;
				if (savedDraft.graphics) graphicsData = savedDraft.graphics;
				if (savedDraft.youtube) youtubeLinks = savedDraft.youtube;
			}
			if (page.url.searchParams.get('from_draft') === 'true' || confirm('You have a saved draft for this game. Would you like to restore it?')) {
				restoreDraft();
			}
		} else if (performanceProfiles.length === 0) {
			// If no existing profiles and no draft, start with one blank entry
			addNewVersion();
		}
	});

	$effect(() => {
		if (!browser) return;

		const dataToSave = {
			name,
			performanceProfiles,
			graphics: graphicsData,
			youtube: youtubeLinks,
			group: updatedGroup
		};

		const debounceTimer = setTimeout(() => {
			draftsStore.save(id, JSON.parse(JSON.stringify(dataToSave)));
		}, 500);

		return () => clearTimeout(debounceTimer);
	});
</script>

<svelte:head>
	<title>Contribute Data for {name}</title>
</svelte:head>

<div class="form-container">
	<a href={`/title/${id}`} class="back-link">← Back to Game Page</a>
	<h1>Contribute Performance Data</h1>
	<p class="subtitle">You are adding data for <strong class='game-name'>{name}</strong> ({id})</p>

	{#if form?.success}
		<div class="success-message">
			<h2>Submission Successful!</h2>
			<p>Your contribution has been submitted for review. Thank you!</p>
			<a href={form.prUrl} target="_blank" rel="noopener noreferrer" class="pr-link">View Pull Request on GitHub</a>
			<a href="/" class="back-link-main">Return to Home</a>
		</div>
	{:else}
		<GroupingControls initialGroup={allTitlesInGroup} onUpdate={(newGroup) => { updatedGroup = newGroup; }} />

		<form bind:this={formElement} method="POST" use:enhance={() => {
			isSubmitting = true;
			showConfirmation = false;
			return async ({ update }) => {
				await deleteDraft(id);
				await update();
				isSubmitting = false;
			};
		}}>
			<input type="hidden" name="titleId" value={id} />
			<input type="hidden" name="gameName" value={name} />
			<input type="hidden" name="performanceData" value={JSON.stringify(performanceProfiles)} />
			<input type="hidden" name="graphicsData" value={JSON.stringify(graphicsData)} />
			<input type="hidden" name="youtubeLinks" value={JSON.stringify(youtubeLinks)} />
			<input type="hidden" name="updatedGroupData" value={JSON.stringify(updatedGroup)} />
			<input type="hidden" name="originalGroupData" value={JSON.stringify(allTitlesInGroup)} />
			<input type="hidden" name="originalPerformanceData" value={JSON.stringify(existingPerformance)} />
			<input type="hidden" name="originalYoutubeLinks" value={JSON.stringify(data.originalYoutubeLinks)} />
			<input type="hidden" name="shas" value={JSON.stringify(shas)} />

			{#each performanceProfiles as profile, i (i)}
				<div class="version-section">
					<div class="version-header">
						<h4>Performance Profile</h4>
						<div class="version-input-wrapper">
							<label> Game Version</label>
							<input
								type="text"
								bind:value={profile.gameVersion}
								placeholder="e.g. 1.1.0"
								pattern="\d+\.\d+\.\d+"
								title="Version X.X.X (e.g. 1.1.0)"
								required
								class="version-input"
							/>
							<button type="button" class="remove-version-btn" onclick={() => removeVersion(i)}>Remove</button>
						</div>
					</div>
					<div class="mode-grid">
						<PerformanceControls mode="Handheld" bind:modeData={profile.profiles.handheld} />
						<PerformanceControls mode="Docked" bind:modeData={profile.profiles.docked} />
					</div>
				</div>
			{/each}

			<button type="button" class="add-version-btn" onclick={addNewVersion}>
				<Icon icon="mdi:plus-circle-outline" /> Add data for another version
			</button>

			<GraphicsControls initialSettings={existingGraphics} onUpdate={(newSettings) => { graphicsData = newSettings; }} />
			<YoutubeControls initialLinks={existingYoutubeLinks} onUpdate={(newLinks) => { youtubeLinks = newLinks; }} />

			<div class="form-footer">
				<button class="submit-button" type="button" onclick={() => showConfirmation = true} disabled={isSubmitting}>
					{#if isSubmitting}
						<Icon icon="line-md:loading-loop" /> Submitting...
					{:else}
						Submit for review
					{/if}
				</button>
			</div>
		</form>
	{/if}

	<ConfirmationModal
		show={showConfirmation}
		performanceProfiles={performanceProfiles}
		graphicsData={graphicsData}
		youtubeLinks={youtubeLinks}
		updatedGroup={updatedGroup}
		originalPerformance={existingPerformance}
		originalGraphics={existingGraphics}
		originalYoutubeLinks={existingYoutubeLinks}
		originalGroup={allTitlesInGroup}
		onCancel={() => showConfirmation = false}
		onConfirm={(summary) => {
			if (formElement) {
				// Add the summary to a hidden input before submitting
				const summaryInput = document.createElement('input');
				summaryInput.type = 'hidden';
				summaryInput.name = 'changeSummary';
				summaryInput.value = JSON.stringify(summary);
				formElement.appendChild(summaryInput);
				formElement.requestSubmit();
			}
		}}
	/>

	{#if form?.error}
		<p class="error-message">Error: {form.error}</p>
	{/if}
</div>

<style>
	.game-name {
		color: var(--primary-color);
	}

	.success-message {
		padding: 1.5rem;
		text-align: center;
		background-color: #dcfce7;
		color: #166534;
		border: 1px solid #4ade80;
		border-radius: var(--border-radius);
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
		margin-top: 1rem;
		padding: 1rem;
		font-weight: 500;
		color: #b91c1c;
		background-color: #fee2e2;
		border: 1px solid #f87171;
		border-radius: var(--border-radius);
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
		margin: 0;
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.subtitle {
		margin: 0.5rem 0 2.5rem;
		font-size: 1.1rem;
		color: var(--text-secondary);
	}

	.version-section {
		margin-bottom: 2.5rem;
		padding: 1.5rem;
		background-color: var(--input-bg);
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
	}

	.version-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.version-header h4 {
		margin: 0;
		font-size: 1.1rem;
	}

	.version-input-wrapper {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.version-input {
		width: 120px;
		padding: 8px 10px;
		background-color: var(--surface-color);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		border-radius: 6px;
	}

	.remove-version-btn {
		padding: 6px 12px;
		background: transparent;
		color: #ef4444;
		border: 1px solid #ef4444;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
	}

	.mode-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2rem;
	}

	@media (min-width: 800px) {
		.mode-grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	.add-version-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		margin-bottom: 2rem;
		padding: 0.75rem;
		background-color: transparent;
		color: var(--primary-color);
		border: 2px dashed var(--border-color);
		border-radius: var(--border-radius);
		font-weight: 600;
		cursor: pointer;
	}

	.form-footer {
		margin-top: 2rem;
		padding-top: 1.5rem;
		text-align: right;
		border-top: 1px solid var(--border-color);
	}

	.submit-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
		font-weight: 600;
		background-color: var(--primary-color);
		color: white;
		border: none;
		border-radius: var(--border-radius);
		cursor: pointer;
	}

	.submit-button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}
</style>
