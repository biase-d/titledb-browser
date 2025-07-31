<script>
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { getDraft, saveDraft, deleteDraft } from '$lib/db/idb';
	import { draftsStore } from '$lib/stores';
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import GroupingControls from './GroupingControls.svelte';
	import GraphicsControls from './GraphicControls.svelte'
	import PerformanceControls from './PerformanceControls.svelte';
	import YoutubeControls from './YoutubeControls.svelte'
	import ConfirmationModal from './ConfirmationModal.svelte';
	import Icon from '@iconify/svelte';

	let { data, form } = $props();

	let { id, name, existingData, existingGraphics, existingYoutubeLinks, allTitlesInGroup } = $derived(data);
	let updatedGroup = $state([...allTitlesInGroup]);

	let performanceData = $state(existingData || {
		docked: { resolution_type: 'Fixed', resolution: '', resolutions: '', min_res: '', max_res: '', resolution_notes: '', fps_behavior: 'Locked', target_fps: 30, fps_notes: '' },
		handheld: { resolution_type: 'Fixed', resolution: '', resolutions: '', min_res: '', max_res: '', resolution_notes: '', fps_behavior: 'Locked', target_fps: 30, fps_notes: '' }
	});

	let graphicsData = $state(existingGraphics || {});
	let youtubeLinks = $state(existingYoutubeLinks || []);
	let isSubmitting = $state(false);
	let showConfirmation = $state(false);
	let formElement = $state(/** @type {HTMLFormElement | null} */ (null));

	onMount(async () => {
		const savedDraft = await getDraft(id);
		if (savedDraft) {
			const restoreDraft = () => {
				const draftPerformance = savedDraft.performance || savedDraft;
				const draftGroup = savedDraft.group;

				if (draftPerformance) {
					performanceData.docked = draftPerformance.docked;
					performanceData.handheld = draftPerformance.handheld;
				}
				if (draftGroup) {
					updatedGroup = draftGroup;
				}
			}
			const fromDrafts = page.url.searchParams.get('from_draft') === 'true';
			if (fromDrafts) {
				restoreDraft();
			} else {
				if (confirm('You have a saved draft for this game. Would you like to restore it?')) {
					restoreDraft();
				}
			}
		}
	});

	$effect(() => {
		if (!browser) return;

		const dataToSave = {
			name: name,
			performance: performanceData,
			group: updatedGroup
		};

		const debounceTimer = setTimeout(() => {
			const plainObjectToSave = JSON.parse(JSON.stringify(dataToSave));
			draftsStore.save(id, plainObjectToSave);
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
		<GroupingControls initialGroup={allTitlesInGroup} onUpdate={(/** @type {{ id: string; name: unknown; }[]} */ newGroup) => { updatedGroup = newGroup; }} />
		<form bind:this={formElement} method="POST" use:enhance={() => {
			isSubmitting = true;
			showConfirmation = false; // Close modal on submit
			return async ({ update }) => {
				await deleteDraft(id);
				await update();
				isSubmitting = false;
			};
		}}>
			<!-- Hidden inputs to pass crucial data to the form action -->
			<input type="hidden" name="titleId" value={id} />
			<input type="hidden" name="gameName" value={name} />
			<input type="hidden" name="performanceData" value={JSON.stringify(performanceData)} />
			<input type="hidden" name="graphicsData" value={JSON.stringify(graphicsData)} />
			<input type="hidden" name="updatedGroupData" value={JSON.stringify(updatedGroup)} />
			<input type="hidden" name="youtubeLinks" value={JSON.stringify(youtubeLinks)} />
			<input type="hidden" name="originalGroupData" value={JSON.stringify(allTitlesInGroup)} />
			<input type="hidden" name="shas" value={JSON.stringify(data.shas)} />

			<div class="mode-grid">
				<PerformanceControls mode="Handheld" bind:modeData={performanceData.handheld} />
				<PerformanceControls mode="Docked" bind:modeData={performanceData.docked} />
			</div>

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
		performanceData={performanceData}
		graphicsData={graphicsData}
		onCancel={() => showConfirmation = false}
		onConfirm={() => formElement?.requestSubmit()}
	/>

	{#if form?.error}
		<p class="error-message">Error: {form.error}</p>
	{/if}
</div>

<style>
	.game-name {
		color: var(--primary-color)
	}
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

	input {
		width: 100%;
		background-color: var(--input-bg);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		border-radius: 6px;
		padding: 10px 12px;
		font-size: 1rem;
		box-sizing: border-box;
		transition: border-color 0.2s, box-shadow 0.2s;
	}
	input:focus{
		outline: none;
		border-color: var(--primary-color);
		box-shadow: 0 0 0 2px var(--primary-color);
	}
	.form-footer {
		margin-top: 2rem;
		padding-top: 1.5rem;
		text-align: right;
		border-top: 1px solid var(--border-color);
	}

	.submit-button {
		background-color: var(--primary-color);
		color: white;
		padding: 0.75rem 1.5rem;
		border-radius: var(--border-radius);
		border: none;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.submit-button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}
</style>
