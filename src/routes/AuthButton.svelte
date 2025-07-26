<script>
	export let session;
</script>

{#if session?.user}
	<div class="user-profile">
		<a href={`/profile/${session.user.login}`} class="profile-link">
			{#if session.user.image}
				<img src={session.user.image} alt={session.user.name} class="avatar" />
			{/if}
			<span class="user-name">{session.user.name}</span>
		</a>

		<form action="/auth/signout" method="post">
			<button type="submit" class="signout-button">Sign Out</button>
		</form>
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
		gap: 0.75rem;
		text-decoration: none;
		padding: 4px;
		border-radius: 999px;
		transition: background-color 0.2s ease;
	}
	.profile-link:hover {
		background-color: var(--input-bg);
	}

	.avatar {
		width: 32px;
		height: 32px;
		border-radius: 999px;
		border: 2px solid var(--border-color);
	}
	.user-name {
		font-weight: 500;
		color: var(--text-primary);
	}
	.signout-button, .signin-button {
		background: none;
		border: 1px solid var(--border-color);
		color: var(--text-secondary);
		padding: 8px 16px;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
		transition: all 0.2s ease;
	}
	.signout-button:hover, .signin-button:hover {
		border-color: var(--primary-color);
		color: var(--primary-color);
	}
</style>