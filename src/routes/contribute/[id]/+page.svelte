<script>
	import { onMount, untrack } from 'svelte'
	import { enhance } from '$app/forms'
	import { browser } from '$app/environment'
	import { draftsStore } from '$lib/stores'
	import { getDraft, deleteDraft } from '$lib/indexedDB'
	import {
		generateChangeSummary,
		pruneEmptyValues,
		isProfileEmpty,
		isGraphicsEmpty,
	} from '$lib/utils.js'

	import { preferences } from '$lib/stores/preferences'
	import Icon from '@iconify/svelte'
	import PerformanceTab from './components/PerformanceTab.svelte'
	import GraphicsTab from './components/GraphicsTab.svelte'
	import YoutubeTab from './components/YoutubeTab.svelte'
	import GroupingTab from './components/GroupingTab.svelte'

	let { data, form } = $props()

	const {
		id,
		name,
		groupId,
		allTitlesInGroup,
		existingPerformance,
		existingGraphics,
		existingYoutubeLinks,
		shas,
	} = $derived(data)

	let performanceProfiles = $state([])
	let graphicsData = $state(/** @type {any} */ ({}))
	let youtubeLinks = $state([])
	let updatedGroup = $state([])

	let isSubmitting = $state(false)
	let showConfirmation = $state(false)
	let formElement = $state(/** @type {HTMLFormElement | null} */ (null))
	let activeTab = $state('performance')

	let groupingSearchInput = $state('')
	let groupingSearchResults = $state([])
	let groupingSearchLoading = $state(false)
	let groupingDebounceTimer

	function sanitizeGraphics (g = {}) {
		const framerateDefaults = {
			additionalLocks: [],
			apiBuffering: 'Unknown',
		}
		const resolutionDefaults = { notes: '', multipleResolutions: [''] }
		const defaults = {
			resolution: resolutionDefaults,
			framerate: {},
			custom: {},
		}

		const sanitizeMode = (modeData = {}) => {
			const framerate = {
				...framerateDefaults,
				...(modeData.framerate || {}),
			}
			framerate.additionalLocks = (framerate.additionalLocks || []).map(
				(lock) => ({
					lockType: 'API',
					targetFps: '',
					notes: '',
					...lock,
				}),
			)
			const resolution = {
				...resolutionDefaults,
				...(modeData.resolution || {}),
			}
			if (
				!Array.isArray(resolution.multipleResolutions) ||
				resolution.multipleResolutions.length === 0
			) {
				resolution.multipleResolutions = ['']
			}

			return {
				...defaults,
				...modeData,
				resolution,
				framerate,
			}
		}

		return {
			docked: sanitizeMode(g?.docked),
			handheld: sanitizeMode(g?.handheld),
			shared: g?.shared || {},
		}
	}

	function formatPerfResolution (modeData) {
		if (!modeData) return 'N/A'
		switch (modeData.resolution_type) {
			case 'Fixed':
				return `Fixed at ${modeData.resolution || 'N/A'}`
			case 'Dynamic':
				if (!modeData.min_res && !modeData.max_res) return 'Dynamic'
				return `Dynamic ${modeData.min_res || '?'} ~ ${modeData.max_res || '?'}`
			case 'Multiple Fixed':
				return `Multiple: ${
					modeData.resolutions
						?.split(',')
						.filter(Boolean)
						.map((r) => r.trim())
						.join(', ') || 'N/A'
				}`
			default:
				return 'N/A'
		}
	}

	function formatPerfFramerate (modeData) {
		if (!modeData) return 'N/A'
		return modeData.target_fps
			? `${modeData.fps_behavior} ${modeData.target_fps} FPS`
			: modeData.fps_behavior || 'N/A'
	}

	function formatGfxResolution (resData) {
		if (!resData) return 'N/A'
		switch (resData.resolutionType) {
			case 'Fixed':
				return `Fixed at ${resData.fixedResolution || 'N/A'}`
			case 'Dynamic':
				const min = resData.minResolution || '?'
				const max = resData.maxResolution || '?'
				if (min === '?' && max === '?') return 'Dynamic'
				return `Dynamic, ${min} to ${max}`
			case 'Multiple Fixed':
				return (
					resData.multipleResolutions?.filter(Boolean).join(', ') ||
					'N/A'
				)
			default:
				return 'N/A'
		}
	}

	function formatGfxFramerate (fpsData) {
		if (!fpsData) return 'N/A'
		switch (fpsData.lockType) {
			case 'Unlocked':
				return 'Unlocked'
			case 'API':
				return `API Locked to ${fpsData.targetFps} FPS`
			case 'Custom':
				return `Custom Lock to ${fpsData.targetFps} FPS`
			default:
				return 'N/A'
		}
	}

	untrack(() => {
		const sanitizedInitialPerformance = (existingPerformance || []).map(
			(p) => {
				const defaultMode = {
					resolution_type: 'Fixed',
					fps_behavior: 'Locked',
					resolution: '',
					resolutions: '',
					min_res: '',
					max_res: '',
					resolution_notes: '',
					target_fps: '',
					fps_notes: '',
				}
				const docked = {
					...defaultMode,
					...(p.profiles?.docked || {}),
				}
				const handheld = {
					...defaultMode,
					...(p.profiles?.handheld || {}),
				}
				return { ...p, profiles: { docked, handheld } }
			},
		)

		performanceProfiles = structuredClone(sanitizedInitialPerformance)
		graphicsData = sanitizeGraphics(existingGraphics?.settings)
		youtubeLinks = structuredClone(existingYoutubeLinks || [])
		updatedGroup = structuredClone(allTitlesInGroup || [])
	})

	const changeSummary = $derived(
		generateChangeSummary(
			{
				originalPerformance: existingPerformance,
				originalGraphics: existingGraphics,
				originalYoutubeLinks: existingYoutubeLinks,
				originalGroup: allTitlesInGroup,
			},
			{
				performanceProfiles,
				graphicsData: pruneEmptyValues(graphicsData),
				youtubeLinks,
				updatedGroup,
			},
		),
	)
	const hasMeaningfulChanges = $derived(
		changeSummary.length > 0 &&
			!changeSummary.every((s) => s.includes('Added empty placeholder')),
	)

	onMount(async () => {
		const savedDraft = await getDraft(id)
		if (savedDraft) {
			const rawProfiles = savedDraft.performanceProfiles || []
			performanceProfiles = rawProfiles.map((p) => {
				const defaultMode = {
					resolution_type: 'Fixed',
					fps_behavior: 'Locked',
					resolution: '',
					resolutions: '',
					min_res: '',
					max_res: '',
					resolution_notes: '',
					target_fps: '',
					fps_notes: '',
				}
				return {
					...p,
					profiles: {
						docked: {
							...defaultMode,
							...(p.profiles?.docked || {}),
						},
						handheld: {
							...defaultMode,
							...(p.profiles?.handheld || {}),
						},
					},
				}
			})
			updatedGroup = savedDraft.group || []
			graphicsData = sanitizeGraphics(savedDraft.graphics)
			youtubeLinks = savedDraft.youtube || []
		}
		if (performanceProfiles.length === 0) addNewVersion()
	})

	$effect(() => {
		if (!browser) return
		const dataToSave = {
			name,
			performanceProfiles,
			graphics: graphicsData,
			youtube: youtubeLinks,
			group: updatedGroup,
		}
		const timer = setTimeout(
			() => draftsStore.save(id, JSON.parse(JSON.stringify(dataToSave))),
			500,
		)
		return () => clearTimeout(timer)
	})

	function addNewVersion () {
		let nextVersion = '1.0.0'
		if (performanceProfiles.length > 0) {
			const getVersionParts = (v) =>
				(v.match(/[\d.]+/)?.[0] || '0').split('.').map(Number)
			const latestProfile = [...performanceProfiles]
				.filter((p) => p.gameVersion)
				.sort((a, b) => {
					const partsA = getVersionParts(a.gameVersion)
					const partsB = getVersionParts(b.gameVersion)
					for (
						let i = 0;
						i < Math.max(partsA.length, partsB.length);
						i++
					) {
						if ((partsB[i] || 0) !== (partsA[i] || 0))
							return (partsB[i] || 0) - (partsA[i] || 0)
					}
					return 0
				})[0]
			if (latestProfile) {
				const parts = getVersionParts(latestProfile.gameVersion)
				while (parts.length < 3) parts.push(0)
				parts[parts.length - 1]++
				nextVersion = parts.join('.')
			}
		}
		performanceProfiles.push({
			gameVersion: nextVersion,
			suffix: '',
			profiles: {
				docked: {
					resolution_type: 'Fixed',
					fps_behavior: 'Locked',
					resolution: '',
					resolutions: '',
					min_res: '',
					max_res: '',
					resolution_notes: '',
					target_fps: '',
					fps_notes: '',
				},
				handheld: {
					resolution_type: 'Fixed',
					fps_behavior: 'Locked',
					resolution: '',
					resolutions: '',
					min_res: '',
					max_res: '',
					resolution_notes: '',
					target_fps: '',
					fps_notes: '',
				},
			},
		})
	}
	function removeVersion (idToRemove) {
		performanceProfiles = performanceProfiles.filter(
			(p) => p.id !== idToRemove,
		)
	}

	function addResolution (mode) {
		const resolution = graphicsData[mode].resolution
		if (!resolution.multipleResolutions) {
			resolution.multipleResolutions = []
		}
		resolution.multipleResolutions.push('')
	}

	function removeResolution (mode, index) {
		graphicsData[mode].resolution.multipleResolutions.splice(index, 1)
	}

	function addAdditionalLock (mode) {
		const framerate = graphicsData[mode].framerate
		if (!framerate.additionalLocks) {
			framerate.additionalLocks = []
		}
		framerate.additionalLocks.push({
			lockType: 'API',
			targetFps: '',
			notes: '',
		})
	}

	function removeAdditionalLock (mode, index) {
		graphicsData[mode].framerate.additionalLocks.splice(index, 1)
	}

	function addGraphicsField (section, subkey) {
		const target = subkey
			? graphicsData[section][subkey]
			: graphicsData[section]
		if (!target) return
		target[''] = { value: '', notes: '' }
	}
	function updateGraphicsKey (section, oldKey, newKey, subkey) {
		const target = subkey
			? graphicsData[section][subkey]
			: graphicsData[section]
		if (!target || oldKey === newKey || newKey === '') return
		const value = target[oldKey]
		delete target[oldKey]
		target[newKey] = value
	}
	function removeGraphicsField (section, key, subkey) {
		const target = subkey
			? graphicsData[section][subkey]
			: graphicsData[section]
		if (target) delete target[key]
	}

	function addYoutubeLink () {
		youtubeLinks = [...youtubeLinks, { url: '', notes: '' }]
	}
	function removeYoutubeLink (index) {
		youtubeLinks.splice(index, 1)
		youtubeLinks = youtubeLinks
	}

	async function performGroupingSearch () {
		if (groupingSearchInput.length < 3) {
			groupingSearchResults = []
			return
		}
		groupingSearchLoading = true
		try {
			const res = await fetch(
				`/api/v1/games/search?q=${encodeURIComponent(groupingSearchInput)}`,
			)
			if (res.ok) groupingSearchResults = await res.json()
		} catch (e) {
			console.error('Search failed', e)
		} finally {
			groupingSearchLoading = false
		}
	}
	function handleGroupingSearchInput () {
		clearTimeout(groupingDebounceTimer)
		groupingDebounceTimer = setTimeout(performGroupingSearch, 300)
	}
	function isAlreadyInGroup (titleId) {
		return updatedGroup.some((t) => t.id === titleId)
	}
	function addToGroup (title) {
		if (!isAlreadyInGroup(title.id)) {
			updatedGroup = [...updatedGroup, title]
			groupingSearchInput = ''
			groupingSearchResults = []
		}
	}
	function removeFromGroup (titleId) {
		if (titleId === id) return // Prevent removing the primary title
		updatedGroup = updatedGroup.filter((t) => t.id !== titleId)
	}
</script>

<svelte:head>
	<title>Contribute Data for {name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="page-container">
	<a href={`/title/${id}`} class="back-link">← Back to {name}</a>
	<h1>Contribute Data</h1>
	<p class="subtitle">
		Suggesting edits for <strong class="game-name">{name}</strong> ({id})
	</p>

	{#if $preferences.betaFlow}
		<div class="beta-banner">
			<div class="beta-icon">
				<Icon icon="mdi:flask-outline" width="24" />
			</div>
			<div class="beta-content">
				<h3>Beta Contribution Flow Active</h3>
				<p>
					Your contribution will be saved to our database immediately
					and appear as <strong>"Pending"</strong> on the site while the
					GitHub Pull Request is reviewed.
				</p>
			</div>
		</div>
	{/if}

	{#if form?.success}
		<div class="success-message" role="alert">
			<Icon icon="mdi:check-decagram" aria-hidden="true" />
			<div class="success-content">
				<h2>Submission Successful!</h2>
				<p>
					Your contribution has been submitted for review. Thank you!
				</p>
				<div class="success-actions">
					<a
						href={form.prUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="cta-button">View Pull Request</a
					>
					<a href="/" class="secondary-button">Return Home</a>
				</div>
			</div>
		</div>
	{:else}
		<form
			bind:this={formElement}
			method="POST"
			use:enhance={() => {
				isSubmitting = true
				showConfirmation = false
				return async ({ update }) => {
					await deleteDraft(id)
					await update()
					isSubmitting = false
				}
			}}
		>
			<!-- Hidden form data -->
			<input type="hidden" name="titleId" value={id} />
			<input type="hidden" name="gameName" value={name} />
			<input type="hidden" name="currentGroupId" value={groupId} />
			<input
				type="hidden"
				name="performanceData"
				value={JSON.stringify(
					performanceProfiles.map(({ _tempId, ...p }) => p),
				)}
			/>
			<input
				type="hidden"
				name="graphicsData"
				value={JSON.stringify(pruneEmptyValues(graphicsData) || {})}
			/>
			<input
				type="hidden"
				name="youtubeLinks"
				value={JSON.stringify(youtubeLinks)}
			/>
			<input
				type="hidden"
				name="updatedGroupData"
				value={JSON.stringify(updatedGroup)}
			/>
			<input
				type="hidden"
				name="originalGroupData"
				value={JSON.stringify(allTitlesInGroup)}
			/>
			<input
				type="hidden"
				name="originalPerformanceData"
				value={JSON.stringify(existingPerformance)}
			/>
			<input
				type="hidden"
				name="originalGraphicsData"
				value={JSON.stringify(existingGraphics)}
			/>
			<input
				type="hidden"
				name="originalYoutubeLinks"
				value={JSON.stringify(existingYoutubeLinks)}
			/>
			<input type="hidden" name="shas" value={JSON.stringify(shas)} />

			<div class="tabs">
				<button
					type="button"
					class:active={activeTab === 'performance'}
					onclick={() => (activeTab = 'performance')}
					>Performance</button
				>
				<button
					type="button"
					class:active={activeTab === 'graphics'}
					onclick={() => (activeTab = 'graphics')}>Graphics</button
				>
				<button
					type="button"
					class:active={activeTab === 'youtube'}
					onclick={() => (activeTab = 'youtube')}>YouTube</button
				>
				<button
					type="button"
					class:active={activeTab === 'grouping'}
					onclick={() => (activeTab = 'grouping')}>Grouping</button
				>
			</div>

			<div class="tab-content">
				{#if activeTab === 'performance'}
					<PerformanceTab
						bind:performanceProfiles
						{addNewVersion}
						{removeVersion}
					/>
				{/if}
				{#if activeTab === 'graphics'}
					<GraphicsTab
						bind:graphicsData
						{addResolution}
						{removeResolution}
						{addAdditionalLock}
						{removeAdditionalLock}
						{addGraphicsField}
						{updateGraphicsKey}
						{removeGraphicsField}
					/>
				{/if}
				{#if activeTab === 'youtube'}
					<YoutubeTab
						bind:youtubeLinks
						{addYoutubeLink}
						{removeYoutubeLink}
					/>
				{/if}
				{#if activeTab === 'grouping'}
					<GroupingTab
						bind:updatedGroup
						bind:groupingSearchInput
						bind:groupingSearchResults
						bind:groupingSearchLoading
						{handleGroupingSearchInput}
						{addToGroup}
						{removeFromGroup}
						{isAlreadyInGroup}
						{id}
					/>
				{/if}
			</div>

			<div class="form-footer">
				{#if form?.error}
					<div class="error-message" role="alert">
						Error: {form.error}
					</div>
				{/if}
				<button
					class="submit-button"
					type="button"
					onclick={() => (showConfirmation = true)}
					disabled={isSubmitting || !hasMeaningfulChanges}
				>
					{#if isSubmitting}
						<Icon icon="line-md:loading-loop" /> Submitting...
					{:else if !hasMeaningfulChanges}
						No Changes Detected
					{:else}
						Submit for Review
					{/if}
				</button>
			</div>
		</form>
	{/if}
</main>

{#if showConfirmation}
	<div
		class="modal-overlay"
		onclick={() => (showConfirmation = false)}
		onkeydown={(e) => e.key === 'Escape' && (showConfirmation = false)}
		role="presentation"
	>
		<div
			class="modal-content"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-label="Confirm Submission"
			tabindex="-1"
		>
			<div class="modal-header">
				<h2>Confirm Your Submission</h2>
				<button
					class="close-btn"
					onclick={() => (showConfirmation = false)}
					aria-label="Close"><Icon icon="mdi:close" /></button
				>
			</div>
			<div class="modal-body">
				<div class="summary-box">
					<h4>Summary of Changes</h4>
					<ul>
						{#each changeSummary as change}<li>{change}</li>{/each}
					</ul>
				</div>
				{#each performanceProfiles as profile (profile.id || profile.tempId)}
					{#if !isProfileEmpty(profile)}
						<div class="preview-section">
							<h4>Performance: Version {profile.gameVersion}</h4>
							<div class="preview-card">
								<div class="mode-section">
									<h5 class="perf-mode-title">Docked</h5>
									<div class="perf-grid">
										<div class="perf-item">
											<p class="label">Resolution</p>
											<p class="value">
												{formatPerfResolution(
													profile.profiles.docked,
												)}
											</p>
										</div>
										<div class="perf-item">
											<p class="label">Framerate</p>
											<p class="value">
												{formatPerfFramerate(
													profile.profiles.docked,
												)}
											</p>
										</div>
									</div>
								</div>
								<div class="mode-section perf-mode-separator">
									<h5 class="perf-mode-title">Handheld</h5>
									<div class="perf-grid">
										<div class="perf-item">
											<p class="label">Resolution</p>
											<p class="value">
												{formatPerfResolution(
													profile.profiles.handheld,
												)}
											</p>
										</div>
										<div class="perf-item">
											<p class="label">Framerate</p>
											<p class="value">
												{formatPerfFramerate(
													profile.profiles.handheld,
												)}
											</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					{/if}
				{/each}
				{#if !isGraphicsEmpty(graphicsData)}
					<div class="preview-section">
						<h4>Graphics Settings</h4>
						<div class="preview-card">
							<div class="mode-section">
								<h5 class="perf-mode-title">Docked</h5>
								<div class="perf-grid">
									{#if graphicsData.docked.resolution}
										<div class="perf-item">
											<p class="label">Resolution</p>
											<p class="value">
												{formatGfxResolution(
													graphicsData.docked
														.resolution,
												)}
											</p>
										</div>
									{/if}
									{#if graphicsData.docked.framerate}
										<div class="perf-item">
											<p class="label">Framerate</p>
											<p class="value">
												{formatGfxFramerate(
													graphicsData.docked
														.framerate,
												)}
											</p>
											<p class="label">
												{graphicsData.docked.framerate
													.apiBuffering} Buffer
											</p>
										</div>
									{/if}
									{#each Object.entries(graphicsData.docked.custom || {}) as [key, data]}
										<div class="perf-item">
											<p class="label">{key}</p>
											<p class="value">{data.value}</p>
										</div>
									{/each}
								</div>
							</div>
							<div class="mode-section perf-mode-separator">
								<h5 class="perf-mode-title">Handheld</h5>
								<div class="perf-grid">
									{#if graphicsData.handheld.resolution}
										<div class="perf-item">
											<p class="label">Resolution</p>
											<p class="value">
												{formatGfxResolution(
													graphicsData.handheld
														.resolution,
												)}
											</p>
										</div>
									{/if}
									{#if graphicsData.handheld.framerate}
										<div class="perf-item">
											<p class="label">Framerate</p>
											<p class="value">
												{formatGfxFramerate(
													graphicsData.handheld
														.framerate,
												)}
											</p>
											<p class="label">
												{graphicsData.handheld.framerate
													.apiBuffering} Buffer
											</p>
										</div>
									{/if}
									{#each Object.entries(graphicsData.handheld.custom || {}) as [key, data]}
										<div class="perf-item">
											<p class="label">{key}</p>
											<p class="value">{data.value}</p>
										</div>
									{/each}
								</div>
							</div>
							{#if Object.keys(graphicsData.shared || {}).length > 0}
								<div class="mode-section perf-mode-separator">
									<h5 class="perf-mode-title">Shared</h5>
									<div class="perf-grid">
										{#each Object.entries(graphicsData.shared || {}) as [key, data]}
											<div class="perf-item">
												<p class="label">{key}</p>
												<p class="value">
													{data.value}
												</p>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
			<div class="modal-footer">
				<button
					class="cancel-btn"
					onclick={() => (showConfirmation = false)}>Cancel</button
				>
				<button
					class="confirm-btn"
					onclick={() => formElement?.requestSubmit()}
					>Confirm & Submit</button
				>
			</div>
		</div>
	</div>
{/if}

<style>
	/* --- Main Layout & Common --- */
	.page-container {
		max-width: 900px;
		margin: 0 auto;
		padding: 1.5rem 1.5rem 8rem;
	}

	/* --- Beta Banner --- */
	.beta-banner {
		display: flex;
		gap: 1rem;
		background: color-mix(
			in srgb,
			var(--primary-color) 10%,
			var(--surface-color)
		);
		border: 1px solid
			color-mix(in srgb, var(--primary-color) 30%, transparent);
		border-radius: var(--radius-lg);
		padding: 1rem 1.25rem;
		margin-bottom: 2rem;
		align-items: center;
	}

	.beta-icon {
		color: var(--primary-color);
		background: color-mix(in srgb, var(--primary-color) 15%, transparent);
		padding: 0.75rem;
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.beta-content h3 {
		margin: 0 0 0.25rem 0;
		font-size: 1.1rem;
		color: var(--text-primary);
	}

	.beta-content p {
		margin: 0;
		font-size: 0.95rem;
		color: var(--text-secondary);
		line-height: 1.4;
	}

	.beta-content strong {
		color: var(--primary-color);
	}

	.back-link {
		display: inline-block;
		margin-bottom: 2rem;
		color: var(--text-secondary);
	}
	h1 {
		margin: 0;
		font-size: 2.5rem;
	}
	.subtitle {
		margin: 0.5rem 0 2.5rem;
		font-size: 1.1rem;
		color: var(--text-secondary);
	}
	.game-name {
		color: var(--primary-color);
	}

	/* --- Tabs --- */
	.tabs {
		border-bottom: 2px solid var(--border-color);
		margin-bottom: 2rem;
		overflow-x: auto;
		white-space: nowrap;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
	}
	.tabs::-webkit-scrollbar {
		display: none;
	}
	.tabs button {
		display: inline-block;
		padding: 0.75rem 1.25rem;
		border: none;
		background: none;
		font-size: 1rem;
		font-weight: 500;
		color: var(--text-secondary);
		cursor: pointer;
		border-bottom: 2px solid transparent;
		margin-bottom: -2px;
	}
	.tabs button.active {
		color: var(--primary-color);
		border-color: var(--primary-color);
	}
	.tab-content {
		animation: fadeIn 0.3s ease;
	}
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* --- Footer & Submission --- */
	.form-footer {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.5rem;
		background-color: color-mix(
			in srgb,
			var(--surface-color) 90%,
			transparent
		);
		backdrop-filter: blur(8px);
		border-top: 1px solid var(--border-color);
		z-index: 10;
	}
	.submit-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
		font-weight: 600;
		color: var(--primary-action-text);
		background-color: var(--primary-color);
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
	}
	.submit-button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}
	.error-message {
		color: #ef4444;
		font-weight: 500;
	}

	/* --- Modal --- */
	.modal-overlay {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(4px);
		z-index: 100;
	}
	.modal-content {
		display: flex;
		flex-direction: column;
		width: 90%;
		max-width: 800px;
		max-height: 90vh;
		background-color: var(--background-color);
		border-radius: var(--radius-lg);
	}
	.modal-header,
	.modal-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid var(--border-color);
	}
	.modal-body {
		padding: 1.5rem;
		overflow-y: auto;
	}
	.summary-box {
		margin-bottom: 2rem;
		padding: 1rem 1.5rem;
		background-color: var(--input-bg);
		border-left: 4px solid var(--primary-color);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
	}
	.summary-box ul {
		list-style-type: disc;
		padding-left: 1.25rem;
	}
	.modal-footer {
		justify-content: flex-end;
		gap: 1rem;
		border-top: 1px solid var(--border-color);
	}
	.cancel-btn,
	.confirm-btn {
		padding: 0.6rem 1.2rem;
		font-weight: 600;
		border-radius: var(--radius-md);
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
		border: none;
	}

	/* --- Modal Preview Styles --- */
	.preview-section {
		margin-bottom: 2rem;
	}
	.preview-section h4 {
		font-size: 1.2rem;
		font-weight: 600;
		margin-bottom: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--border-color);
	}
	.preview-card {
		padding: 1.5rem;
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
	}
	.mode-section + .mode-section {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border-color);
	}
	.perf-mode-title {
		font-size: 1.1rem;
		font-weight: 600;
		margin: 0 0 1rem;
	}
	.perf-grid {
		display: grid;
		gap: 1rem;
	}
	@media (min-width: 640px) {
		.perf-grid {
			grid-template-columns: 1fr 1fr;
		}
	}
	.perf-item p {
		margin: 0;
	}
	.perf-item .label {
		font-size: 0.8rem;
		color: var(--text-secondary);
		margin-bottom: 0.25rem;
	}
	.perf-item .value {
		font-weight: 500;
		color: var(--text-primary);
	}

	/* --- Success Message --- */
	.success-message {
		display: flex;
		gap: 1.5rem;
		padding: 1.5rem;
		background-color: var(--surface-color);
		border: 1px solid var(--border-color);
		border-left: 4px solid #4ade80;
		border-radius: var(--radius-lg);
	}
	.success-message > :global(svg) {
		flex-shrink: 0;
		margin-top: 0.25rem;
		font-size: 2.5rem;
		color: #4ade80;
	}
	.success-message h2 {
		margin: 0 0 0.5rem;
	}
	.success-message p {
		margin-bottom: 1.5rem;
		color: var(--text-secondary);
	}
	.success-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}
	.cta-button,
	.secondary-button {
		display: inline-block;
		padding: 10px 20px;
		font-weight: 600;
		border-radius: var(--radius-md);
		text-decoration: none;
	}
	.cta-button {
		background-color: var(--primary-color);
		color: var(--primary-action-text);
	}
	.secondary-button {
		background-color: var(--surface-color);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
	}
</style>
