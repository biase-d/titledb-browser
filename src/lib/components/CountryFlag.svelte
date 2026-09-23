<script>
	import Icon from '@iconify/svelte'
	import { getFlagIcon, isSquareFlagIcon } from '$lib/flags'
	// Side-effect import: registers the bundled flags so they render without
	// a round trip to api.iconify.design
	import '$lib/flag-icons'

	/**
	 * @typedef {Object} Props
	 * @property {string} code - ISO 3166-1 alpha-2 country code
	 * @property {number} [size] - Rendered width/height in px
	 */

	/** @type {Props} */
	let { code, size = 24 } = $props()

	let icon = $derived(getFlagIcon(code))
	let isSquare = $derived(isSquareFlagIcon(code))
</script>

<span
	class="flag"
	class:square={isSquare}
	style="--flag-size: {size}px"
>
	<Icon {icon} width={size} height={size} />
</span>

<style>
	.flag {
		display: inline-flex;
		flex: 0 0 auto;
		width: var(--flag-size);
		height: var(--flag-size);
	}

	/* Icons taken from the square 'flag' set need clipping to match circle-flags */
	.flag.square {
		border-radius: 50%;
		overflow: hidden;
	}
</style>
