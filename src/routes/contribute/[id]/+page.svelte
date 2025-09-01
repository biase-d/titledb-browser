<script>
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { getDraft, deleteDraft } from '$lib/indexedDB';
	import { draftsStore } from '$lib/stores';
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import GroupingControls from './GroupingControls.svelte';
	import GraphicsControls from './GraphicSettings/GraphicControls.svelte';
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
	let youtubeLinks = $state(JSON.parse(JSON.stringify(existingYoutubeLinks)) || []);
	let isSubmitting = $state(false);
	let showConfirmation = $state(false);
	let formElement = $state(/** @type {HTMLFormElement | null} */ (null));

	function addNewVersion() {
		let nextVersion = '1.0.0';

		if (performanceProfiles.length > 0) {
			const getVersionParts = (versionStr) =>
				(versionStr.match(/[\d.]+/)?.[0] || '0').split('.').map(part => parseInt(part, 10) || 0);

			const latestProfile = [...performanceProfiles]
				.filter(p => p.gameVersion)
				.sort((a, b) => {
					const partsA = getVersionParts(a.gameVersion);
					const partsB = getVersionParts(b.gameVersion);
					const len = Math.max(partsA.length, partsB.length);
					for (let i = 0; i < len; i++) {
						const numA = partsA[i] || 0;
						const numB = partsB[i] || 0;
						if (numB !== numA) return numB - numA;
					}
					return 0;
				})[0];

			if (latestProfile) {
				const parts = getVersionParts(latestProfile.gameVersion);
				while (parts.length < 3) parts.push(0); // Ensure it has at least 3 parts for .patch
				parts[parts.length - 1]++; // Increment the last part (patch)
				nextVersion = parts.join('.');
			}
		}

		performanceProfiles.push({
			gameVersion: nextVersion,
			suffix: '',
			profiles: {
				docked: { resolution_type: 'Fixed', resolution: '', resolutions: '', min_res: '', max_res: '', resolution_notes: '', fps_behavior: 'Locked', target_fps: '', fps_notes: '' },
				handheld: { resolution_type: 'Fixed', resolution: '', resolutions: '', min_res: '', max_res: '', resolution_notes: '', fps_behavior: 'Locked', target_fps: '', fps_notes: '' }
			},
			isNew: true // Flag to identify new, unsaved entries
		});
		performanceProfiles = performanceProfiles;
	}

	function removeVersion(index) {
		performanceProfiles.splice(index, 1);
		performanceProfiles = performanceProfiles;
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
	<a href={`/title/${id}`} class="back-link">← Back to {name}</a>
	<h1>Contribute Data</h1>
	<p class="subtitle">You are suggesting edits for <strong class='game-name'>{name}</strong> ({id})</p>

	{#if form?.success}
		<div class="success-message">
			<Icon icon="mdi:check-decagram" />
			<div class="success-content">
				<h2>Submission Successful!</h2>
				<p>Your contribution has been submitted for review. Thank you!</p>
				<div class="success-actions">
					<a href={form.prUrl} target="_blank" rel="noopener noreferrer" class="cta-button">View Pull Request</a>
					<a href="/" class="secondary-button">Return Home</a>
				</div>
			</div>
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
			<input type="hidden" name="originalGraphicsData" value={JSON.stringify(existingGraphics)} />
			<input type="hidden" name="originalYoutubeLinks" value={JSON.stringify(data.originalYoutubeLinks)} />
			<input type="hidden" name="shas" value={JSON.stringify(shas)} />

			{#each performanceProfiles as profile, i (i)}
				<div class="version-section">
					<div class="version-header">
						<h4>Performance Profile</h4>
						<div class="version-input-wrapper">
							<div class="form-field">
								<label for="game_version_{i}">Game Version</label>
								<input
									id="game_version_{i}"
									type="text"
									bind:value={profile.gameVersion}
									placeholder="e.g. 1.1.0"
									required
									class="version-input"
								/>
							</div>
							<div class="form-field">
								<label for="version_suffix_{i}">
									Region / Suffix
									<div class="tooltip">
										<Icon icon="mdi:help-circle-outline" />
										<span class="tooltip-text">
											Optional. Use if this version only applies to a specific region or edition (e.g., 'jp', 'us', 'rev1'). Leave blank if it applies to all games in the group.
										</span>
									</div>
								</label>
								<input
									id="version_suffix_{i}"
									type="text"
									bind:value={profile.suffix}
									placeholder="e.g. 'jp'"
									class="version-input"
									oninput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^a-zA-Z0-9_-]/g, ''); }}
								/>
							</div>
							{#if performanceProfiles.length > 1}
								<button type="button" class="remove-version-btn" onclick={() => removeVersion(i)}>Remove</button>
							{/if}
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

			<GraphicsControls bind:settings={graphicsData} />
			<br>
			<YoutubeControls bind:links={youtubeLinks} />

			<div class="form-footer">
				<button class="submit-button" type="button" onclick={() => showConfirmation = true} disabled={isSubmitting}>
					{#if isSubmitting}
						<Icon icon="line-md:loading-loop" /> Submitting...
					{:else}
						Submit for Review
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
	.form-container { max-width: 900px; margin: 0 auto; padding: 1.5rem; }
	.back-link { display: inline-block; margin-bottom: 2rem; color: var(--text-secondary); }
	h1 { margin: 0; font-size: 2.5rem; }
	.subtitle { margin: 0.5rem 0 2.5rem; font-size: 1.1rem; color: var(--text-secondary); }
	.game-name { color: var(--primary-color); }

	.success-message {
		display: flex; gap: 1.5rem; padding: 1.5rem;
		text-align: left;
		background-color: var(--surface-color);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		border-left: 4px solid #4ade80;
		border-radius: var(--radius-lg);
	}
	.success-message > :global(svg) { font-size: 2.5rem; color: #4ade80; flex-shrink: 0; }
	.success-message h2 { margin: 0 0 0.5rem; }
	.success-message p { margin-bottom: 1.5rem; color: var(--text-secondary); }
	.success-actions { display: flex; gap: 1rem; }
	.cta-button {
		display: inline-block; background-color: var(--primary-color); color: var(--primary-action-text);
		padding: 10px 20px; border-radius: var(--radius-md); font-weight: 600; text-decoration: none;
	}
	.secondary-button {
		display: inline-block; background-color: var(--surface-color); color: var(--text-primary);
		border: 1px solid var(--border-color);
		padding: 10px 20px; border-radius: var(--radius-md); font-weight: 600; text-decoration: none;
	}


	.error-message {
		margin-top: 1rem; padding: 1rem; font-weight: 500;
		color: #b91c1c; background-color: #fee2e2; border: 1px solid #f87171;
		border-radius: var(--radius-md);
	}
	.dark .error-message { background-color: #450a0a; color: #fca5a5; border-color: #991b1b; }


	.version-section {
		margin-bottom: 2.5rem; padding: 1.5rem;
		background-color: var(--surface-color); border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
	}
	.version-header {
		display: flex; justify-content: space-between; align-items: flex-start;
		margin-bottom: 1.5rem;
	}
	.version-header h4 { margin: 0; font-size: 1.1rem; }
	.version-input-wrapper { display: flex; align-items: flex-end; gap: 1rem; flex-wrap: wrap; }

	.form-field { display: flex; flex-direction: column; gap: 0.25rem; }
	.form-field label { font-size: 0.8rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.25rem; }
	
	.tooltip { position: relative; display: inline-flex; align-items: center; color: var(--text-secondary); }
    .tooltip .tooltip-text {
		visibility: hidden; width: 250px; background-color: var(--color-background-dark); color: var(--color-text-body-dark);
        text-align: left; border-radius: var(--radius-md); padding: 0.75rem;
        position: absolute; z-index: 1; bottom: 130%; left: 50%;
        margin-left: -125px; opacity: 0; transition: opacity 0.3s;
        font-size: 0.8rem; line-height: 1.4; box-shadow: var(--shadow-lg);
	}
    .tooltip:hover .tooltip-text { visibility: visible; opacity: 1; }

	.version-input {
		width: 120px; padding: 8px 10px;
		background-color: var(--input-bg); color: var(--text-primary);
		border: 1px solid var(--border-color); border-radius: var(--radius-md);
	}
	.remove-version-btn {
		padding: 8px 12px; background: transparent; color: #ef4444;
		border: 1px solid #ef4444; border-radius: var(--radius-md);
		cursor: pointer; font-weight: 500; height: 38px;
	}
	.remove-version-btn:hover { background-color: color-mix(in srgb, #ef4444 10%, transparent); }

	.mode-grid { display: grid; grid-template-columns: 1fr; gap: 2rem; }
	@media (min-width: 800px) { .mode-grid { grid-template-columns: 1fr 1fr; } }
	
	.add-version-btn {
		display: flex; align-items: center; justify-content: center;
		gap: 0.5rem; width: 100%; margin-bottom: 2rem; padding: 0.75rem;
		background-color: transparent; color: var(--primary-color);
		border: 2px dashed var(--border-color); border-radius: var(--radius-lg);
		font-weight: 600; cursor: pointer; transition: all 0.2s ease;
	}
	.add-version-btn:hover { border-color: var(--primary-color); background-color: color-mix(in srgb, var(--primary-color) 10%, transparent); }

	.form-footer {
		margin-top: 2rem; padding-top: 1.5rem; text-align: right;
		border-top: 1px solid var(--border-color);
	}
	.submit-button {
		display: inline-flex; align-items: center; justify-content: center;
		gap: 0.5rem; padding: 0.75rem 1.5rem; font-size: 1rem; font-weight: 600;
		background-color: var(--primary-color); color: var(--primary-action-text);
		border: none; border-radius: var(--radius-md); cursor: pointer;
		transition: background-color 0.2s ease;
	}
	.submit-button:hover { background-color: var(--primary-color-hover); }
	.submit-button:disabled { opacity: 0.7; cursor: not-allowed; }
</style>