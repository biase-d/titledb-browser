<script>
	/**
	 * Marks a Switch 2 title where Switch ones are listed with it, as in search
	 * results that cover both consoles. On the Switch 2 listing everything is
	 * one, so it says nothing there
	 */
	import { page } from '$app/state'
	import { isSwitch2Id } from '$lib/platform'

	/** @type {{ id: string }} */
	let { id } = $props()
</script>

{#if isSwitch2Id(id) && page.url.pathname !== '/switch-2'}
	<span class="s2-pill" title="Nintendo Switch 2 title">Switch 2</span>
{/if}

<style>
	.s2-pill {
		display: inline-flex;
		align-items: center;
		flex-shrink: 0;
		padding: 0.1rem 0.4rem;
		border-radius: 999px;
		background: #dc2626;
		color: #fff;
		font-size: 0.625rem;
		font-weight: 800;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		line-height: 1.3;
	}
</style>
