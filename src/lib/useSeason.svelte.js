import { onMount } from 'svelte'
import { page } from '$app/state'
import { get } from 'svelte/store'
import { preferences, isReducedMotion } from '$lib/stores/preferences'
import { activeScenes } from '$lib/seasons'

/**
 * The season now, for a component that dresses itself for it: which one, how
 * far up it is (0 to 1, see $lib/seasons), and whether motion is reduced. The
 * same calendar, Settings switch and ?season= preview as the page's own scene.
 * Nothing until the browser has mounted, so a server render and a crawler see none
 *
 * Call it while a component is being set up
 */
export function useSeason () {
	let mounted = $state(false)
	let now = $state(new Date())
	let prefs = $state(get(preferences))

	onMount(() => {
		mounted = true
		const unsubscribe = preferences.subscribe(value => { prefs = value })
		const timer = setInterval(() => { now = new Date() }, 10 * 60 * 1000)
		return () => { unsubscribe(); clearInterval(timer) }
	})

	const scene = $derived(mounted ? activeScenes(prefs.seasonal, page.url.searchParams, now)[0] : undefined)

	return {
		get kind () { return scene?.season.name ?? null },
		get intensity () { return scene?.intensity ?? 0 },
		get reduced () { return mounted && isReducedMotion(prefs) }
	}
}
