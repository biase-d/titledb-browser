<script>
	import { createEventDispatcher } from 'svelte'

	const dispatch = createEventDispatcher()

	// Component props
	export let availablePublishers = []
	export let years = []
	export let selectedPublisher = ''
	export let selectedMinYear = ''
	export let selectedMaxYear = ''
	export let minSizeMB = ''
	export let maxSizeMB = ''

	function resetFilters () {
	  selectedPublisher = ''
	  selectedMinYear = ''
	  selectedMaxYear = ''
	  minSizeMB = ''
	  maxSizeMB = ''
	}

	function handleNumberInput (field, increment) {
	  const currentValue = field === 'min' ? minSizeMB : maxSizeMB
	  let numericValue = currentValue === '' ? 0 : parseInt(currentValue, 10)

	  if (increment) {
	    numericValue++
	  } else {
	    if (numericValue > 0) numericValue--
	  }

	  if (field === 'min') {
	    minSizeMB = numericValue
	  } else {
	    maxSizeMB = numericValue
	  }
	}
</script>

<div class="filter-container">
	<div class="filter-grid">
		<!-- Publisher Filter -->
		<div class="group">
			<label for="publisher">Publisher</label>
			<div class="input-wrapper">
				<select class="custom-select" id="publisher" bind:value={selectedPublisher}>
					<option value="">All Publishers</option>
					{#each availablePublishers as publisher}
						<option value={publisher}>{publisher}</option>
					{/each}
				</select>
			</div>
		</div>

		<!-- Release Year Range Filter -->
		<div class="group">
			<label for="release-year-from">Release Year</label>
			<div class="range-inputs">
				<div class="input-wrapper">
					<select class="custom-select" id="release-year-from" bind:value={selectedMinYear}>
						<option value="">From</option>
						{#each years as year}<option value={year}>{year}</option>{/each}
					</select>
				</div>
				<div class="input-wrapper">
					<select class="custom-select" id="release-year-to" bind:value={selectedMaxYear}>
						<option value="">To</option>
						{#each years as year}<option value={year}>{year}</option>{/each}
					</select>
				</div>
			</div>
		</div>

		<!-- File Size Range Filter (Full Span) -->
		<div class="group full-span">
			<label for="file-size-min">File Size (MB)</label>
			<div class="range-inputs">
				<div class="custom-number-input">
					<input id="file-size-min" type="number" placeholder="Min" bind:value={minSizeMB} />
					<div class="arrows">
						<span class="material-icons arrow" on:click={() => handleNumberInput('min', true)}>arrow_drop_up</span>
						<span class="material-icons arrow" on:click={() => handleNumberInput('min', false)}>arrow_drop_down</span>
					</div>
				</div>
				<div class="custom-number-input">
					<input id="file-size-max" type="number" placeholder="Max" bind:value={maxSizeMB} />
					<div class="arrows">
						<span class="material-icons arrow" on:click={() => handleNumberInput('max', true)}>arrow_drop_up</span>
						<span class="material-icons arrow" on:click={() => handleNumberInput('max', false)}>arrow_drop_down</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	<hr class="divider"/>

	<div class="footer">
		<button on:click={resetFilters} class="reset-button">Reset All</button>
		<button on:click={() => dispatch('close')} class="done-button">Done</button>
	</div>
</div>

<style>
	/* --- Main Structure --- */
	.filter-container {
		display: flex;
		flex-direction: column;
	}
	.filter-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
	}
	@media (max-width: 600px) {
		.filter-grid {
			grid-template-columns: 1fr;
			gap: 1.25rem;
		}
	}
	.group {
		display: flex;
		flex-direction: column;
	}
	/* This is the key fix: it makes the file size group span both columns */
	.group.full-span {
		grid-column: 1 / -1;
	}
	.group label {
		display: block;
		font-size: 0.875rem; /* 14px */
		font-weight: 500;
		color: var(--text-secondary);
		margin-bottom: 0.5rem;
	}
	.range-inputs {
		display: flex;
		gap: 1rem;
	}
	.input-wrapper, .custom-number-input {
		position: relative;
		width: 100%;
	}

	/* --- Input & Select Styling --- */
	select, input[type="number"] {
		width: 100%;
		background-color: var(--input-bg);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		border-radius: 0.5rem; /* 8px */
		padding: 0.75rem 1rem; /* 12px 16px */
		font-size: 1rem;
		outline: none;
		transition: box-shadow 0.2s ease;
		box-sizing: border-box; /* Ensures padding is included in width */
	}
	select:focus, input[type="number"]:focus {
		box-shadow: 0 0 0 2px var(--primary-color);
	}

	/* --- Custom Select Arrow --- */
	.custom-select {
		-webkit-appearance: none;
		-moz-appearance: none;
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%2364748b' viewBox='0 0 16 16'%3E%3Cpath fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.75rem center;
		background-size: 1em 1em;
		padding-right: 2.5rem; /* Make space for arrow */
	}

	/* --- Custom Number Input --- */
	.custom-number-input input::-webkit-outer-spin-button,
	.custom-number-input input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	.custom-number-input input[type=number] {
		-moz-appearance: textfield;
	}
	.custom-number-input .arrows {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		flex-direction: column;
		opacity: 0.5;
	}
	.custom-number-input:hover .arrows {
		opacity: 1;
	}
	.custom-number-input .arrows .arrow {
		cursor: pointer;
		font-size: 1rem; /* 16px */
		line-height: 0.5;
		color: var(--text-secondary);
	}

	/* --- Footer --- */
	.divider {
		border: none;
		border-top: 1px solid var(--border-color);
		margin: 1.5rem 0;
	}
	.footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.reset-button {
		background: none;
		border: none;
		color: var(--primary-color);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
	}
	.reset-button:hover {
		color: var(--link-hover-color);
	}
	.done-button {
		background-color: var(--primary-color);
		color: var(--primary-action-text);
		border: none;
		padding: 0.5rem 1.5rem; /* 8px 24px */
		border-radius: 0.5rem;
		font-weight: 500;
		cursor: pointer;
	}
</style>
