<script>
	import { page } from '$app/stores'
</script>

<div class="error-container">
	<h1>{$page.status}: {$page.error?.message}</h1>
	<p>We couldn't find the page you were looking for.</p>
	<a href="/" class="back-button">Go Home</a>
</div>

<style>
	.error-container {
		text-align: center;
		padding: 4rem 1rem;
	}
	.error-container h1 {
		font-size: 2.5rem;
		color: var(--primary-color);
		margin-bottom: 1rem;
	}
	.error-container p {
		font-size: 1.2rem;
		margin-bottom: 2rem;
	}
	.back-button {
        display: inline-block;
        padding: 12px 24px;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
		background-color: var(--surface-color);
    }
    .back-button:hover {
		text-decoration: none;
        border-color: var(--primary-color);
    }
</style>
