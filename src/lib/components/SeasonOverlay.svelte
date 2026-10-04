<script>
	import { onMount } from 'svelte'
	import { page } from '$app/state'
	import { preferences, isReducedMotion } from '$lib/stores/preferences'
	import { activeScenes } from '$lib/seasons'
	import { isBot } from '$lib/utils/bot'

	/**
	 * A quiet layer of seasonal particles behind the page: embers and the odd bat
	 * in October, falling leaves in November, snow in December. A plain 2D canvas
	 * (no WebGL), a few dozen particles at most, about 30 frames a second, and
	 * nothing at all for crawlers, when animation is reduced, or while the tab is
	 * hidden
	 *
	 * A scene is put up gradually (see $lib/seasons): in its first days only a few
	 * pieces are there, one more is added every so often as it fills, and the
	 * larger or rarer ones (the bats, the sparkles, the big flakes) only appear
	 * partway through. When a scene is coming down, the pieces drain away
	 */

	/** @type {HTMLCanvasElement | undefined} */
	let canvas = $state()
	let mounted = $state(false)
	// Re-read now and then, so a tab left open through midnight keeps building
	let now = $state(new Date())

	onMount(() => {
		mounted = true
		const timer = setInterval(() => { now = new Date() }, 10 * 60 * 1000)
		return () => clearInterval(timer)
	})

	let scenes = $derived(mounted ? activeScenes($preferences.seasonal, page.url.searchParams, now) : [])
	let reduced = $derived(mounted && isReducedMotion($preferences))
	let visible = $derived(scenes.length > 0 && !reduced)

	// The drawing loop reads the current scenes from here, so a change in how full
	// a scene is does not restart it (which would make every piece vanish at once)
	const holder = { scenes: /** @type {import('$lib/seasons').Scene[]} */ ([]) }
	$effect(() => { holder.scenes = scenes })

	$effect(() => {
		if (!canvas || !visible || isBot()) return
		return run(canvas, () => holder.scenes)
	})

	/**
	 * @typedef {Object} Particle
	 * @property {number} x
	 * @property {number} y
	 * @property {number} vy
	 * @property {number} size
	 * @property {number} phase
	 * @property {number} rot
	 * @property {number} spin
	 * @property {number} tone
	 * @property {boolean} leaving - on its way out for good: not replaced when it goes
	 *
	 * @typedef {Object} System
	 * @property {Particle[]} particles
	 * @property {{ x: number, y: number, speed: number, scale: number }[]} bats
	 * @property {{ x: number, y: number, phase: number, size: number, leaving: boolean }[]} sparkles
	 * @property {number} nextBat
	 * @property {number} addIn
	 */

	const LEAVES = ['#d9822b', '#b5452b', '#e2b04a', '#8a5a2b', '#c4672a']

	const rand = (/** @type {number} */ a, /** @type {number} */ b) => a + Math.random() * (b - a)

	/**
	 * @param {HTMLCanvasElement} el
	 * @param {() => import('$lib/seasons').Scene[]} getScenes
	 * @returns {() => void} stops it
	 */
	function run (el, getScenes) {
		const ctx = /** @type {CanvasRenderingContext2D} */ (el.getContext('2d'))
		let w = 0
		let h = 0
		// Local to this loop, never reactive state
		/** @type {Map<string, System>} */
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const systems = new Map()
		let raf = 0
		let last = performance.now()
		let clock = 0

		function resize () {
			w = window.innerWidth
			h = window.innerHeight
			const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
			el.width = Math.round(w * dpr)
			el.height = Math.round(h * dpr)
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
		}

		/** How many particles a complete scene has: fewer on a phone, it is a garnish */
		const fullCount = () => Math.max(22, Math.min(w < 600 ? 34 : 64, Math.round((w * h) / 20000)))

		/**
		 * How many there should be at a given fullness. Fewer than proportional at
		 * first, so the first days are a handful
		 * @param {number} intensity
		 */
		const targetCount = (intensity) => intensity <= 0.02 ? 0 : Math.max(3, Math.round(fullCount() * Math.pow(intensity, 1.4)))

		/**
		 * @param {string} name
		 * @param {number} intensity
		 * @param {boolean} entering come in from the edge, rather than appearing mid-screen
		 * @returns {Particle}
		 */
		function spawn (name, intensity, entering) {
			const p = {
				x: rand(0, w),
				y: entering ? (name === 'halloween' ? h + 10 : -12) : rand(0, h),
				vy: 0,
				size: 1,
				phase: rand(0, 6.28),
				rot: rand(0, 6.28),
				spin: rand(-1.2, 1.2),
				tone: Math.floor(rand(0, LEAVES.length)),
				leaving: false
			}
			if (name === 'halloween') {
				p.vy = -rand(10, 26)
				p.size = rand(1.2, 3)
			} else if (name === 'autumn') {
				p.vy = rand(26, 58)
				// The big leaves come later in the build-up
				p.size = intensity >= 0.5 && Math.random() < 0.3 ? rand(12, 16) : rand(6, 11)
			} else {
				p.vy = rand(16, 44)
				p.size = intensity >= 0.7 && Math.random() < 0.25 ? rand(3.4, 4.6) : rand(1.1, 3.2)
			}
			return p
		}

		function drawEmber (/** @type {Particle} */ p, /** @type {number} */ t) {
			const flicker = 0.35 + 0.25 * Math.sin(t * 3 + p.phase)
			const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4)
			g.addColorStop(0, `rgba(255, 170, 70, ${flicker})`)
			g.addColorStop(1, 'rgba(255, 120, 30, 0)')
			ctx.fillStyle = g
			ctx.beginPath()
			ctx.arc(p.x, p.y, p.size * 4, 0, 6.283)
			ctx.fill()
		}

		function drawLeaf (/** @type {Particle} */ p) {
			ctx.save()
			ctx.translate(p.x, p.y)
			ctx.rotate(p.rot)
			ctx.fillStyle = LEAVES[p.tone]
			ctx.globalAlpha = 0.78
			const s = p.size
			ctx.beginPath()
			ctx.moveTo(0, -s)
			ctx.quadraticCurveTo(s * 0.85, -s * 0.2, 0, s)
			ctx.quadraticCurveTo(-s * 0.85, -s * 0.2, 0, -s)
			ctx.fill()
			ctx.strokeStyle = 'rgba(0,0,0,0.25)'
			ctx.lineWidth = 0.6
			ctx.beginPath()
			ctx.moveTo(0, -s * 0.8)
			ctx.lineTo(0, s * 0.9)
			ctx.stroke()
			ctx.restore()
		}

		function drawSnow (/** @type {Particle} */ p) {
			// A faint cool halo under the white, so a flake still shows on a light page
			const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.6)
			halo.addColorStop(0, 'rgba(120, 150, 195, 0.22)')
			halo.addColorStop(1, 'rgba(120, 150, 195, 0)')
			ctx.fillStyle = halo
			ctx.beginPath()
			ctx.arc(p.x, p.y, p.size * 2.6, 0, 6.283)
			ctx.fill()

			const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 1.5)
			g.addColorStop(0, 'rgba(255,255,255,0.95)')
			g.addColorStop(1, 'rgba(255,255,255,0)')
			ctx.fillStyle = g
			ctx.beginPath()
			ctx.arc(p.x, p.y, p.size * 1.5, 0, 6.283)
			ctx.fill()
		}

		function drawBat (/** @type {{ x: number, y: number, scale: number }} */ b, /** @type {number} */ t) {
			// Two curved wings that beat
			const flap = Math.sin(t * 12) * 0.55
			ctx.save()
			ctx.translate(b.x, b.y)
			ctx.scale(b.scale, b.scale)
			ctx.fillStyle = 'rgba(40, 24, 58, 0.55)'
			for (const side of [-1, 1]) {
				ctx.beginPath()
				ctx.moveTo(0, 0)
				ctx.quadraticCurveTo(side * 9, -9 - flap * 8, side * 20, -2 + flap * 6)
				ctx.quadraticCurveTo(side * 14, 1, side * 11, 4)
				ctx.quadraticCurveTo(side * 6, 1, 0, 5)
				ctx.fill()
			}
			ctx.beginPath()
			ctx.ellipse(0, 1, 2.6, 4, 0, 0, 6.283)
			ctx.fill()
			ctx.restore()
		}

		/** A small four-pointed star that twinkles, like a light on a string */
		function drawSparkle (/** @type {{ x: number, y: number, phase: number, size: number }} */ s, /** @type {number} */ t) {
			const a = 0.25 + 0.55 * Math.max(0, Math.sin(t * 1.6 + s.phase))
			ctx.save()
			ctx.translate(s.x, s.y)
			ctx.fillStyle = `rgba(255, 236, 170, ${a})`
			const r = s.size
			ctx.beginPath()
			ctx.moveTo(0, -r)
			ctx.quadraticCurveTo(0, 0, r, 0)
			ctx.quadraticCurveTo(0, 0, 0, r)
			ctx.quadraticCurveTo(0, 0, -r, 0)
			ctx.quadraticCurveTo(0, 0, 0, -r)
			ctx.fill()
			ctx.restore()
		}

		function frame (/** @type {number} */ time) {
			raf = requestAnimationFrame(frame)
			// About thirty frames a second is plenty for something this slow
			if (time - last < 32) return
			const dt = Math.min(0.06, (time - last) / 1000)
			last = time
			clock += dt
			ctx.clearRect(0, 0, w, h)

			const current = getScenes()
			const up = new Set(current.map(s => s.season.name))

			// A scene that has come down drains out; when nothing is left it goes
			for (const [name, sys] of systems) {
				if (!up.has(/** @type {any} */ (name))) {
					sys.particles.forEach(p => { p.leaving = true })
					sys.sparkles.forEach(s => { s.leaving = true })
					if (sys.particles.length === 0 && sys.bats.length === 0 && sys.sparkles.length === 0) systems.delete(name)
				}
			}

			for (const { season, intensity } of current) {
				const name = season.name
				let sys = systems.get(name)
				if (!sys) {
					sys = { particles: [], bats: [], sparkles: [], nextBat: 4, addIn: 0 }
					systems.set(name, sys)
				}
				const target = targetCount(intensity)
				const live = sys.particles.filter(p => !p.leaving).length

				// Putting it up: one more piece every so often, from the edge it comes in at
				sys.addIn -= dt
				if (live < target && sys.addIn <= 0) {
					sys.particles.push(spawn(name, intensity, true))
					sys.addIn = rand(0.25, 0.7)
				} else if (live > target) {
					// Taking it down: the oldest pieces are not replaced when they leave
					const stay = sys.particles.find(p => !p.leaving)
					if (stay) stay.leaving = true
				}

				if (name === 'winter') {
					// The lights come later in the build-up
					const wanted = intensity >= 0.5 ? Math.round(((intensity - 0.4) / 0.6) * (w < 600 ? 7 : 14)) : 0
					const liveSparkles = sys.sparkles.filter(s => !s.leaving).length
					if (liveSparkles < wanted && Math.random() < 0.02) {
						sys.sparkles.push({ x: rand(0, w), y: rand(h * 0.04, h * 0.55), phase: rand(0, 6.28), size: rand(3.5, 6.5), leaving: false })
					}
				}
			}

			for (const [name, sys] of systems) {
				const intensity = current.find(s => s.season.name === name)?.intensity ?? 0
				sys.particles = sys.particles.filter(p => {
					p.phase += dt
					if (name === 'halloween') {
						p.x += Math.sin(p.phase * 0.9) * 8 * dt
						p.y += p.vy * dt
						if (p.y < -10) {
							if (p.leaving) return false
							Object.assign(p, spawn(name, intensity, true))
						}
						drawEmber(p, clock)
					} else if (name === 'autumn') {
						// A gust now and then, once the scene is fuller
						const gust = intensity >= 0.7 ? Math.max(0, Math.sin(clock * 0.35)) * 26 : 0
						p.x += (Math.sin(p.phase * 0.8) * 24 + 6 + gust) * dt
						p.y += p.vy * dt
						p.rot += p.spin * dt
						if (p.y > h + 16) {
							if (p.leaving) return false
							Object.assign(p, spawn(name, intensity, true))
						}
						drawLeaf(p)
					} else {
						p.x += Math.sin(p.phase * 0.6) * 12 * dt + 3 * dt
						p.y += p.vy * dt
						if (p.y > h + 8) {
							if (p.leaving) return false
							Object.assign(p, spawn(name, intensity, true))
						}
						drawSnow(p)
					}
					if (p.x > w + 14) p.x = -10
					if (p.x < -14) p.x = w + 10
					return true
				})

				if (name === 'halloween' && intensity >= 0.35) {
					// The bats come once the scene is a third up
					sys.nextBat -= dt
					if (sys.nextBat <= 0 && sys.bats.length < (intensity >= 0.8 ? 2 : 1)) {
						sys.bats.push({ x: -30, y: rand(h * 0.08, h * 0.3), speed: rand(60, 100), scale: rand(0.8, 1.3) })
						sys.nextBat = rand(11, 20)
					}
				}
				sys.bats = sys.bats.filter(b => b.x < w + 40)
				for (const b of sys.bats) {
					b.x += b.speed * dt
					b.y += Math.sin(clock * 1.6 + b.x * 0.02) * 14 * dt
					drawBat(b, clock)
				}

				sys.sparkles = sys.sparkles.filter(s => {
					if (s.leaving && Math.random() < 0.01) return false
					drawSparkle(s, clock)
					return true
				})
			}
		}

		const onVisibility = () => {
			cancelAnimationFrame(raf)
			if (!document.hidden) {
				last = performance.now()
				raf = requestAnimationFrame(frame)
			}
		}

		resize()
		raf = requestAnimationFrame(frame)
		window.addEventListener('resize', resize)
		document.addEventListener('visibilitychange', onVisibility)

		return () => {
			cancelAnimationFrame(raf)
			window.removeEventListener('resize', resize)
			document.removeEventListener('visibilitychange', onVisibility)
			ctx.clearRect(0, 0, w, h)
		}
	}
</script>

{#if visible}
	<canvas bind:this={canvas} class="season" aria-hidden="true"></canvas>
{/if}

<style>
	.season {
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100vh;
		/* In the background: above the theme's backdrop (0, earlier in the page), below
		   the whole app shell (1) and so below every card, heading and cartridge */
		z-index: 0;
		pointer-events: none;
	}
</style>
