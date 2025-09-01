<script>
	import { fade } from 'svelte/transition';
	import PerformanceDetail from '../../title/[id]/PerformanceDetail.svelte';
	import GraphicsDetail from '../../title/[id]/GraphicsDetail.svelte';
	import Icon from '@iconify/svelte';
	import { generateChangeSummary, isProfileEmpty, isGraphicsEmpty } from '$lib/utils.js';

	let {
		show = false,
		performanceProfiles = [],
		graphicsData = {},
		youtubeLinks = [],
		updatedGroup = [],
		originalPerformance = [],
		originalGraphics = null,
		originalYoutubeLinks = [],
		originalGroup = [],
		onConfirm = () => {},
		onCancel = () => {}
	} = $props();

	let changeSummary = $derived(generateChangeSummary(
		{ originalPerformance, originalGraphics, originalYoutubeLinks, originalGroup },
		{ performanceProfiles, graphicsData, youtubeLinks, updatedGroup }
	));
	
</script>

{#if show}
	<div class="modal-overlay" role="button" tabindex="0" onclick={onCancel} onkeydown={(e) => e.key === 'Enter' && onCancel()} transition:fade={{ duration: 150 }}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>Confirm Your Submission</h2>
				<button class="close-btn" onclick={onCancel} aria-label="Close"><Icon icon="mdi:close" /></button>
			</div>
			<div class="modal-body">
				{#if changeSummary.length > 0}
					<div class="summary-box">
						<h4 class="summary-title">Summary of Changes</h4>
						<ul class="summary-list">
							{#each changeSummary as change}
								<li>{change}</li>
							{/each}
						</ul>
					</div>
				{/if}

				<p class="preview-text">Please review the full preview of your submission below.</p>

				{#each performanceProfiles as profile (profile.gameVersion)}
					<div class="version-preview-section">
						<h4 class="version-preview-title">Version: {profile.gameVersion || 'Not specified'}</h4>
						{#if !isProfileEmpty(profile)}
							<PerformanceDetail performance={profile.profiles} />
						{:else}
							<p class="empty-message">No performance data was entered for this version</p>
						{/if}
					</div>
				{/each}

				{#if !isGraphicsEmpty(graphicsData)}
					<div class="version-preview-section">
						<h4 class="version-preview-title">Graphics Settings</h4>
						<GraphicsDetail settings={graphicsData} />
					</div>
				{/if}
			</div>
			<div class="modal-footer">
				<button class="cancel-btn" onclick={onCancel}>Cancel</button>
				<button
					class="confirm-btn"
					onclick={() => onConfirm(changeSummary)}
					disabled={changeSummary.length === 0}
				>
					{changeSummary.length === 0 ? 'No Changes Detected' : 'Confirm & Submit'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
.modal-overlay {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background-color: rgba(0, 0, 0, 0.7);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 100;
}
.modal-content {
	background-color: var(--background-color);
	width: 90%;
	max-width: 800px;
	max-height: 90vh;
	border-radius: var(--border-radius);
	display: flex;
	flex-direction: column;
	box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}
.modal-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 1rem 1.5rem;
	border-bottom: 1px solid var(--border-color);
}
.modal-header h2 {
	margin: 0;
	font-size: 1.5rem;
}
.close-btn {
	background: none;
	border: none;
	cursor: pointer;
	padding: 0.5rem;
	color: var(--text-secondary);
}
.modal-body {
	padding: 1.5rem;
	overflow-y: auto;
	flex-grow: 1;
}

.summary-box {
	background-color: var(--input-bg);
	border: 1px solid var(--border-color);
	border-left: 4px solid var(--primary-color);
	padding: 1rem 1.5rem;
	margin-bottom: 2rem;
	border-radius: var(--border-radius);
}
.summary-title {
	margin: 0 0 0.75rem 0;
	font-size: 1.1rem;
}
.summary-list {
	list-style-type: disc;
	padding-left: 1.25rem;
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
	font-size: 0.9rem;
}

.preview-text {
	font-size: 0.9rem;
	color: var(--text-secondary);
	margin: 0 0 1.5rem 0;
	text-align: center;
}
.version-preview-section {
	margin-bottom: 2rem;
}
.version-preview-section:last-child {
	margin-bottom: 0;
}
.version-preview-title {
	font-size: 1.2rem;
	font-weight: 600;
	padding-bottom: 0.75rem;
	margin-bottom: 1rem;
	border-bottom: 1px solid var(--border-color);
}
.empty-message {
	padding: 1.5rem;
	text-align: center;
	color: var(--text-secondary);
	background-color: var(--surface-color);
	border: 1px dashed var(--border-color);
	border-radius: var(--border-radius);
	margin: 0;
}
.modal-footer {
	display: flex;
	justify-content: flex-end;
	gap: 1rem;
	padding: 1rem 1.5rem;
	border-top: 1px solid var(--border-color);
	background-color: var(--surface-color);
}
.cancel-btn, .confirm-btn {
	padding: 0.6rem 1.2rem;
	border-radius: var(--border-radius);
	border: none;
	font-size: 1rem;
	font-weight: 600;
	cursor: pointer;
}
.cancel-btn {
	background-color: var(--input-bg);
	color: var(--text-primary);
	border: 1px solid var(--border-color);
}
.confirm-btn {
	background-color: var(--primary-color);
	color: var(--primary-action-text);
}
.confirm-btn:disabled {
	background-color: var(--input-bg);
	color: var(--text-secondary);
	cursor: not-allowed;
}
</style>