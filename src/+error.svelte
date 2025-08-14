<script>
	import { page } from '$app/state'
</script>

<div class="error-container">
	<div class="error-card">
		<h1>{page.status}</h1>
		<p class="message">{page.error?.message || 'Something went wrong'}</p>
		<p class="description">We couldn't find the page you were looking for. Let's get you back on track.</p>
		<a href="/" class="back-button">Go Home</a>
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

	.description {
		color: var(--text-secondary);
		margin: 0 0 2rem;
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
</style>