<script>
	// The Switch 2 listing is the home page's own design over the Switch 2 titles: the
	// page reads which console it is for from its data (see +page.server.js here)
	import Listing from '../+page.svelte'

	let { data } = $props()
</script>

<Listing {data} />
