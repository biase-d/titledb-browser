<script>
	import { page } from '$app/state'
	import { onMount } from 'svelte'

	let healthPromise = $state(new Promise(() => {}))

	onMount(() => {
		healthPromise = fetch('/api/v1/status').then((r) => r.json())
	})
</script>

<div class="error-container">
	<div class="error-card">
		<h1>{page.status}</h1>
		<p class="message">{page.error?.message || 'Something went wrong'}</p>

		<div class="status-summary">
			{#await healthPromise}
				<div class="status-loading">Checking system status...</div>
			{:then health}
				{@const dbDown = health.services.database.status === 'down'}
				<div class="status-item" class:is-down={dbDown}>
					<span class="dot"></span>
					<span class="label">
						{dbDown
							? 'Database is currently offline'
							: 'Systems are operational'}
					</span>
				</div>
			{:catch}
				<div class="status-item is-down">
					<span class="dot"></span>
					<span class="label">Could not reach status service</span>
				</div>
			{/await}
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
</style>
