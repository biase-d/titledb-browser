<script>
	import Coin from '$lib/components/Coin.svelte'

	/**
	 * The people behind the data: the most active contributors, each with their
	 * GitHub picture and highest badge, linking to their profile
	 *
	 * @type {{ people: Array<{ name: string, contributions: number, badge: any }> }}
	 */
	let { people } = $props()

	let failed = $state(/** @type {Record<string, boolean>} */ ({}))
</script>

{#if people?.length}
	<section class="wall" aria-labelledby="wall-title">
		<h2 id="wall-title">The people behind the data</h2>
		<ul>
			{#each people as person, i (person.name)}
				<li style="--i: {i}">
					<a href="/profile/{encodeURIComponent(person.name)}">
						<span class="pic">
							{#if !failed[person.name]}
								<img src="https://github.com/{encodeURIComponent(person.name)}.png?size=96" alt="" loading="lazy" width="56" height="56" onerror={() => (failed[person.name] = true)} />
							{:else}
								<span class="initial">{person.name[0]?.toUpperCase()}</span>
							{/if}
							{#if person.badge}<span class="coin"><Coin badge={person.badge} size="1.4rem" /></span>{/if}
						</span>
						<strong>{person.name}</strong>
						<small>{person.contributions} contribution{person.contributions === 1 ? '' : 's'}</small>
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	.wall { margin-bottom: 2.5rem; }
	h2 { font-size: 1.3rem; font-weight: 800; margin-bottom: 1rem; }
	ul { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr)); gap: 0.75rem; }
	a { display: flex; flex-direction: column; align-items: center; gap: 0.15rem; padding: 1rem 0.5rem; text-align: center; text-decoration: none; color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 16px; background: var(--surface-color); transition: transform 0.25s, border-color 0.25s; }
	a:hover { transform: translateY(-3px); border-color: var(--primary-color); }
	.pic { position: relative; width: 3.5rem; height: 3.5rem; margin-bottom: 0.4rem; }
	img, .initial { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: grid; place-items: center; background: var(--input-bg); font-weight: 800; }
	.coin { position: absolute; right: -0.45rem; bottom: -0.3rem; }
	strong { font-size: 0.9rem; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	small { font-size: 0.75rem; color: var(--text-secondary); }
	@media (prefers-reduced-motion: no-preference) { li { animation: rise 0.5s calc(var(--i) * 60ms) backwards; } }
	@keyframes rise { from { opacity: 0; transform: translateY(10px); } }
</style>
