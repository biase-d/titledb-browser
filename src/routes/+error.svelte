<script>
	import { page } from '$app/state'
	import { browser } from '$app/environment'
	import { getSystemStatus } from '$lib/remote/status.remote.js'

	// Browser-only: an error page should never depend on a server round trip
	// that might be failing for the same reason we are here
	const status = browser ? getSystemStatus() : null

	// SvelteKit replaces the text of an unexpected server error with
	// 'Internal Error' before it reaches the browser. That is a label for us,
	// not an explanation for the reader. Messages we raised deliberately -
	// 'Game not found' and the like - are worth showing as they are
	let message = $derived.by(() => {
		if (page.status === 404) {
			return 'We could not find that page. It may have moved or never existed.'
		}

		const raw = page.error?.message
		if (!raw || raw === 'Internal Error' || raw === 'Not Found') {
			return 'Something went wrong on our end. Nothing is wrong with your device.'
		}

		return raw
	})
</script>

<div class="error-container">
	<div class="error-card">
		<h1>{page.status}</h1>
		<p class="message">{message}</p>

		<div class="status-summary">
			{#if status?.error}
				<div class="status-item is-down">
					<span class="dot"></span>
					<span class="label"
						>We could not check whether the site is healthy right
						now.</span
					>
				</div>
			{:else if !status?.ready}
				<div class="status-loading">Checking system status...</div>
			{:else}
				{@const dbDown = !status.current.databaseHealthy}
				{@const isBuilding = status.current.isBuilding}

				{#if isBuilding}
					<div class="status-item is-building">
						<span class="dot"></span>
						<span class="label"
							>Game data is being updated. This page should work
							again in a few minutes.</span
						>
					</div>
					<p class="rebuild-hint">
						Nothing is wrong on your end - try again shortly.
					</p>
				{:else if dbDown}
					<div class="status-item is-down">
						<span class="dot"></span>
						<span class="label"
							>Game data is unavailable right now. We are looking
							into it.</span
						>
					</div>
				{:else}
					<div class="status-item">
						<span class="dot"></span>
						<span class="label"
							>Everything else is running normally.</span
						>
					</div>
				{/if}
			{/if}
		</div>

		<div class="actions">
			<a href="/" class="back-button">Go Home</a>
			<a href="/status" class="status-link">System Status</a>
		</div>
	</div>
</div>

<style>
	.error-container {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		padding: 2rem;
	}

	.error-card {
		max-width: 500px;
		width: 100%;
		text-align: center;
		background-color: var(--surface-color);
		padding: 3rem;
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-color);
	}

	h1 {
		font-size: 4rem;
		font-weight: 700;
		color: var(--primary-color);
		margin: 0 0 0.5rem;
	}

	.message {
		font-size: 1.25rem;
		font-weight: 500;
		color: var(--text-primary);
		margin: 0 0 1rem;
	}

	.back-button {
		display: inline-block;
		background-color: var(--primary-color);
		color: var(--primary-action-text);
		padding: 10px 20px;
		border-radius: var(--radius-md);
		font-weight: 600;
		text-decoration: none;
	}
	.back-button:hover {
		background-color: var(--primary-color-hover);
		text-decoration: none;
	}

	.status-summary {
		margin: 2rem 0;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.2);
		border-radius: var(--radius-md);
		font-size: 0.9rem;
	}

	.status-item {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		color: #10b981;
	}

	.status-item.is-down {
		color: #ef4444;
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: currentColor;
		box-shadow: 0 0 8px currentColor;
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.status-link {
		color: var(--text-secondary);
		text-decoration: underline;
		font-size: 0.9rem;
	}

	.status-item.is-building {
		color: #f59e0b;
	}

	.rebuild-hint {
		margin: 0.75rem 0 0;
		font-size: 0.8rem;
		color: var(--text-secondary);
		font-style: italic;
	}

	.status-loading {
		color: var(--text-secondary);
		font-size: 0.85rem;
	}
</style>
