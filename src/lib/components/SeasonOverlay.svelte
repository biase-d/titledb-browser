<script>
	import { onMount } from 'svelte'
	import { page } from '$app/state'
	import { preferences, isReducedMotion } from '$lib/stores/preferences'
	import { activeSeason } from '$lib/seasons'
	import { isBot } from '$lib/utils/bot'

	/**
	 * A quiet layer of seasonal particles over the page: embers and the odd bat
	 * in October, falling leaves in November, snow in December. A plain 2D canvas
	 * (no WebGL), a few dozen particles, about 30 frames a second, and nothing at
	 * all for crawlers, when animation is reduced, or when the tab is hidden
	 */

	/** @type {HTMLCanvasElement | undefined} */
	let canvas = $state()
	let mounted = $state(false)

	onMount(() => { mounted = true })

	let season = $derived(mounted ? activeSeason($preferences.seasonal, page.url.searchParams) : null)
	let reduced = $derived(mounted && isReducedMotion($preferences))

	$effect(() => {
		if (!canvas || !season || reduced || isBot()) return
		return run(canvas, season.name)
	})

	/**
	 * @typedef {Object} Particle
	 * @property {number} x
	 * @property {number} y
	 * @property {number} vx
	 * @property {number} vy
	 * @property {number} size
	 * @property {number} phase
	 * @property {number} rot
	 * @property {number} spin
	 * @property {number} tone
	 */

	const LEAVES = ['#d9822b', '#b5452b', '#e2b04a', '#8a5a2b', '#c4672a']

	/**
	 * @param {HTMLCanvasElement} el
	 * @param {'halloween' | 'autumn' | 'winter'} name
	 * @returns {() => void} stops it
	 */
	function run (el, name) {
		const ctx = /** @type {CanvasRenderingContext2D} */ (el.getContext('2d'))
		let w = 0
		let h = 0
		/** @type {Particle[]} */
		let particles = []
		/** @type {{ x: number, y: number, speed: number, scale: number }[]} */
		let bats = []
		let nextBat = 4
		let raf = 0
		let last = performance.now()
		let clock = 0

		const rand = (/** @type {number} */ a, /** @type {number} */ b) => a + Math.random() * (b - a)

		/** @param {boolean} anywhere start somewhere on screen rather than at the entry edge */
		function spawn (anywhere) {
			const p = {
				x: rand(0, w),
				y: anywhere ? rand(0, h) : (name === 'halloween' ? h + 10 : -12),
				vx: 0,
				vy: 0,
				size: 1,
				phase: rand(0, 6.28),
				rot: rand(0, 6.28),
				spin: rand(-1.2, 1.2),
				tone: Math.floor(rand(0, LEAVES.length))
			}
			if (name === 'halloween') {
				p.vy = -rand(10, 26)
				p.size = rand(1.2, 3)
			} else if (name === 'autumn') {
				p.vy = rand(26, 58)
				p.size = rand(6, 12)
			} else {
				p.vy = rand(16, 44)
				p.size = rand(1.1, 3.2)
			}
			return p
		}

		function resize () {
			w = window.innerWidth
			h = window.innerHeight
			const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
			el.width = Math.round(w * dpr)
			el.height = Math.round(h * dpr)
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
			// Fewer on a phone: it is a garnish, not the page
			const count = Math.max(22, Math.min(w < 600 ? 34 : 64, Math.round((w * h) / 20000)))
			particles = Array.from({ length: count }, () => spawn(true))
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

		function frame (/** @type {number} */ now) {
			raf = requestAnimationFrame(frame)
			// About thirty frames a second is plenty for something this slow
			if (now - last < 32) return
			const dt = Math.min(0.06, (now - last) / 1000)
			last = now
			clock += dt
			ctx.clearRect(0, 0, w, h)

			for (let i = 0; i < particles.length; i++) {
				const p = particles[i]
				p.phase += dt
				if (name === 'halloween') {
					p.x += Math.sin(p.phase * 0.9) * 8 * dt
					p.y += p.vy * dt
					if (p.y < -10) particles[i] = spawn(false)
					else drawEmber(p, clock)
				} else if (name === 'autumn') {
					p.x += Math.sin(p.phase * 0.8) * 24 * dt + 6 * dt
					p.y += p.vy * dt
					p.rot += p.spin * dt
					if (p.y > h + 14) particles[i] = spawn(false)
					else drawLeaf(p)
				} else {
					p.x += Math.sin(p.phase * 0.6) * 12 * dt + 3 * dt
					p.y += p.vy * dt
					if (p.y > h + 6) particles[i] = spawn(false)
					else drawSnow(p)
				}
				if (p.x > w + 14) p.x = -10
				if (p.x < -14) p.x = w + 10
			}

			if (name === 'halloween') {
				nextBat -= dt
				if (nextBat <= 0 && bats.length < 2) {
					bats.push({ x: -30, y: rand(h * 0.08, h * 0.3), speed: rand(60, 100), scale: rand(0.8, 1.3) })
					nextBat = rand(11, 20)
				}
				bats = bats.filter(b => b.x < w + 40)
				for (const b of bats) {
					b.x += b.speed * dt
					b.y += Math.sin(clock * 1.6 + b.x * 0.02) * 14 * dt
					drawBat(b, clock)
				}
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

{#if season && !reduced}
	<canvas bind:this={canvas} class="season" aria-hidden="true"></canvas>
{/if}

<style>
	.season {
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100vh;
		/* Over the page and the cartridges, under the header */
		z-index: 45;
		pointer-events: none;
	}
</style>
