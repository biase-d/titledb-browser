<script>
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import { fade } from 'svelte/transition';

	let { 
		stats, 
		heroImage, 
		searchValue = $bindable(), 
		onSearch, 
		onFilter 
	} = $props();

	const fixedPills = [
        { label: '30 FPS', type: 'fps', value: '30', icon: 'mdi:speedometer-slow' },
		{ label: '60 FPS', type: 'fps', value: '60', icon: 'line-md:speedometer-loop' }
	];

	const pillPool = [
		{ label: 'Zelda', type: 'q', value: 'Zelda', icon: 'mdi:triforce' },
		{ label: 'Mario', type: 'q', value: 'Mario', icon: 'mdi:mushroom' },
		{ label: 'Pokémon', type: 'q', value: 'Pokemon', icon: 'mdi:pokeball' },
		{ label: 'Xenoblade', type: 'q', value: 'Xenoblade', icon: 'mdi:sword' },
		//{ label: 'Square Enix', type: 'q', value: 'Square Enix', icon: 'mdi:gamepad-square' },
		//{ label: 'Capcom', type: 'q', value: 'Capcom', icon: 'mdi:alpha-c-box' },
		{ label: 'Metroid', type: 'q', value: 'Metroid', icon: 'mdi:alien' },
		{ label: 'Roguelike', type: 'q', value: 'Roguelike', icon: 'mdi:skull' }
	];

	let activePills = $state([...fixedPills]);

	onMount(() => {
		const shuffled = [...pillPool].sort(() => 0.5 - Math.random());
		const selected = shuffled.slice(0, 3);
		activePills = [...fixedPills, ...selected];
	});

	function handlePillClick(filter) {
		onFilter(filter);
	}

	function handleClear() {
		searchValue = '';
		onSearch();
	}
</script>

<div class="hero-section">
	{#if heroImage}
		<div class="hero-bg" in:fade={{ duration: 500 }}>
			<img src={heroImage.src} srcset={heroImage.srcset} alt="" />
			<div class="hero-overlay"></div>
		</div>
	{/if}
	
	<div class="hero-content">
		<h1>Switch Performance</h1>
		<p>
			The community database for Nintendo Switch performance profiles.
			<br>
			{#if stats?.totalGames}
				<span class="stats-badge" in:fade>
					Tracking <strong>{stats.totalGames.toLocaleString()}</strong> games
				</span>
			{/if}
		</p>

		<div class="search-container">
			<div class="search-input-wrapper">
				<Icon icon="mdi:magnify" class="search-icon" />
				<input 
					bind:value={searchValue} 
					oninput={onSearch} 
					type="text" 
					placeholder="Search games, title IDs, or publishers..." 
					class="search-input"
				/>
				{#if searchValue}
					<button class="clear-button" onclick={handleClear} title="Clear search">
						<Icon icon="mdi:close"/>
					</button>
				{/if}
			</div>
			
			<div class="quick-filters">
				{#each activePills as filter}
					<button class="filter-chip" onclick={() => handlePillClick(filter)}>
						<Icon icon={filter.icon} /> {filter.label}
					</button>
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	.hero-section {
		position: relative;
		text-align: center;
		padding: 4rem 1.5rem;
		border-radius: var(--radius-lg);
		overflow: hidden;
		color: white;
		margin-bottom: 1rem;
		box-shadow: var(--shadow-lg);
		background-color: var(--surface-color);
		min-height: 400px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.hero-bg {
		position: absolute;
		inset: 0;
		z-index: 0;
	}

	.hero-bg img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: blur(20px) saturate(1.5);
		transform: scale(1.1);
	}

	.hero-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.85));
	}

	.hero-content {
		position: relative;
		z-index: 1;
		max-width: 700px;
		width: 100%;
		margin: 0 auto;
	}

	h1 {
		font-size: 3rem;
		font-weight: 800;
		margin: 0 0 1rem;
		letter-spacing: -0.02em;
		text-shadow: 0 2px 10px rgba(0,0,0,0.5);
	}

	p {
		font-size: 1.2rem;
		color: rgba(255, 255, 255, 0.9);
		margin: 0 auto 2.5rem;
		line-height: 1.6;
	}

	.stats-badge {
		display: inline-block;
		margin-top: 0.5rem;
		font-size: 0.9rem;
		background: rgba(255, 255, 255, 0.15);
		padding: 4px 12px;
		border-radius: 999px;
		backdrop-filter: blur(4px);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.search-container {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.search-input-wrapper {
		position: relative;
		width: 100%;
	}
	
	.search-input-wrapper :global(svg.search-icon) {
		position: absolute;
		left: 16px;
		top: 50%;
		transform: translateY(-50%);
		color: #666;
		pointer-events: none;
		font-size: 1.5rem;
	}

	.search-input {
		width: 100%;
		padding: 16px 16px 16px 52px;
		font-size: 1.1rem;
		border: none;
		border-radius: 999px;
		background-color: white;
		color: #1f2328;
		box-shadow: 0 4px 20px rgba(0,0,0,0.3);
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.search-input:focus {
		outline: none;
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(0,0,0,0.4);
	}

	.clear-button {
		position: absolute;
		top: 50%;
		right: 12px;
		transform: translateY(-50%);
		padding: 8px;
		border: none;
		background: transparent;
		color: #666;
		cursor: pointer;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.clear-button:hover { background-color: rgba(0,0,0,0.05); }

	.quick-filters {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.filter-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 8px 16px;
		font-size: 0.9rem;
		font-weight: 500;
		background-color: rgba(255, 255, 255, 0.15);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 999px;
		cursor: pointer;
		transition: all 0.2s;
		backdrop-filter: blur(4px);
	}

	.filter-chip:hover {
		background-color: rgba(255, 255, 255, 0.3);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0,0,0,0.2);
	}
</style>