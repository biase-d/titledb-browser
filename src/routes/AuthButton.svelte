<script>
	export let session
</script>

{#if session?.user}
	<div class="user-profile">
		<a href={`/profile/${session.user.login}`} class="profile-link">
			<span class="user-name">{session.user.name}</span>
		</a>
	</div>
{:else}
	<form action="/auth/signin/github" method="post">
		<button type="submit" class="signin-button">Sign In with GitHub</button>
	</form>
{/if}

<style>
	.user-profile {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.profile-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm);
		transition: background-color 0.2s ease;
	}

	.profile-link:hover {
		background-color: var(--input-bg);
		text-decoration: none;
	}

	.user-name {
		font-weight: 500;
		color: var(--text-primary);
	}

	.signin-button {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text-secondary);
		background-color: transparent;
		border: 1px solid var(--border-color);
		padding: 0.4rem 0.8rem;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.signin-button:hover {
		border-color: var(--primary-color);
		color: var(--primary-color);
		background-color: color-mix(in srgb, var(--primary-color) 10%, transparent);
	}
</style>