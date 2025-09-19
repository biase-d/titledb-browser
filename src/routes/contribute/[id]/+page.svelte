<script>
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';
	import { draftsStore } from '$lib/stores';
	import { getDraft, deleteDraft } from '$lib/indexedDB';
	import { generateChangeSummary, pruneEmptyValues, isProfileEmpty, isGraphicsEmpty } from '$lib/utils.js';

	import Icon from '@iconify/svelte';

	let { data, form } = $props();

	const { id, name, allTitlesInGroup, existingPerformance, existingGraphics, existingYoutubeLinks, shas } = $derived(data);

	let performanceProfiles = $state([]);
	let graphicsData = $state(/** @type {any} */ ({}));
	let youtubeLinks = $state([]);
	let updatedGroup = $state([]);
	
	let isSubmitting = $state(false);
	let showConfirmation = $state(false);
	let formElement = $state(/** @type {HTMLFormElement | null} */ (null));
	let activeTab = $state('performance');
	
	let groupingSearchInput = $state('');
	let groupingSearchResults = $state([]);
	let groupingSearchLoading = $state(false);
	let groupingDebounceTimer;
	
	function sanitizeGraphics(g = {}) {
		const framerateDefaults = { additionalLocks: [], apiBuffering: 'Unknown' };
		const resolutionDefaults = { notes: '', multipleResolutions: [''] };
		const defaults = { resolution: resolutionDefaults, framerate: {}, custom: {} };

		const sanitizeMode = (modeData = {}) => {
			const framerate = { ...framerateDefaults, ...(modeData.framerate || {}) };
			framerate.additionalLocks = (framerate.additionalLocks || []).map(lock => ({ lockType: 'API', targetFps: '', notes: '', ...lock }));
			const resolution = { ...resolutionDefaults, ...(modeData.resolution || {}) };
			if (!Array.isArray(resolution.multipleResolutions) || resolution.multipleResolutions.length === 0) {
				resolution.multipleResolutions = [''];
			}

			return {
				...defaults,
				...modeData,
				resolution,
				framerate
			};
		};

		return {
			docked: sanitizeMode(g?.docked),
			handheld: sanitizeMode(g?.handheld),
			shared: g?.shared || {}
		};
	}

	function formatPerfResolution(modeData) {
		if (!modeData) return 'N/A';
		switch (modeData.resolution_type) {
			case 'Fixed': return `Fixed at ${modeData.resolution || 'N/A'}`;
			case 'Dynamic':
				if (!modeData.min_res && !modeData.max_res) return 'Dynamic';
				return `Dynamic ${modeData.min_res || '?'} ~ ${modeData.max_res || '?'}`;
			case 'Multiple Fixed':
				return `Multiple: ${modeData.resolutions?.split(',').filter(Boolean).map(r => r.trim()).join(', ') || 'N/A'}`;
			default: return 'N/A';
		}
	}

	function formatPerfFramerate(modeData) {
		if (!modeData) return 'N/A';
		return modeData.target_fps ? `${modeData.fps_behavior} ${modeData.target_fps} FPS` : modeData.fps_behavior || 'N/A';
	}

	function formatGfxResolution(resData) {
		if (!resData) return 'N/A';
		switch (resData.resolutionType) {
			case 'Fixed': return `Fixed at ${resData.fixedResolution || 'N/A'}`;
			case 'Dynamic':
				const min = resData.minResolution || '?';
				const max = resData.maxResolution || '?';
				if (min === '?' && max === '?') return 'Dynamic';
				return `Dynamic, ${min} to ${max}`;
			case 'Multiple Fixed': return resData.multipleResolutions?.filter(Boolean).join(', ') || 'N/A';
			default: return 'N/A';
		}
	}

	function formatGfxFramerate(fpsData) {
		if (!fpsData) return 'N/A';
		switch (fpsData.lockType) {
			case 'Unlocked': return 'Unlocked';
			case 'API': return `API Locked to ${fpsData.targetFps} FPS`;
			case 'Custom': return `Custom Lock to ${fpsData.targetFps} FPS`;
			default: return 'N/A';
		}
	}
	
	{
		const sanitizedInitialPerformance = (existingPerformance || []).map(p => {
			const defaultMode = { resolution_type: 'Fixed', fps_behavior: 'Locked', resolution: '', resolutions: '', min_res: '', max_res: '', resolution_notes: '', target_fps: '', fps_notes: '' };
			const docked = { ...defaultMode, ...(p.profiles?.docked || {}) };
			const handheld = { ...defaultMode, ...(p.profiles?.handheld || {}) };
			return { ...p, profiles: { docked, handheld } };
		});
		
		performanceProfiles = structuredClone(sanitizedInitialPerformance);
		graphicsData = sanitizeGraphics(existingGraphics?.settings);
		youtubeLinks = structuredClone(existingYoutubeLinks || []);
		updatedGroup = structuredClone(allTitlesInGroup || []);
	}
	
	const changeSummary = $derived(generateChangeSummary(
		{ originalPerformance: existingPerformance, originalGraphics: existingGraphics, originalYoutubeLinks: existingYoutubeLinks, originalGroup: allTitlesInGroup },
		{ performanceProfiles, graphicsData: pruneEmptyValues(graphicsData), youtubeLinks, updatedGroup }
	));
	const hasMeaningfulChanges = $derived(
		changeSummary.length > 0 && !changeSummary.every(s => s.includes('Added empty placeholder'))
	);

	onMount(async () => {
		const savedDraft = await getDraft(id);
		if (savedDraft) {
			const rawProfiles = savedDraft.performanceProfiles || [];
			performanceProfiles = rawProfiles.map(p => {
				const defaultMode = { resolution_type: 'Fixed', fps_behavior: 'Locked', resolution: '', resolutions: '', min_res: '', max_res: '', resolution_notes: '', target_fps: '', fps_notes: '' };
				return { ...p, profiles: { docked: { ...defaultMode, ...(p.profiles?.docked || {}) }, handheld: { ...defaultMode, ...(p.profiles?.handheld || {}) } } };
			});
			updatedGroup = savedDraft.group || [];
			graphicsData = sanitizeGraphics(savedDraft.graphics);
			youtubeLinks = savedDraft.youtube || [];
		}
		if (performanceProfiles.length === 0) addNewVersion();
	});

	$effect(() => {
		if (!browser) return;
		const dataToSave = { name, performanceProfiles, graphics: graphicsData, youtube: youtubeLinks, group: updatedGroup };
		const timer = setTimeout(() => draftsStore.save(id, JSON.parse(JSON.stringify(dataToSave))), 500);
		return () => clearTimeout(timer);
	});
	
	function addNewVersion() {
		let nextVersion = '1.0.0';
		if (performanceProfiles.length > 0) {
			const getVersionParts = (v) => (v.match(/[\d.]+/)?.[0] || '0').split('.').map(Number);
			const latestProfile = [...performanceProfiles].filter(p => p.gameVersion).sort((a, b) => {
				const partsA = getVersionParts(a.gameVersion);
				const partsB = getVersionParts(b.gameVersion);
				for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
					if ((partsB[i] || 0) !== (partsA[i] || 0)) return (partsB[i] || 0) - (partsA[i] || 0);
				}
				return 0;
			})[0];
			if (latestProfile) {
				const parts = getVersionParts(latestProfile.gameVersion);
				while (parts.length < 3) parts.push(0);
				parts[parts.length - 1]++;
				nextVersion = parts.join('.');
			}
		}
		performanceProfiles.push({
			tempId: crypto.randomUUID(), gameVersion: nextVersion, suffix: '',
			profiles: {
				docked: { resolution_type: 'Fixed', fps_behavior: 'Locked', resolution: '', resolutions: '', min_res: '', max_res: '', resolution_notes: '', target_fps: '', fps_notes: '' },
				handheld: { resolution_type: 'Fixed', fps_behavior: 'Locked', resolution: '', resolutions: '', min_res: '', max_res: '', resolution_notes: '', target_fps: '', fps_notes: '' }
			}
		});
	}
	function removeVersion(idToRemove) {
		performanceProfiles = performanceProfiles.filter(p => (p.id || p.tempId) !== idToRemove);
	}

	function addResolution(mode) {
		const resolution = graphicsData[mode].resolution;
		if (!resolution.multipleResolutions) {
			resolution.multipleResolutions = [];
		}
		resolution.multipleResolutions.push('');
	}

	function removeResolution(mode, index) {
		graphicsData[mode].resolution.multipleResolutions.splice(index, 1);
	}

	function addAdditionalLock(mode) {
		const framerate = graphicsData[mode].framerate;
		if (!framerate.additionalLocks) {
			framerate.additionalLocks = [];
		}
		framerate.additionalLocks.push({ lockType: 'API', targetFps: '', notes: '' });
	}

	function removeAdditionalLock(mode, index) {
		graphicsData[mode].framerate.additionalLocks.splice(index, 1);
	}

	function addGraphicsField(section, subkey) {
		const target = subkey ? graphicsData[section][subkey] : graphicsData[section];
		if (!target) return;
		target[''] = { value: '', notes: '' };
	}
	function updateGraphicsKey(section, oldKey, newKey, subkey) {
		const target = subkey ? graphicsData[section][subkey] : graphicsData[section];
		if (!target || oldKey === newKey || newKey === '') return;
		const value = target[oldKey];
		delete target[oldKey];
		target[newKey] = value;
	}
	function removeGraphicsField(section, key, subkey) {
		const target = subkey ? graphicsData[section][subkey] : graphicsData[section];
		if (target) delete target[key];
	}

	function addYoutubeLink() { youtubeLinks = [...youtubeLinks, { url: '', notes: '' }]; }
	function removeYoutubeLink(index) { youtubeLinks.splice(index, 1); youtubeLinks = youtubeLinks; }

	async function performGroupingSearch() {
		if (groupingSearchInput.length < 3) { groupingSearchResults = []; return; }
		groupingSearchLoading = true;
		try {
			const res = await fetch(`/api/v1/games/search?q=${encodeURIComponent(groupingSearchInput)}`);
			if (res.ok) groupingSearchResults = await res.json();
		} catch (e) { console.error('Search failed', e); } 
		finally { groupingSearchLoading = false; }
	}
	function handleGroupingSearchInput() {
		clearTimeout(groupingDebounceTimer);
		groupingDebounceTimer = setTimeout(performGroupingSearch, 300);
	}
	function isAlreadyInGroup(titleId) { return updatedGroup.some((t) => t.id === titleId); }
	function addToGroup(title) {
		if (!isAlreadyInGroup(title.id)) {
			updatedGroup = [...updatedGroup, title];
			groupingSearchInput = '';
			groupingSearchResults = [];
		}
	}
	function removeFromGroup(titleId) {
		if (titleId === id) return; // Prevent removing the primary title
		updatedGroup = updatedGroup.filter((t) => t.id !== titleId);
	}
</script>

<svelte:head>
	<title>Contribute Data for {name}</title>
</svelte:head>

<main class="page-container">
	<a href={`/title/${id}`} class="back-link">← Back to {name}</a>
	<h1>Contribute Data</h1>
	<p class="subtitle">Suggesting edits for <strong class="game-name">{name}</strong> ({id})</p>

	{#if form?.success}
		<div class="success-message" role="alert">
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
			<!-- Hidden form data -->
			<input type="hidden" name="titleId" value={id} />
			<input type="hidden" name="gameName" value={name} />
			<input type="hidden" name="performanceData" value={JSON.stringify(performanceProfiles.map(({ tempId, ...p }) => p))} />
			<input type="hidden" name="graphicsData" value={JSON.stringify(pruneEmptyValues(graphicsData) || {})} />
			<input type="hidden" name="youtubeLinks" value={JSON.stringify(youtubeLinks)} />
			<input type="hidden" name="updatedGroupData" value={JSON.stringify(updatedGroup)} />
			<input type="hidden" name="originalGroupData" value={JSON.stringify(allTitlesInGroup)} />
			<input type="hidden" name="originalPerformanceData" value={JSON.stringify(existingPerformance)} />
			<input type="hidden" name="originalGraphicsData" value={JSON.stringify(existingGraphics)} />
			<input type="hidden" name="originalYoutubeLinks" value={JSON.stringify(existingYoutubeLinks)} />
			<input type="hidden" name="shas" value={JSON.stringify(shas)} />
			
			<div class="tabs">
				<button type="button" class:active={activeTab === 'performance'} onclick={() => activeTab = 'performance'}>Performance</button>
				<button type="button" class:active={activeTab === 'graphics'} onclick={() => activeTab = 'graphics'}>Graphics</button>
				<button type="button" class:active={activeTab === 'youtube'} onclick={() => activeTab = 'youtube'}>YouTube</button>
				<button type="button" class:active={activeTab === 'grouping'} onclick={() => activeTab = 'grouping'}>Grouping</button>
			</div>

			<div class="tab-content">
				<!-- Performance Tab -->
				{#if activeTab === 'performance'}
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
											<input id="version_suffix_{i}" type="text" bind:value={profile.suffix} placeholder="e.g. 'jp'" oninput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^a-zA-Z0-9_-]/g, ''); }} />
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
				{/if}
				<!-- Graphics Tab -->
				{#if activeTab === 'graphics'}
					<section class="form-section">
						<div class="form-card">
							<div class="mode-container">
								<!-- Handheld Graphics Form -->
								<fieldset>
									<legend>Handheld Mode</legend>
									<h4 class="sub-legend">Resolution</h4>
									<div class="form-grid">
										<div class="form-group">
											<label>Resolution Type</label>
											<select bind:value={graphicsData.handheld.resolution.resolutionType}>
												<option value="Fixed">Fixed</option>
												<option value="Dynamic">Dynamic</option>
												<option value="Multiple Fixed">Multiple Fixed</option>
											</select>
										</div>
										{#if graphicsData.handheld.resolution.resolutionType === 'Fixed'}
										<div class="form-group">
											<label>Resolution</label>
											<input placeholder="e.g., 1280x720" bind:value={graphicsData.handheld.resolution.fixedResolution} />
										</div>
										{/if}
										{#if graphicsData.handheld.resolution.resolutionType === 'Dynamic'}
											<div class="form-group">
												<label>Min Resolution</label>
												<input placeholder="e.g., 960x540" bind:value={graphicsData.handheld.resolution.minResolution} />
											</div>
											<div class="form-group">
												<label>Max Resolution</label>
												<input placeholder="e.g., 1280x720" bind:value={graphicsData.handheld.resolution.maxResolution} />
											</div>
										{/if}
									</div>
									{#if graphicsData.handheld.resolution.resolutionType === 'Multiple Fixed'}
										<div class="additional-locks-section">
											<label class="group-label">Resolutions</label>
											{#each graphicsData.handheld.resolution.multipleResolutions as res, i}
												<div class="additional-lock-row resolution">
													<input placeholder="e.g., 1024x576" bind:value={graphicsData.handheld.resolution.multipleResolutions[i]} />
													{#if graphicsData.handheld.resolution.multipleResolutions.length > 1}
														<button type="button" class="remove-btn" onclick={() => removeResolution('handheld', i)}>
															<Icon icon="mdi:minus-circle" />
														</button>
													{/if}
												</div>
											{/each}
											<button type="button" class="add-btn" onclick={() => addResolution('handheld')}>
												<Icon icon="mdi:plus" /> Add Resolution
											</button>
										</div>
									{/if}
									<div class="form-group form-group-full notes-field">
										<label>Resolution Notes</label>
										<textarea placeholder="e.g., May exhibit some aliasing..." bind:value={graphicsData.handheld.resolution.notes}></textarea>
									</div>
									<hr/>
									<h4 class="sub-legend">Framerate</h4>
									<div class="form-grid">
										<div class="form-group">
											<label>Default FPS Lock Type</label>
											<select bind:value={graphicsData.handheld.framerate.lockType}>
												<option value="Unlocked">Unlocked</option>
												<option value="API">API</option>
												<option value="Custom">Custom</option>
												<option value="Unknown">Unknown</option>
											</select>
										</div>
										<div class="form-group">
											<label for="api_buffering">Buffering Type</label>
											<select id="api_buffering" bind:value={graphicsData.handheld.framerate.apiBuffering}>
												<option value="Unknown">Unknown</option>
												<option value="Double">Double buffer</option>
												<option value="Double (Reversed)">Double buffer (Reversed)</option>
												<option value="Triple">Triple buffer</option>
												<option value="Quadruple">Quadruple buffer</option>
											</select>
										</div>
										{#if graphicsData.handheld.framerate.lockType !== 'Unlocked'}
										<div class="form-group">
											<label>Default Target FPS</label>
											<input type="number" placeholder="e.g., 30" bind:value={graphicsData.handheld.framerate.targetFps} />
										</div>
										{/if}
									</div>
									<div class="form-group form-group-full">
										<label>Default Framerate Notes</label>
										<textarea placeholder="Details on default stability, common dips, etc." bind:value={graphicsData.handheld.framerate.notes}></textarea>
									</div>
									<div class="additional-locks-section">
										<label class="group-label">Additional FPS Lock Type</label>
										{#each graphicsData.handheld.framerate.additionalLocks || [] as lock, index}
											<div class="additional-lock-item">
												<div class="additional-lock-row">
													<select bind:value={lock.lockType} aria-label="Additional lock type">
														<option value="API">API Lock</option>
														<option value="Custom">Custom Lock</option>
														<option value="Unlocked">Unlocked</option>
														<option value="Unknown">Unknown</option>
													</select>
													<input type="number" placeholder="Target FPS" bind:value={lock.targetFps} disabled={lock.lockType === 'Unlocked'} aria-label="Additional target FPS" />
													<button type="button" class="remove-btn" onclick={() => removeAdditionalLock('handheld', index)}>
														<Icon icon="mdi:minus-circle" />
													</button>
												</div>
												<textarea class="notes-input" placeholder="Notes for this mode (e.g., 'Quality Mode')" bind:value={lock.notes}></textarea>
											</div>
										{/each}
										<button type="button" class="add-btn" onclick={() => addAdditionalLock('handheld')}>
											<Icon icon="mdi:plus" /> Add FPS Lock Type
										</button>
									</div>
									<hr/>
									<h4 class="sub-legend">Custom Settings</h4>
									{#each Object.entries(graphicsData.handheld.custom || {}) as [key, fieldData]}
										<div class="field-wrapper">
											<div class="field-row">
												<input type="text" placeholder="Custom Setting" value={key} onchange={(e) => updateGraphicsKey('handheld', key, e.currentTarget.value, 'custom')} />
												<input type="text" placeholder="Value" bind:value={fieldData.value} />
												<button type="button" class="remove-btn" onclick={() => removeGraphicsField('handheld', key, 'custom')}><Icon icon="mdi:minus-circle" /></button>
											</div>
											<textarea placeholder="Notes..." bind:value={fieldData.notes} class="notes-input"></textarea>
										</div>
									{/each}
									<button type="button" class="add-btn" onclick={() => addGraphicsField('handheld', 'custom')}><Icon icon="mdi:plus" /> Add Custom Setting</button>
								</fieldset>
								<!-- Docked Mode Graphics Form -->
								<fieldset class="docked">
									<legend>Docked Mode</legend>
									<h4 class="sub-legend">Resolution</h4>
									<div class="form-grid">
										<div class="form-group">
											<label>Resolution Type</label>
											<select bind:value={graphicsData.docked.resolution.resolutionType}>
												<option value="Fixed">Fixed</option>
												<option value="Dynamic">Dynamic</option>
												<option value="Multiple Fixed">Multiple Fixed</option>
											</select>
										</div>
										{#if graphicsData.docked.resolution.resolutionType === 'Fixed'}
											<div class="form-group">
												<label>Resolution</label>
												<input placeholder="e.g., 1920x1080" bind:value={graphicsData.docked.resolution.fixedResolution} />
											</div>
										{/if}
										{#if graphicsData.docked.resolution.resolutionType === 'Dynamic'}
											<div class="form-group">
												<label>Min Resolution</label>
												<input placeholder="e.g., 1600x900" bind:value={graphicsData.docked.resolution.minResolution} />
											</div>
											<div class="form-group">
												<label>Max Resolution</label>
												<input placeholder="e.g., 1920x1080" bind:value={graphicsData.docked.resolution.maxResolution} />
											</div>
										{/if}
									</div>
									{#if graphicsData.docked.resolution.resolutionType === 'Multiple Fixed'}
										<div class="additional-locks-section">
											<label class="group-label">Resolutions</label>
											{#each graphicsData.docked.resolution.multipleResolutions as res, i}
												<div class="additional-lock-row resolution">
													<input placeholder="e.g., 1280x720" bind:value={graphicsData.docked.resolution.multipleResolutions[i]} />
													{#if graphicsData.docked.resolution.multipleResolutions.length > 1}
														<button type="button" class="remove-btn" onclick={() => removeResolution('docked', i)}>
															<Icon icon="mdi:minus-circle" />
														</button>
													{/if}
												</div>
											{/each}
											<button type="button" class="add-btn" onclick={() => addResolution('docked')}>
												<Icon icon="mdi:plus" /> Add Resolution
											</button>
										</div>
									{/if}
									<div class="form-group form-group-full notes-field">
										<label>Resolution Notes</label>
										<textarea placeholder="e.g., Utilizes TAAU, FSR 1.0..." bind:value={graphicsData.docked.resolution.notes}></textarea>
									</div>
									<hr/>
									<h4 class="sub-legend">Framerate</h4>
									<div class="form-grid">
										<div class="form-group">
											<label>Default FPS Lock Type</label>
											<select bind:value={graphicsData.docked.framerate.lockType}>
												<option value="Unlocked">Unlocked</option>
												<option value="API">API</option>
												<option value="Custom">Custom</option>
												<option value="Unknown">Unknown</option>
											</select>
										</div>
										<div class="form-group">
											<label for="api_buffering">Buffering Type</label>
											<select id="api_buffering" bind:value={graphicsData.docked.framerate.apiBuffering}>
												<option value="Unknown">Unknown</option>
												<option value="Double">Double buffer</option>
												<option value="Double (Reversed)">Double buffer (Reversed)</option>
												<option value="Triple">Triple buffer</option>
												<option value="Quadruple">Quadruple buffer</option>
											</select>
										</div>
										{#if graphicsData.docked.framerate.lockType !== 'Unlocked'}
											<div class="form-group">
												<label>Default Target FPS</label>
												<input type="number" placeholder="e.g., 60" bind:value={graphicsData.docked.framerate.targetFps} />
											</div>
										{/if}
									</div>
									<div class="form-group form-group-full">
										<label>Default Framerate Notes</label>
										<textarea placeholder="Details on default stability, common dips, etc." bind:value={graphicsData.docked.framerate.notes}></textarea>
									</div>
									<div class="additional-locks-section">
										<label class="group-label">Additional FPS Lock Type</label>
										{#each graphicsData.docked.framerate.additionalLocks || [] as lock, index}
											<div class="additional-lock-item">
												<div class="additional-lock-row">
													<select bind:value={lock.lockType} aria-label="Additional lock type">
														<option value="API">API Lock</option>
														<option value="Custom">Custom Lock</option>
														<option value="Unlocked">Unlocked</option>
														<option value="Unknown">Unknown</option>
													</select>
													<input type="number" placeholder="Target FPS" bind:value={lock.targetFps} disabled={lock.lockType === 'Unlocked'} aria-label="Additional target FPS" />
													<button type="button" class="remove-btn" onclick={() => removeAdditionalLock('docked', index)}>
														<Icon icon="mdi:minus-circle" />
													</button>
												</div>
												<textarea class="notes-input" placeholder="Notes for this mode (e.g., 'Performance Mode')" bind:value={lock.notes}></textarea>
											</div>
										{/each}
										<button type="button" class="add-btn" onclick={() => addAdditionalLock('docked')}>
											<Icon icon="mdi:plus" /> Add FPS Lock Type
										</button>
									</div>
									<hr/>
									<h4 class="sub-legend">Custom Settings</h4>
									{#each Object.entries(graphicsData.docked.custom || {}) as [key, fieldData]}
										<div class="field-wrapper">
											<div class="field-row">
												<input type="text" placeholder="Custom Setting" value={key} onchange={(e) => updateGraphicsKey('docked', key, e.currentTarget.value, 'custom')} />
												<input type="text" placeholder="Value" bind:value={fieldData.value} />
												<button type="button" class="remove-btn" onclick={() => removeGraphicsField('docked', key, 'custom')}><Icon icon="mdi:minus-circle" /></button>
											</div>
											<textarea placeholder="Notes..." bind:value={fieldData.notes} class="notes-input"></textarea>
										</div>
									{/each}
									<button type="button" class="add-btn" onclick={() => addGraphicsField('docked', 'custom')}><Icon icon="mdi:plus" /> Add Custom Setting</button>
								</fieldset>
								<fieldset>
									<legend>Shared Settings</legend>
									{#each Object.entries(graphicsData.shared || {}) as [key, fieldData]}
										<div class="field-wrapper">
											<div class="field-row">
												<input type="text" placeholder="Shared Setting" value={key} onchange={(e) => updateGraphicsKey('shared', key, e.currentTarget.value, null)} />
												<input type="text" placeholder="Value" bind:value={fieldData.value} />
												<button type="button" class="remove-btn" onclick={() => removeGraphicsField('shared', key, null)}><Icon icon="mdi:minus-circle" /></button>
											</div>
											<textarea placeholder="Notes..." bind:value={fieldData.notes} class="notes-input"></textarea>
										</div>
									{/each}
									<button type="button" class="add-btn" onclick={() => addGraphicsField('shared', null)}><Icon icon="mdi:plus" /> Add Shared Setting</button>
								</fieldset>
							</div>
						</div>
					</section>
				{/if}
				<!-- YouTube Tab -->
				{#if activeTab === 'youtube'}
					<section class="form-section">
						<div class="form-card">
							<div class="links-list">
								{#each youtubeLinks as link, i (i)}
									<div class="link-entry">
										<div class="link-row">
											<input type="url" placeholder="https://www.youtube.com/watch?v=..." bind:value={link.url} />
											<button class="remove-btn" onclick={() => removeYoutubeLink(i)} title="Remove Link">
												<Icon icon="mdi:close" />
											</button>
										</div>
										<textarea placeholder="Optional notes (e.g., 'Docked gameplay', 'Comparison video')" bind:value={link.notes}></textarea>
									</div>
								{/each}
							</div>
							<button type="button" class="add-btn" onclick={addYoutubeLink}>
								<Icon icon="mdi:plus-circle" /> Add Another Video
							</button>
						</div>
					</section>
				{/if}
				<!-- Grouping Tab -->
				{#if activeTab === 'grouping'}
					<section class="form-section">
						<div class="form-card">
							<div class="current-group-list">
								{#each updatedGroup as title (title.id)}
									<div class="group-item">
										<span>{title.name} ({title.id})</span>
										<button type="button" onclick={() => removeFromGroup(title.id)} title="Remove from group" disabled={title.id === id}>
											<Icon icon="mdi:close" />
										</button>
									</div>
								{/each}
							</div>
							<div class="search-section">
								<label for="group-search">Add another title to this group</label>
								<div class="search-input-wrapper">
									<input id="group-search" type="text" bind:value={groupingSearchInput} oninput={handleGroupingSearchInput} placeholder="Search by name or Title ID..." />
									{#if groupingSearchLoading}<div class="spinner"></div>{/if}
								</div>
								{#if groupingSearchResults.length > 0}
									<ul class="search-results">
										{#each groupingSearchResults as result}
											<li class:in-group={isAlreadyInGroup(result.id)}>
												<div class="result-info">
													<span class="result-name">{result.name}</span>
													<span class="result-id">{result.id}</span>
												</div>
												<button type="button" class="add-button" onclick={() => addToGroup(result)} disabled={isAlreadyInGroup(result.id)}>
													<Icon icon={isAlreadyInGroup(result.id) ? 'mdi:check' : 'mdi:plus'} /> {isAlreadyInGroup(result.id) ? 'Added' : 'Add'}
												</button>
											</li>
										{/each}
									</ul>
								{/if}
							</div>
						</div>
					</section>
				{/if}
			</div>

			<div class="form-footer">
				{#if form?.error}
					<div class="error-message" role="alert">Error: {form.error}</div>
				{/if}
				<button 
					class="submit-button" 
					type="button" 
					onclick={() => showConfirmation = true}
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
	<div class="modal-overlay" onclick={() => showConfirmation = false}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>Confirm Your Submission</h2>
				<button class="close-btn" onclick={() => showConfirmation = false} aria-label="Close"><Icon icon="mdi:close" /></button>
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
										<div class="perf-item"><p class="label">Resolution</p><p class="value">{formatPerfResolution(profile.profiles.docked)}</p></div>
										<div class="perf-item"><p class="label">Framerate</p><p class="value">{formatPerfFramerate(profile.profiles.docked)}</p></div>
									</div>
								</div>
								<div class="mode-section perf-mode-separator">
									<h5 class="perf-mode-title">Handheld</h5>
									<div class="perf-grid">
										<div class="perf-item"><p class="label">Resolution</p><p class="value">{formatPerfResolution(profile.profiles.handheld)}</p></div>
										<div class="perf-item"><p class="label">Framerate</p><p class="value">{formatPerfFramerate(profile.profiles.handheld)}</p></div>
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
										<div class="perf-item"><p class="label">Resolution</p><p class="value">{formatGfxResolution(graphicsData.docked.resolution)}</p></div>
									{/if}
									{#if graphicsData.docked.framerate}
										<div class="perf-item">
											<p class="label">Framerate</p>
											<p class="value">{formatGfxFramerate(graphicsData.docked.framerate)}</p>
											<p class="label">{graphicsData.docked.framerate.apiBuffering} Buffer</p>
										</div>
									{/if}
									{#each Object.entries(graphicsData.docked.custom || {}) as [key, data]}
										<div class="perf-item"><p class="label">{key}</p><p class="value">{data.value}</p></div>
									{/each}
								</div>
							</div>
							<div class="mode-section perf-mode-separator">
								<h5 class="perf-mode-title">Handheld</h5>
								<div class="perf-grid">
									{#if graphicsData.handheld.resolution}
										<div class="perf-item"><p class="label">Resolution</p><p class="value">{formatGfxResolution(graphicsData.handheld.resolution)}</p></div>
									{/if}
									{#if graphicsData.handheld.framerate}
										<div class="perf-item">
											<p class="label">Framerate</p>
											<p class="value">{formatGfxFramerate(graphicsData.handheld.framerate)}</p>
											<p class="label">{graphicsData.handheld.framerate.apiBuffering} Buffer</p>
										</div>
									{/if}
									{#each Object.entries(graphicsData.handheld.custom || {}) as [key, data]}
										<div class="perf-item"><p class="label">{key}</p><p class="value">{data.value}</p></div>
									{/each}
								</div>
							</div>
							{#if Object.keys(graphicsData.shared || {}).length > 0}
								<div class="mode-section perf-mode-separator">
									<h5 class="perf-mode-title">Shared</h5>
									<div class="perf-grid">
										{#each Object.entries(graphicsData.shared || {}) as [key, data]}
											<div class="perf-item"><p class="label">{key}</p><p class="value">{data.value}</p></div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
			<div class="modal-footer">
				<button class="cancel-btn" onclick={() => showConfirmation = false}>Cancel</button>
				<button class="confirm-btn" onclick={() => formElement?.requestSubmit()}>Confirm & Submit</button>
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
.tabs::-webkit-scrollbar { display: none; }
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
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* --- Form Structure --- */
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
.form-field label,
.form-group label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
}
input,
select,
textarea {
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

/* --- Fieldsets & Sub-sections --- */
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
.sub-legend {
  font-size: 1rem;
  font-weight: 500;
  margin: 1rem 0;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}
hr {
  border: none;
  border-top: 1px solid var(--border-color);
  margin: 1rem 0;
}
/* --- Additional Locks Section --- */
.additional-locks-section {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  margin-top: 1rem;
  width: 100%;
}

.additional-locks-section .group-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.additional-locks-section .add-btn {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
}

/* --- Lock Items --- */
.additional-lock-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  padding-bottom: 0.75rem;
  border-bottom: 1px dashed var(--border-color);
}

.additional-lock-item:last-of-type {
  border-bottom: none;
  padding-bottom: 0;
}

/* --- Lock Rows --- */
.additional-lock-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 0.75rem;
  width: 100%;
  align-items: center;
}

.additional-lock-row.resolution {
  grid-template-columns: 1fr auto;
}

.additional-lock-row .remove-btn {
  height: 100%;
}

/* --- Notes --- */
.notes-field {
  margin-top: 1rem;
}

.notes-input {
  font-size: 0.9rem;
  min-height: 40px !important;
}


/* --- Buttons --- */
.remove-btn,
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
.remove-btn:hover,
.remove-version-btn:hover {
  background-color: color-mix(in srgb, #ef4444 10%, transparent);
  border-color: #ef4444;
}
.add-btn,
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
.add-btn:hover,
.add-version-btn:hover {
  border-color: var(--primary-color);
  background-color: color-mix(in srgb, var(--primary-color) 5%, transparent);
}
.add-button {
  background-color: var(--input-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  cursor: pointer;
}
.add-button:disabled { opacity: 0.5; cursor: not-allowed; }

/* --- Grouping & Custom Fields --- */
.current-group-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}
.group-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--surface-color);
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
}
.group-item button {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
}
.group-item button[disabled] {
  opacity: 0.3;
  cursor: not-allowed;
}
.search-input-wrapper { position: relative; }
.search-results {
  list-style: none;
  margin-top: 0.5rem;
  padding: 0;
  max-height: 200px;
  overflow-y: auto;
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}
.search-results li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
}
.field-wrapper { margin-bottom: 1.5rem; }
.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 1rem;
  align-items: center;
  margin-bottom: 0.5rem;
}

/* --- Links --- */
.links-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.link-entry {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.link-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* --- Tooltip --- */
.tooltip { position: relative; display: inline-flex; align-items: center; color: var(--text-secondary); margin-left: 0.25rem; }
.tooltip .tooltip-text { visibility: hidden; width: 250px; background-color: #333; color: #fff; text-align: left; border-radius: 6px; padding: 8px; position: absolute; z-index: 10; bottom: 125%; left: 50%; margin-left: -125px; opacity: 0; transition: opacity 0.3s; font-size: 0.8rem; line-height: 1.4; pointer-events: none; }
.tooltip:hover .tooltip-text { visibility: visible; opacity: 1; }
.tooltip-text strong { color: #eee; }

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
  background-color: color-mix(in srgb, var(--surface-color) 90%, transparent);
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
.submit-button:disabled { opacity: 0.7; cursor: not-allowed; }
.error-message { color: #ef4444; font-weight: 500; }

/* --- Modal --- */
.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.7);
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
  .perf-grid { grid-template-columns: 1fr 1fr; }
}
.perf-item p { margin: 0; }
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
.success-message h2 { margin: 0 0 0.5rem; }
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
