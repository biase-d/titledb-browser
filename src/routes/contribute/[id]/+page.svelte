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
	import { generateChangeSummary } from '$lib/utils.js';

	let { data, form } = $props();

	let {
		id,
		name,
		allTitlesInGroup,
		existingPerformance,
		existingGraphics,
		existingYoutubeLinks,
		shas
	} = $derived(data);

	let updatedGroup = $state([...(allTitlesInGroup || [])]);
	
	// Sanitize the initial performance data from the server to prevent SSR crashes
	const sanitizedInitialPerformance = (existingPerformance || []).map(p => {
		const defaultMode = { resolution_type: 'Fixed', fps_behavior: 'Locked', resolution: '', resolutions: '', min_res: '', max_res: '', resolution_notes: '', target_fps: '', fps_notes: '' };
		const docked = { ...defaultMode, ...(p.profiles?.docked || {}) };
		const handheld = { ...defaultMode, ...(p.profiles?.handheld || {}) };
		return {
			...p,
			profiles: {
				docked,
				handheld
			}
		};
	});

	let performanceProfiles = $state(
		sanitizedInitialPerformance.length > 0 ? structuredClone(sanitizedInitialPerformance) : []
	);
	let graphicsData = $state(structuredClone(existingGraphics?.settings) || {});
	let youtubeLinks = $state(structuredClone(existingYoutubeLinks) || []);

	let isSubmitting = $state(false);
	
	let showConfirmation = $state(false);
	let formElement = $state(/** @type {HTMLFormElement | null} */ (null));
	let successMessageEl = $state(/** @type {HTMLDivElement | null} */ (null));

	let changeSummary = $derived(generateChangeSummary(
		{ originalPerformance: existingPerformance, originalGraphics: existingGraphics, originalYoutubeLinks: data.originalYoutubeLinks, originalGroup: allTitlesInGroup },
		{ performanceProfiles, graphicsData, youtubeLinks, updatedGroup }
	));

	function handleSubmitClick() {
		if (changeSummary.length > 0 && changeSummary.every(s => s.includes('Added empty placeholder'))) {
			alert('No new information was provided. Please add performance, graphics, or video data to submit.');
			return;
		}
		if (changeSummary.length === 0) {
			alert('No changes were detected. Please add or modify some data before submitting.');
			return;
		}
		showConfirmation = true;
	}

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
			const restore = () => {
				// Sanitize performance profiles loaded from a draft to prevent crashes
				const rawProfiles = savedDraft.performanceProfiles || [];
				performanceProfiles = rawProfiles.map(p => {
					const defaultMode = { resolution_type: 'Fixed', fps_behavior: 'Locked', resolution: '', resolutions: '', min_res: '', max_res: '', resolution_notes: '', target_fps: '', fps_notes: '' };
					const docked = { ...defaultMode, ...(p.profiles?.docked || {}) };
					const handheld = { ...defaultMode, ...(p.profiles?.handheld || {}) };
					return {
						...p,
						profiles: { docked, handheld }
					};
				});

				updatedGroup = savedDraft.group || [];
				graphicsData = savedDraft.graphics || {};
				youtubeLinks = savedDraft.youtube || [];
			};
			if (page.url.searchParams.get('from_draft') === 'true' || confirm('A saved draft was found. Would you like to restore it?')) {
				restore();
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

<main class="form-container">
	<a href={`/title/${id}`} class="back-link">← Back to {name}</a>
	<h1>Contribute Data</h1>
	<p class="subtitle">Suggesting edits for <strong class="game-name">{name}</strong> ({id})</p>

	{#if form?.success}
		<div class="success-message" role="alert" tabindex="-1" bind:this={successMessageEl}>
			<Icon icon="mdi:check-decagram" aria-hidden="true" />
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
		<GroupingControls 
			initialGroup={allTitlesInGroup} 
			primaryTitleId={id} 
			onUpdate={(newGroup) => { updatedGroup = newGroup; }} 
		/>

		<form
			bind:this={formElement}
			method="POST"
			use:enhance={() => {
				isSubmitting = true;
				showConfirmation = false;
				return async ({ update }) => {
					await deleteDraft(id);
					await update();
					isSubmitting = false;
				};
			}}
		>
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

			<section class="form-section">
				<h2 class="section-title">Performance Profiles</h2>
				<p class="section-description">
					Submit performance data for one or more game versions. This includes resolution, FPS targets, and stability.
				</p>
				{#each performanceProfiles as profile, i (profile.tempId || profile.gameVersion + profile.suffix)}
					<div class="form-card version-card" data-profile-index={i}>
						<div class="version-header">
							<h3 class="version-title">Profile for Version</h3>
							<div class="version-controls">
								<div class="form-field">
									<label for="game_version_{i}">Game Version</label>
									<input id="game_version_{i}" type="text" bind:value={profile.gameVersion} placeholder="e.g. 1.1.0" required />
								</div>
								<div class="form-field">
									<label for="version_suffix_{i}">Region / Suffix</label>
									<input id="version_suffix_{i}" type="text" bind:value={profile.suffix} placeholder="e.g. 'jp'" oninput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^a-zA-Z0-9_-]/g, ''); }} />
								</div>
							</div>
							{#if performanceProfiles.length > 1}
								<button type="button" class="remove-version-btn" onclick={() => removeVersion(i)} aria-label={`Remove version ${profile.gameVersion || ''}`}>
									<Icon icon="mdi:delete-outline" aria-hidden="true" />
									<span>Remove</span>
								</button>
							{/if}
						</div>
						<div class="mode-grid">
							<PerformanceControls mode="Handheld" bind:modeData={profile.profiles.handheld} />
							<PerformanceControls mode="Docked" bind:modeData={profile.profiles.docked} />
						</div>
					</div>
				{/each}

				<button type="button" class="add-version-btn" onclick={addNewVersion}>
					<Icon icon="mdi:plus-circle-outline" aria-hidden="true" />
					Add Data for Another Version
				</button>
			</section>

			<section class="form-section">
				<h2 class="section-title">Graphics Settings</h2>
				<p class="section-description">
					Detail the game's in-game graphical options. If present, this data is considered more authoritative than performance profiles for display.
				</p>
				<div class="form-card">
					<GraphicsControls bind:settings={graphicsData} />
				</div>
			</section>

			<section class="form-section">
				<h2 class="section-title">YouTube Links</h2>
				<p class="section-description">Add YouTube videos showcasing performance or graphical comparisons.</p>
				<div class="form-card">
					<YoutubeControls bind:links={youtubeLinks} />
				</div>
			</section>

			{#if form?.error}
				<div class="error-message" role="alert">Error: {form.error}</div>
			{/if}

			<div class="form-footer">
				<button class="submit-button" type="button" onclick={handleSubmitClick} disabled={isSubmitting}>
					{#if isSubmitting}
						<Icon icon="line-md:loading-loop" aria-hidden="true" />
						<span>Submitting...</span>
					{:else}
						Submit for Review
					{/if}
				</button>
			</div>
		</form>
	{/if}
</main>

<ConfirmationModal
	{showConfirmation}
	{performanceProfiles}
	{graphicsData}
	{changeSummary}
	onCancel={() => showConfirmation = false}
	onConfirm={() => {
		if (formElement) {
			const summaryInput = document.createElement('input');
			summaryInput.type = 'hidden';
			summaryInput.name = 'changeSummary';
			summaryInput.value = JSON.stringify(changeSummary);
			formElement.appendChild(summaryInput);
			formElement.requestSubmit();
		}
	}} />

<style>
	.form-container { max-width: 900px; margin: 0 auto; padding: 1.5rem 1.5rem 4rem; }
	.back-link { display: inline-block; margin-bottom: 2rem; color: var(--text-secondary); text-decoration: none; }
	.back-link:hover { text-decoration: underline; }

	h1 { margin: 0; font-size: 2.5rem; }
	.subtitle { margin: 0.5rem 0 2.5rem; font-size: 1.1rem; color: var(--text-secondary); }
	.game-name { color: var(--primary-color); }

	/* -- Messages -- */
	.success-message {
		display: flex; gap: 1.5rem; padding: 1.5rem; text-align: left;
		background-color: var(--surface-color); border: 1px solid var(--border-color);
		border-left: 4px solid #4ade80; border-radius: var(--radius-lg);
	}
	.success-message:focus { outline: none; } /* Programmatic focus target */
	.success-message > :global(svg) { font-size: 2.5rem; color: #4ade80; flex-shrink: 0; margin-top: 0.25rem; }
	.success-message h2 { margin: 0 0 0.5rem; }
	.success-message p { margin-bottom: 1.5rem; color: var(--text-secondary); }
	.success-actions { display: flex; flex-wrap: wrap; gap: 1rem; }

	.error-message {
		margin-top: 1.5rem; margin-bottom: 1.5rem; padding: 1rem; font-weight: 500;
		color: #b91c1c; background-color: #fee2e2; border: 1px solid #f87171;
		border-radius: var(--radius-md);
	}
	.dark .error-message { background-color: #450a0a; color: #fca5a5; border-color: #991b1b; }

	/* -- Buttons -- */
	.cta-button {
		display: inline-block; background-color: var(--primary-color); color: var(--primary-action-text);
		padding: 10px 20px; border-radius: var(--radius-md); font-weight: 600; text-decoration: none;
	}
	.secondary-button {
		display: inline-block; background-color: var(--surface-color); color: var(--text-primary);
		border: 1px solid var(--border-color); padding: 10px 20px;
		border-radius: var(--radius-md); font-weight: 600; text-decoration: none;
	}

	/* -- Form Structure -- */
	.form-section {
		margin-bottom: 3rem;
	}
	.section-title {
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
	}
	.section-description {
		margin: 0 0 1.5rem;
		color: var(--text-secondary);
		max-width: 75ch;
	}
	.form-card {
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
	}
	.version-card {
		padding-top: 0;
	}
	.version-card + .version-card {
		margin-top: 1.5rem;
	}

	.version-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		width: 100%;
		padding: 1rem 0 1.5rem;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
		gap: 1rem;
		border-bottom: 1px solid var(--border-color);
	}
	.version-title { font-size: 1.1rem; font-weight: 600; padding: 0; margin: 0; }
	.version-controls { display: flex; align-items: flex-end; gap: 1rem; flex-wrap: wrap; margin-left: auto; }

	.form-field { display: flex; flex-direction: column; gap: 0.25rem; }
	.form-field label { font-size: 0.8rem; font-weight: 500; color: var(--text-secondary); }
	.form-field input {
		width: 120px; padding: 8px 10px; background-color: var(--input-bg);
		color: var(--text-primary); border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
	}

	.remove-version-btn {
		display: inline-flex; align-items: center; gap: 0.25rem;
		padding: 8px 12px; background: transparent; color: #ef4444;
		border: 1px solid #ef4444; border-radius: var(--radius-md);
		cursor: pointer; font-weight: 500; height: 38px;
		transition: background-color 0.2s;
		margin-left: 1rem;
	}
	.remove-version-btn:hover { background-color: color-mix(in srgb, #ef4444 10%, transparent); }

	.mode-grid { display: grid; grid-template-columns: 1fr; gap: 2rem; }
	@media (min-width: 800px) { .mode-grid { grid-template-columns: 1fr 1fr; } }

	.add-version-btn {
		display: flex; align-items: center; justify-content: center; gap: 0.5rem;
		width: 100%; margin-top: 1.5rem; padding: 0.75rem; color: var(--primary-color);
		background-color: var(--surface-color); border: 2px dashed var(--border-color);
		border-radius: var(--radius-lg); font-weight: 600; cursor: pointer;
		transition: border-color 0.2s ease, background-color 0.2s ease;
	}
	.add-version-btn:hover { border-color: var(--primary-color); background-color: color-mix(in srgb, var(--primary-color) 5%, transparent); }

	.form-footer {
		margin-top: 2rem; padding-top: 1.5rem; text-align: right;
		border-top: 1px solid var(--border-color);
	}
	.submit-button {
		display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
		padding: 0.75rem 1.5rem; font-size: 1rem; font-weight: 600;
		background-color: var(--primary-color); color: var(--primary-action-text);
		border: none; border-radius: var(--radius-md); cursor: pointer;
		transition: background-color 0.2s ease;
	}
	.submit-button:hover { background-color: var(--primary-color-hover); }
	.submit-button:disabled { opacity: 0.7; cursor: not-allowed; }

	/* -- Focus States -- */
	:is(a, button, input):focus-visible {
		outline: 2px solid var(--accent-color, blue);
		outline-offset: 2px;
	}
</style>