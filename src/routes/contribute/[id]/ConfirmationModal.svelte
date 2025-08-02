<script>
	import { fade } from 'svelte/transition';
	import PerformanceDetail from '../../title/[id]/PerformanceDetail.svelte';
	import GraphicsDetail from '../../title/[id]/GraphicsDetail.svelte';
	import Icon from '@iconify/svelte';
	import { isEqual } from 'lodash-es';

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

	let changeSummary = $derived((() => {
		if (!show) return [];

		const summary = [];

		// Performance Profile Changes
		const originalProfilesMap = new Map(originalPerformance.map(p => [p.gameVersion, p]));
		const newProfilesMap = new Map(performanceProfiles.map(p => [p.gameVersion, p]));

		// Check for added/updated profiles
		for (const [version, newProfile] of newProfilesMap.entries()) {
			const originalProfile = originalProfilesMap.get(version);
			if (!originalProfile) {
				summary.push(`Added new performance profile for v${version}.`);
			} else {
				// Deep comparison for updates
				const diffs = [];
				for (const mode of ['docked', 'handheld']) {
					for (const key in newProfile.profiles[mode]) {
						if (newProfile.profiles[mode][key] !== originalProfile.profiles[mode][key]) {
							const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
							diffs.push(`${mode.charAt(0).toUpperCase() + mode.slice(1)} ${formattedKey}`);
						}
					}
				}
				if (diffs.length > 0) {
					summary.push(`Updated performance v${version}: ${diffs.slice(0, 2).join(', ')}${diffs.length > 2 ? '...' : ''}.`);
				}
			}
		}

		// Check for deleted profiles
		for (const version of originalProfilesMap.keys()) {
			if (!newProfilesMap.has(version)) {
				summary.push(`Deleted performance profile for v${version}.`);
			}
		}

		// Graphics Settings Changes
		const graphicsChanged = JSON.stringify(graphicsData) !== JSON.stringify(originalGraphics || {});
		if (graphicsChanged) {
			if (!originalGraphics && Object.keys(graphicsData).length > 0) {
				summary.push('Added new graphics settings.');
			} else if (originalGraphics && Object.keys(graphicsData).length === 0) {
				summary.push('Removed graphics settings.');
			} else {
				summary.push('Updated graphics settings.');
			}
		}

		// YouTube Link Changes (more robust check)
		const normalizeLinks = (links) => links.map(l => ({ url: l.url, notes: l.notes || '' })).sort((a,b) => a.url.localeCompare(b.url));
		const normalizedNew = normalizeLinks(youtubeLinks);
		const normalizedOriginal = normalizeLinks(originalYoutubeLinks);

		if (!isEqual(normalizedNew, normalizedOriginal)) {
			const originalUrls = new Set(normalizedOriginal.map(l => l.url));
			const newUrls = new Set(normalizedNew.map(l => l.url));
			const addedCount = [...newUrls].filter(url => !originalUrls.has(url)).length;
			const removedCount = [...originalUrls].filter(url => !newUrls.has(url)).length;

			if (addedCount > 0) {
				summary.push(`Added ${addedCount} YouTube link${addedCount > 1 ? 's' : ''}.`);
			}
			if (removedCount > 0) {
				summary.push(`Removed ${removedCount} YouTube link${removedCount > 1 ? 's' : ''}.`);
			}
			
			// Check for note changes on existing links
			if (normalizedNew.some(newLink => {
				const oldLink = normalizedOriginal.find(l => l.url === newLink.url);
				return oldLink && oldLink.notes !== newLink.notes;
			})) {
				summary.push('Updated notes on one or more YouTube links.');
			}
		}
		
		// Grouping Changes
		const originalGroupIds = new Set(originalGroup.map(g => g.id));
		const updatedGroupIds = new Set(updatedGroup.map(g => g.id));
		let groupsChanged = originalGroupIds.size !== updatedGroupIds.size;
		if (!groupsChanged) {
			for (const id of originalGroupIds) {
				if (!updatedGroupIds.has(id)) {
					groupsChanged = true;
					break;
				}
			}
		}
		if (groupsChanged) {
			summary.push('Adjusted regional game grouping.');
		}

		return summary;
	})());

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
						<PerformanceDetail performance={profile.profiles} />
					</div>
				{/each}

				{#if Object.keys(graphicsData).length > 0}
					<div class="version-preview-section">
						<h4 class="version-preview-title">Graphics Settings</h4>
						<GraphicsDetail settings={graphicsData} />
					</div>
				{/if}
			</div>
			<div class="modal-footer">
				<button class="cancel-btn" onclick={onCancel}>Cancel</button>
				<button class="confirm-btn" onclick={() => onConfirm(changeSummary)}>Confirm & Submit</button>
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
	color: white;
}
</style>