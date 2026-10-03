/**
 * One WebGL canvas that draws every cartridge on the page
 *
 * A grid shows dozens of cards and browsers cap a page at about sixteen WebGL
 * contexts, so a canvas per card would start losing them. Instead there is a
 * single fixed canvas over the page, and each card in the layout registers its
 * element here. Every frame the stage reads where those elements are and puts
 * a cartridge mesh exactly on top of each one. The elements stay in the page as
 * the real links, with the real text; this only paints them
 *
 * The models are deliberately low-poly (rounded corners of a couple of facets,
 * flat shading, three-step toon lighting) for an 8-bit look. The label art and
 * the printed numbers are not: they are drawn into textures at full resolution
 *
 * It renders on demand. With nothing moving the loop stops, so a page at rest
 * costs nothing
 *
 * Loaded with a dynamic import, so three.js is only fetched when the cartridge
 * view is used, and never for a crawler
 */
import {
	WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, Shape, ExtrudeGeometry, PlaneGeometry,
	MeshToonMaterial, MeshBasicMaterial, AmbientLight, DirectionalLight, CanvasTexture, DataTexture,
	SRGBColorSpace, NearestFilter, RGBAFormat, LinearMipmapLinearFilter, LinearFilter, Plane, Vector3, AdditiveBlending
} from 'three'

// Opening a card: a small pull back, then it slides down into an invisible slot
const INSERT_PULL_MS = 140
const INSERT_SLIDE_MS = 560
// How long a card takes to fly to its dock, and back
const DOCK_SECONDS = 0.9
const easeInOutCubic = (/** @type {number} */ t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** A card is 21 x 31 x 3.4 mm; everything is in card widths, so width is 1 */
const H = 31 / 21
// A real card is 3.4 mm; drawn at 80% of that, which reads better at this size
const D = (3.4 * 0.8) / 21
const FACE_PX = 512
const FACE_PX_H = Math.round(FACE_PX * H)
const FOV = 30
const FLIP_MS = 900

const easeOutCubic = (/** @type {number} */ t) => 1 - Math.pow(1 - t, 3)

/**
 * @typedef {Object} CartridgeData
 * @property {string} id
 * @property {string} title
 * @property {string} publisher
 * @property {string} regionBadge
 * @property {string | null} dockedFps
 * @property {string | null} handheldFps
 * @property {string | null} artUrl
 * @property {boolean} [ghost] an unlabelled stand-in with an invitation on it, not a real game
 */

/** @param {string} src @returns {Promise<HTMLImageElement | null>} */
function loadImage (src) {
	return new Promise((resolve) => {
		const img = new Image()
		img.crossOrigin = 'anonymous'
		img.decoding = 'async'
		img.onload = () => resolve(img)
		img.onerror = () => resolve(null)
		img.src = src
	})
}

/** @param {CanvasRenderingContext2D} ctx @param {string} text @param {number} maxWidth @param {number} maxLines */
function wrap (ctx, text, maxWidth, maxLines) {
	const words = text.split(/\s+/)
	/** @type {string[]} */
	const lines = []
	let line = ''
	for (let i = 0; i < words.length; i++) {
		const next = line ? `${line} ${words[i]}` : words[i]
		if (ctx.measureText(next).width <= maxWidth || !line) {
			line = next
		} else {
			lines.push(line)
			line = words[i]
			if (lines.length === maxLines) break
		}
	}
	if (lines.length < maxLines && line) lines.push(line)
	// Ellipsis on the last line if there was more
	const consumed = lines.join(' ').length
	if (consumed < text.length || ctx.measureText(lines[lines.length - 1] ?? '').width > maxWidth) {
		let last = lines[lines.length - 1] ?? ''
		while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1)
		lines[lines.length - 1] = `${last}…`
	}
	return lines
}

/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} w @param {number} h @param {number} r */
function roundRect (ctx, x, y, w, h, r) {
	ctx.beginPath()
	ctx.roundRect(x, y, w, h, r)
}

/**
 * The front face: a label with a red band carrying the numbers, the art, and a
 * strip with the title and a code, then the mark and ridges. Everything else is
 * left transparent so the shell shows through. Units are 1% of the face width
 * @param {HTMLCanvasElement} canvas @param {CartridgeData} d @param {HTMLImageElement | null} art
 */
function drawFront (canvas, d, art) {
	if (d.ghost) return drawGhostFront(canvas)
	const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'))
	const u = canvas.width / 100
	const sans = '\'Inter Variable\', Inter, system-ui, sans-serif'
	ctx.clearRect(0, 0, canvas.width, canvas.height)

	// Measured from a photograph of a real card, in 1% of its width (it is 147.6
	// tall): the label window starts 12.4 down, is 82.6 wide and 117.1 tall, with
	// a 28.4 band, leaving 18 below it for the arrow
	const lx = 8.7 * u
	const ly = 12.4 * u
	const lw = 82.6 * u
	const lh = 117.1 * u
	const bandH = 28.4 * u

	// A dark bezel under the label
	ctx.fillStyle = '#050506'
	roundRect(ctx, lx - 1 * u, ly - 1 * u, lw + 2 * u, lh + 2 * u, 2.4 * u)
	ctx.fill()

	ctx.save()
	roundRect(ctx, lx, ly, lw, lh, 1.6 * u)
	ctx.clip()

	ctx.fillStyle = '#f4f4f2'
	ctx.fillRect(lx, ly, lw, lh)

	// Band
	const hasData = !!(d.dockedFps || d.handheldFps)
	const band = ctx.createLinearGradient(0, ly, 0, ly + bandH)
	band.addColorStop(0, hasData ? '#f0192b' : '#6d6d74')
	band.addColorStop(1, hasData ? '#d80f20' : '#55555c')
	ctx.fillStyle = band
	ctx.fillRect(lx, ly, lw, bandH)

	// Band contents: each mode is a small label over a large number. No icons, a
	// hairline between the two, and a single mode sits in the middle
	ctx.fillStyle = '#fff'
	if (hasData) {
		const modes = [
			d.dockedFps && { label: 'DOCKED', fps: d.dockedFps },
			d.handheldFps && { label: 'HANDHELD', fps: d.handheldFps }
		].filter(Boolean)
		const colW = lw / modes.length
		modes.forEach((mode, i) => {
			const cx = lx + colW * i + colW / 2

			ctx.textAlign = 'center'
			ctx.textBaseline = 'alphabetic'
			ctx.fillStyle = 'rgba(255,255,255,0.78)'
			ctx.font = `700 ${4.2 * u}px ${sans}`
			if ('letterSpacing' in ctx) ctx.letterSpacing = `${0.5 * u}px`
			ctx.fillText(mode.label, cx, ly + 9.2 * u)
			if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'

			// The number, with a smaller FPS after it, centred as one
			ctx.font = `800 ${13 * u}px ${sans}`
			const numW = ctx.measureText(mode.fps).width
			ctx.font = `700 ${4.6 * u}px ${sans}`
			const unitW = ctx.measureText('FPS').width + 1.4 * u
			const startX = cx - (numW + unitW) / 2
			ctx.textAlign = 'left'
			ctx.fillStyle = '#fff'
			ctx.font = `800 ${13 * u}px ${sans}`
			ctx.fillText(mode.fps, startX, ly + 23.2 * u)
			ctx.fillStyle = 'rgba(255,255,255,0.85)'
			ctx.font = `700 ${4.6 * u}px ${sans}`
			ctx.fillText('FPS', startX + numW + 1.4 * u, ly + 23.2 * u)
		})
		if (modes.length === 2) {
			ctx.fillStyle = 'rgba(255,255,255,0.28)'
			ctx.fillRect(lx + lw / 2 - 0.2 * u, ly + 5 * u, 0.4 * u, bandH - 10 * u)
		}
	} else {
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		ctx.fillStyle = 'rgba(255,255,255,0.8)'
		ctx.font = `700 ${5.6 * u}px ${sans}`
		if ('letterSpacing' in ctx) ctx.letterSpacing = `${0.6 * u}px`
		ctx.fillText('NO DATA YET', lx + lw / 2, ly + bandH / 2)
		if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'
	}
	ctx.textAlign = 'left'

	// Art, cropped to cover, running down to the bottom of the label: the title
	// and code sit on a blur of it rather than on a white strip
	const ay = ly + bandH
	const ah = lh - bandH
	ctx.fillStyle = '#2a2c33'
	ctx.fillRect(lx, ay, lw, ah)
	if (art) {
		const scale = Math.max(lw / art.width, ah / art.height)
		const w = art.width * scale
		const h = art.height * scale
		// Cover overshoots one axis; without the clip it paints over the band
		ctx.save()
		ctx.beginPath()
		ctx.rect(lx, ay, lw, ah)
		ctx.clip()
		ctx.drawImage(art, lx + (lw - w) / 2, ay + (ah - h) / 2, w, h)
		ctx.restore()
	} else {
		ctx.fillStyle = 'rgba(255,255,255,0.22)'
		ctx.font = `${18 * u}px ${sans}`
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		ctx.fillText('🎮', lx + lw / 2, ay + (ah - 25 * u) / 2)
		ctx.textAlign = 'left'
	}

	// The blur: the strip's own pixels. A real blur where the browser has one;
	// elsewhere (older Safari has no canvas filter) the strip is shrunk and
	// stretched back, which is blockier but reads the same behind text
	const sx = lx
	const sy = ly + lh - 27 * u
	const sw = lw
	const sh = 27 * u
	ctx.save()
	ctx.beginPath()
	ctx.rect(sx, sy, sw, sh)
	ctx.clip()
	if ('filter' in ctx) {
		const copy = Object.assign(document.createElement('canvas'), { width: Math.ceil(sw), height: Math.ceil(sh) })
		const cctx = /** @type {CanvasRenderingContext2D} */ (copy.getContext('2d'))
		cctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh)
		ctx.filter = `blur(${2.4 * u}px)`
		// Drawn a little oversize so the blurred edge falls outside the clip
		ctx.drawImage(copy, sx - 3 * u, sy - 3 * u, sw + 6 * u, sh + 6 * u)
		ctx.filter = 'none'
	} else {
		const tiny = Object.assign(document.createElement('canvas'), { width: 28, height: 9 })
		const tctx = /** @type {CanvasRenderingContext2D} */ (tiny.getContext('2d'))
		tctx.imageSmoothingQuality = 'high'
		tctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, tiny.width, tiny.height)
		ctx.imageSmoothingEnabled = true
		ctx.imageSmoothingQuality = 'high'
		ctx.drawImage(tiny, 0, 0, tiny.width, tiny.height, sx, sy, sw, sh)
	}
	const shade = ctx.createLinearGradient(0, sy, 0, sy + sh)
	shade.addColorStop(0, 'rgba(8,9,12,0.15)')
	shade.addColorStop(0.35, 'rgba(8,9,12,0.58)')
	shade.addColorStop(1, 'rgba(8,9,12,0.78)')
	ctx.fillStyle = shade
	ctx.fillRect(sx, sy, sw, sh)

	// Title and code
	ctx.textBaseline = 'alphabetic'
	ctx.fillStyle = '#fff'
	ctx.shadowColor = 'rgba(0,0,0,0.55)'
	ctx.shadowBlur = 1.2 * u
	ctx.font = `800 ${6.4 * u}px ${sans}`
	const lines = wrap(ctx, d.title, lw - 7 * u, 2)
	lines.forEach((line, i) => ctx.fillText(line, lx + 3.5 * u, sy + 8.4 * u + i * 7.4 * u))
	ctx.shadowBlur = 0
	ctx.fillStyle = 'rgba(255,255,255,0.72)'
	ctx.font = `${3.7 * u}px 'Fira Mono', ui-monospace, monospace`
	ctx.fillText(`${d.id}${d.regionBadge ? ` · ${d.regionBadge}` : ''}`.slice(0, 34), lx + 3.5 * u, ly + lh - 2.6 * u)
	ctx.restore()
	ctx.restore()

	// The arrow: 16.2 wide, 7.4 tall, its tip 4.1 above the bottom edge
	ctx.fillStyle = 'rgba(255,255,255,0.18)'
	ctx.beginPath()
	ctx.moveTo(41.9 * u, 136.1 * u)
	ctx.lineTo(58.1 * u, 136.1 * u)
	ctx.lineTo(50 * u, 143.5 * u)
	ctx.closePath()
	ctx.fill()
}

/**
 * The front of a stand-in: the same label, but blank, with a plus and an
 * invitation where the game would be. Drawn to be drawn translucent
 * @param {HTMLCanvasElement} canvas
 */
function drawGhostFront (canvas) {
	const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'))
	const u = canvas.width / 100
	const sans = '\'Inter Variable\', Inter, system-ui, sans-serif'
	ctx.clearRect(0, 0, canvas.width, canvas.height)

	const lx = 8.7 * u
	const ly = 12.4 * u
	const lw = 82.6 * u
	const lh = 117.1 * u

	ctx.fillStyle = '#050506'
	roundRect(ctx, lx - 1 * u, ly - 1 * u, lw + 2 * u, lh + 2 * u, 2.4 * u)
	ctx.fill()

	ctx.save()
	roundRect(ctx, lx, ly, lw, lh, 1.6 * u)
	ctx.clip()

	const body = ctx.createLinearGradient(0, ly, 0, ly + lh)
	body.addColorStop(0, '#4a4d57')
	body.addColorStop(1, '#2c2e35')
	ctx.fillStyle = body
	ctx.fillRect(lx, ly, lw, lh)

	ctx.fillStyle = 'rgba(255,255,255,0.14)'
	ctx.fillRect(lx, ly, lw, 28.4 * u)
	ctx.fillStyle = 'rgba(255,255,255,0.78)'
	ctx.textAlign = 'center'
	ctx.textBaseline = 'middle'
	ctx.font = `700 ${5.8 * u}px ${sans}`
	if ('letterSpacing' in ctx) ctx.letterSpacing = `${0.6 * u}px`
	ctx.fillText('YOUR DATA HERE', lx + lw / 2, ly + 14.2 * u)
	if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'

	// A dashed ring with a plus in it
	const cx = lx + lw / 2
	const cy = ly + 28.4 * u + (lh - 28.4 * u) / 2 - 6 * u
	ctx.strokeStyle = 'rgba(255,255,255,0.4)'
	ctx.lineWidth = 0.9 * u
	ctx.setLineDash([2.6 * u, 2.2 * u])
	ctx.beginPath()
	ctx.arc(cx, cy, 15 * u, 0, 6.283)
	ctx.stroke()
	ctx.setLineDash([])
	ctx.lineWidth = 1.6 * u
	ctx.lineCap = 'round'
	ctx.beginPath()
	ctx.moveTo(cx - 6.5 * u, cy)
	ctx.lineTo(cx + 6.5 * u, cy)
	ctx.moveTo(cx, cy - 6.5 * u)
	ctx.lineTo(cx, cy + 6.5 * u)
	ctx.stroke()

	ctx.fillStyle = 'rgba(255,255,255,0.7)'
	ctx.font = `800 ${6.4 * u}px ${sans}`
	ctx.fillText('Be the first', cx, ly + lh - 10 * u)
	ctx.restore()

	ctx.fillStyle = 'rgba(255,255,255,0.16)'
	ctx.beginPath()
	ctx.moveTo(41.9 * u, 136.1 * u)
	ctx.lineTo(58.1 * u, 136.1 * u)
	ctx.lineTo(50 * u, 143.5 * u)
	ctx.closePath()
	ctx.fill()
}

/**
 * The back face: the details etched in light grey, and the five contacts
 * @param {HTMLCanvasElement} canvas @param {CartridgeData} d
 */
function drawBack (canvas, d) {
	const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'))
	const u = canvas.width / 100
	const sans = '\'Inter Variable\', Inter, system-ui, sans-serif'
	ctx.clearRect(0, 0, canvas.width, canvas.height)
	ctx.textBaseline = 'alphabetic'

	let y = 16 * u
	ctx.fillStyle = 'rgba(255,255,255,0.82)'
	ctx.font = `800 ${7 * u}px ${sans}`
	for (const line of wrap(ctx, d.title, 78 * u, 2)) {
		ctx.fillText(line, 12 * u, y)
		y += 8.4 * u
	}
	ctx.font = `${5 * u}px ${sans}`
	ctx.fillStyle = 'rgba(255,255,255,0.62)'
	const rows = [
		[d.publisher, ''],
		[d.regionBadge, ''],
		d.dockedFps ? ['Docked', `${d.dockedFps} FPS`] : null,
		d.handheldFps ? ['Handheld', `${d.handheldFps} FPS`] : null
	].filter(row => row && row[0])
	for (const [label, value] of /** @type {string[][]} */ (rows)) {
		y += 1.4 * u + 5 * u
		if (value) {
			ctx.font = `700 ${5 * u}px ${sans}`
			ctx.fillStyle = 'rgba(255,255,255,0.8)'
			ctx.fillText(label, 12 * u, y)
			ctx.font = `${5 * u}px ${sans}`
			ctx.fillStyle = 'rgba(255,255,255,0.62)'
			ctx.fillText(value, 12 * u + ctx.measureText(label).width + 3 * u + 4 * u, y)
		} else {
			ctx.fillText(label.length > 28 ? `${label.slice(0, 27)}…` : label, 12 * u, y)
		}
	}

	// The slot
	const slotH = 62 * u
	const slotY = canvas.height - 8 * u - slotH
	ctx.fillStyle = 'rgba(0,0,0,0.55)'
	roundRect(ctx, 13 * u, slotY, 74 * u, slotH, 2 * u)
	ctx.fill()

	ctx.fillStyle = 'rgba(255,255,255,0.3)'
	ctx.beginPath()
	ctx.moveTo(15 * u, slotY - 6 * u)
	ctx.lineTo(19.5 * u, slotY - 6 * u)
	ctx.lineTo(17.25 * u, slotY - 2.8 * u)
	ctx.closePath()
	ctx.fill()

	const gap = (70 - 5 * 10) / 4
	for (let n = 0; n < 5; n++) {
		const x = 15 * u + n * (10 + gap) * u
		const h = slotH * (n % 2 ? 0.96 : 0.88)
		const top = slotY + slotH - h
		ctx.fillStyle = '#1b1b1e'
		ctx.fillRect(x, top, 10 * u, h)
		ctx.fillStyle = '#b8893a'
		ctx.fillRect(x + 3.8 * u, top, 2.4 * u, h)
		const green = ctx.createLinearGradient(0, top, 0, top + h * 0.24)
		green.addColorStop(0, '#5fd16b')
		green.addColorStop(1, '#2f9a43')
		ctx.fillStyle = green
		ctx.fillRect(x, top, 10 * u, h * 0.24)
	}
}

/** A soft white spot, for the glare that follows the pointer across a card */
function glareTexture () {
	const canvas = Object.assign(document.createElement('canvas'), { width: 128, height: 128 })
	const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'))
	const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
	g.addColorStop(0, 'rgba(255,255,255,1)')
	g.addColorStop(0.35, 'rgba(255,255,255,0.45)')
	g.addColorStop(1, 'rgba(255,255,255,0)')
	ctx.fillStyle = g
	ctx.fillRect(0, 0, 128, 128)
	const tex = new CanvasTexture(canvas)
	tex.colorSpace = SRGBColorSpace
	return tex
}

/** The soft dark ellipse a floating card casts */
function shadowTexture () {
	const canvas = Object.assign(document.createElement('canvas'), { width: 128, height: 128 })
	const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'))
	const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62)
	g.addColorStop(0, 'rgba(0,0,0,0.9)')
	g.addColorStop(1, 'rgba(0,0,0,0)')
	ctx.fillStyle = g
	ctx.fillRect(0, 0, 128, 128)
	return new CanvasTexture(canvas)
}

/** Three tones of light, hard-edged */
function toonGradient () {
	const data = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 255, 255, 255, 255])
	const tex = new DataTexture(data, 3, 1, RGBAFormat)
	tex.minFilter = NearestFilter
	tex.magFilter = NearestFilter
	tex.needsUpdate = true
	return tex
}

/** The card's body: a rounded rectangle whose corners are only a couple of facets */
function shellGeometry () {
	const r = 0.075
	const shape = new Shape()
	shape.moveTo(r, 0)
	shape.lineTo(1 - r, 0)
	shape.quadraticCurveTo(1, 0, 1, r)
	shape.lineTo(1, H - r)
	shape.quadraticCurveTo(1, H, 1 - r, H)
	shape.lineTo(r, H)
	shape.quadraticCurveTo(0, H, 0, H - r)
	shape.lineTo(0, r)
	shape.quadraticCurveTo(0, 0, r, 0)
	const g = new ExtrudeGeometry(shape, { depth: D, bevelEnabled: false, curveSegments: 2 })
	g.translate(-0.5, -H / 2, -D / 2)
	return g
}

export class CartridgeStage {
	constructor () {
		this.renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'default' })
		this.renderer.setClearColor(0x000000, 0)
		this.renderer.domElement.setAttribute('aria-hidden', 'true')
		Object.assign(this.renderer.domElement.style, {
			position: 'fixed', inset: '0', width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: '40'
		})

		this.scene = new Scene()
		this.camera = new PerspectiveCamera(FOV, 1, 1, 5000)
		this.scene.add(new AmbientLight(0xffffff, 0.95))
		this.sun = new DirectionalLight(0xffffff, 2.0)
		this.sun.position.set(-1, 1.4, 2)
		this.scene.add(this.sun)

		this.gradient = toonGradient()
		this.geometry = shellGeometry()
		this.facePlane = new PlaneGeometry(1, H)
		this.shellMaterial = new MeshToonMaterial({ color: 0x0e0e10, gradientMap: this.gradient })

		/** @type {any} */
		this.inserting = null

		/** @type {Map<Element, any>} */
		this.handles = new Map()
		this.running = false
		this.lastScroll = 0
		this.lastFrame = 0
		this.lastFrameTime = 0
		this.lastScrollY = window.scrollY
		this.snapUntil = 0
		this.scrollVel = 0
		/** @type {{ style: 'flat' | 'angled' | 'sway' | 'float', reduced: boolean }} */
		this.options = { style: 'flat', reduced: false }
		// Touch devices spend their battery on the screen: when nothing is scrolling,
		// the continuous styles are held to about thirty frames a second
		this.coarse = window.matchMedia('(pointer: coarse)').matches
		this.shadowTexture = shadowTexture()
		this.glareTexture = glareTexture()
		this.glareGeometry = new PlaneGeometry(0.95, 0.95)
		/** The card the pointer is over, where it was drawn last frame, for the neighbours to lean from */
		this.hovered = /** @type {{ handle: any, cx: number, cy: number, w: number } | null} */ (null)
		this.shadowGeometry = new PlaneGeometry(1, 1)
		this.lost = false
		/** @type {Array<() => void>} */
		this.lostListeners = []

		this.visibility = new IntersectionObserver((entries) => {
			for (const e of entries) {
				const h = this.handles.get(e.target)
				if (h) h.near = e.isIntersecting
			}
			this.wake()
		}, { rootMargin: '200px' })

		this.onScroll = () => { this.lastScroll = performance.now(); this.wake() }
		this.onResize = () => { this.resize(); this.snapUntil = performance.now() + 300; this.wake() }
		window.addEventListener('scroll', this.onScroll, { passive: true })
		window.addEventListener('resize', this.onResize)
		this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
			e.preventDefault()
			this.lost = true
			this.lostListeners.forEach(fn => fn())
		})
		// Inside the page's own stacking layer, not on <body>: the header's z-index
		// only counts within .app-shell, so a canvas outside it sat above the header
		// and cards scrolled over it
		;(document.querySelector('.app-shell') || document.body).appendChild(this.renderer.domElement)
		this.resize()
	}

	resize () {
		const w = window.innerWidth
		const h = window.innerHeight
		// Capped: past 2x the art is not any sharper and the fill cost climbs
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
		this.renderer.setSize(w, h, false)
		this.camera.aspect = w / h
		const dist = (h / 2) / Math.tan((FOV * Math.PI) / 360)
		this.camera.position.set(w / 2, h / 2, dist)
		this.camera.lookAt(w / 2, h / 2, 0)
		this.camera.far = dist * 4
		this.camera.updateProjectionMatrix()
		this.viewH = h
	}

	/** @param {() => void} fn */
	onLost (fn) { this.lostListeners.push(fn) }

	/**
	 * Draws a cartridge over an element and keeps it there
	 * @param {HTMLElement} el
	 * @param {CartridgeData} data
	 * @param {{ style?: 'flat' | 'angled' | 'sway' | 'float' | 'hero', scrollAmp?: number, layout?: 'glide' | 'snap', ghost?: boolean }} [opts]
	 */
	register (el, data, opts = {}) {
		const group = new Group()
		const shell = new Mesh(this.geometry, this.shellMaterial)
		group.add(shell)

		const frontCanvas = Object.assign(document.createElement('canvas'), { width: FACE_PX, height: FACE_PX_H })
		const backCanvas = Object.assign(document.createElement('canvas'), { width: FACE_PX, height: FACE_PX_H })
		const frontTex = this.texture(frontCanvas)
		const backTex = this.texture(backCanvas)

		const mat = (/** @type {CanvasTexture} */ map) => new MeshBasicMaterial({
			map, transparent: true, alphaTest: 0.02, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
		})
		const front = new Mesh(this.facePlane, mat(frontTex))
		front.position.z = D / 2 + 0.0015
		const back = new Mesh(this.facePlane, mat(backTex))
		back.rotation.y = Math.PI
		back.position.z = -D / 2 - 0.0015
		group.add(front, back)
		// A moving highlight on the front: additive, so it only ever lightens
		const glare = new Mesh(this.glareGeometry, new MeshBasicMaterial({
			map: this.glareTexture, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending
		}))
		glare.position.z = D / 2 + 0.003
		glare.visible = false
		group.add(glare)
		if (opts.ghost) {
			// A stand-in: see-through, so it reads as a place for a game and not a game
			const veil = this.shellMaterial.clone()
			veil.transparent = true
			veil.opacity = 0.5
			shell.material = veil
			for (const m of [front, back]) /** @type {any} */ (m.material).opacity = 0.62
		}
		group.visible = false
		this.scene.add(group)

		const shadow = new Mesh(this.shadowGeometry, new MeshBasicMaterial({ map: this.shadowTexture, transparent: true, opacity: 0, depthWrite: false }))
		shadow.visible = false
		this.scene.add(shadow)

		const handle = {
			el, group, frontCanvas, backCanvas, frontTex, backTex, data,
			near: true,
			ready: false,
			revealAt: /** @type {number | null} */ (null),
			flip: 1,
			hover: 0, hoverTarget: 0,
			poseRx: 0, poseRy: 0, bob: 0,
			scrollRx: 0, scrollRy: 0,
			// Leaning away from a hovered neighbour
			leanX: 0, leanY: 0,
			/** How much the page's scrolling moves this card: 1 on the grid, more on a hero */
			scrollAmp: opts.scrollAmp ?? 1,
			/** A card can ask for its own pose, whatever the setting says */
			styleOverride: opts.style ?? null,
			// 'glide': when the page reflows (a filter, a sort, a resize) the card eases to
			// its new place instead of jumping. 'snap' follows the page exactly
			layoutMode: opts.layout ?? 'glide',
			/** Where it is drawn, in page coordinates, so scrolling is never smoothed */
			layout: /** @type {{ x: number, y: number, w: number } | null} */ (null),
			// Dragging to spin: yaw and pitch added to the pose, and a spring back to face-up
			spinX: 0, spinY: 0, spinVel: 0, dragging: false,
			// Docking: the card can leave its place for a small spot elsewhere (a bubble
			// on a phone) and come back. dockT runs 0 (home) to 1 (docked)
			// Focus: the card is being inspected. It stays where it is turned, can be dragged
			// on both axes, and can follow the phone's tilt (sensorYaw/sensorPitch are the
			// target, sx/sy what is drawn, eased toward it)
			focus: false,
			sensorYaw: 0, sensorPitch: 0, sx: 0, sy: 0,
			dockEl: /** @type {Element | null} */ (null),
			dockTarget: 0,
			dockT: 0,
			// Each card moves on its own beat
			phase: [...String(data.id)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 1000, 7) / 160,
			shadow,
			glare,
			tx: 0, ty: 0, rx: 0, ry: 0,
			/** @type {Promise<void>} */
			loaded: Promise.resolve(),
			/** @param {CartridgeData} next */
			update: (next) => { handle.data = next; return paint() },
			/** @param {number} nx @param {number} ny -0.5..0.5 across the card */
			setTilt: (nx, ny) => { handle.tx = nx; handle.ty = ny; this.wake() },
			/** @param {boolean} on */
			setHover: (on) => { handle.hoverTarget = on ? 1 : 0; if (!on) { handle.tx = 0; handle.ty = 0 } this.wake() },
			/** @param {number} [delay] ms */
			reveal: (delay = 0) => {
				if (handle.revealAt === null) {
					handle.revealAt = this.options.reduced ? performance.now() - FLIP_MS : performance.now() + delay
					this.wake()
				}
			},
			/**
			 * Fly to a spot, or back. The spot is an element: the card goes to where it is
			 * @param {Element | null} el
			 * @param {boolean} on
			 */
			setDock: (el, on) => {
				handle.dockEl = el
				const next = el && on ? 1 : 0
				if (next !== handle.dockTarget) {
					handle.dockTarget = next
					// Nothing to fly when motion is reduced: it is simply there
					if (this.options.reduced) handle.dockT = next
					this.wake()
				}
			},
			/**
			 * Inspect it: it is lifted above the page's header, stays where it is turned,
			 * and takes a two-axis drag
			 * @param {boolean} on
			 */
			setFocus: (on) => {
				handle.focus = on
				if (!on) { handle.sensorYaw = 0; handle.sensorPitch = 0 }
				// Above the header (50) while it is being looked at
				this.renderer.domElement.style.zIndex = on ? '70' : '40'
				this.wake()
			},
			/**
			 * Turn it with the phone's tilt
			 * @param {number} yaw radians
			 * @param {number} pitch radians
			 */
			setSensor: (yaw, pitch) => { handle.sensorYaw = yaw; handle.sensorPitch = pitch; this.wake() },
			beginDrag: () => { handle.dragging = true; handle.spinVel = 0; this.wake() },
			/** @param {number} dx @param {number} dy pixels */
			dragBy: (dx, dy) => {
				handle.spinY += dx * 0.012
				const limit = handle.focus ? 1.3 : 0.6
				handle.spinX = Math.max(-limit, Math.min(limit, handle.spinX + dy * 0.008))
				handle.spinVel = dx * 0.0016
				this.wake()
			},
			endDrag: () => { handle.dragging = false; this.wake() },
			/** Slides this card down into an invisible slot, resolving once it is out of sight */
			insert: () => this.beginInsert(handle),
			dispose: () => this.unregister(el)
		}

		const paint = async () => {
			const d = handle.data
			if ('fonts' in document) await document.fonts.ready
			const art = d.artUrl ? await loadImage(d.artUrl) : null
			if (!this.handles.has(el)) return
			drawFront(frontCanvas, d, art)
			drawBack(backCanvas, d)
			frontTex.needsUpdate = true
			backTex.needsUpdate = true
			handle.ready = true
			this.wake()
		}
		handle.loaded = paint()

		this.handles.set(el, handle)
		this.visibility.observe(el)
		return handle
	}

	/** @param {HTMLCanvasElement} canvas */
	texture (canvas) {
		const t = new CanvasTexture(canvas)
		t.colorSpace = SRGBColorSpace
		t.anisotropy = 4
		t.minFilter = LinearMipmapLinearFilter
		t.magFilter = LinearFilter
		return t
	}

	/** @param {Element} el */
	unregister (el) {
		const h = this.handles.get(el)
		if (!h) return
		this.visibility.unobserve(el)
		this.scene.remove(h.group)
		this.scene.remove(h.shadow)
		h.shadow.material.dispose()
		h.frontTex.dispose()
		h.backTex.dispose()
		h.group.traverse((/** @type {any} */ o) => o.material && o.material !== this.shellMaterial && o.material.dispose())
		this.handles.delete(el)
		this.wake()
	}

	/**
	 * Opening a card, in place: it pulls back a touch, then slides down into an
	 * invisible slot at its own bottom edge, clipped there so it seems to go in.
	 * Nothing else on the page changes. Resolves once it is out of sight; call
	 * endInsert afterwards (it also puts the card back if the page did not open)
	 * @param {any} handle
	 */
	beginInsert (handle) {
		if (this.inserting) return Promise.resolve()
		// This card gets its own shell material, so the clip does not touch the others
		const shell = handle.group.children[0]
		const clippedShell = this.shellMaterial.clone()
		const clip = new Plane(new Vector3(0, 1, 0), 0)
		clippedShell.clippingPlanes = [clip]
		const faceMaterials = handle.group.children.slice(1).map((/** @type {any} */ m) => m.material)
		faceMaterials.forEach((/** @type {any} */ m) => { m.clippingPlanes = [clip]; m.needsUpdate = true })
		shell.material = clippedShell
		this.renderer.localClippingEnabled = true

		this.inserting = {
			handle, shell, clippedShell, clip, faceMaterials,
			start: performance.now(),
			hidden: false,
			/** @type {() => void} */
			resolve: () => {}
		}
		const done = new Promise((resolve) => { this.inserting.resolve = () => resolve(undefined) })
		this.wake()
		return done
	}

	/** Puts everything back as it was */
	endInsert () {
		const st = this.inserting
		if (!st) return
		st.shell.material = this.shellMaterial
		st.clippedShell.dispose()
		st.faceMaterials.forEach((/** @type {any} */ m) => { m.clippingPlanes = null; m.needsUpdate = true })
		this.renderer.localClippingEnabled = false
		st.handle.group.visible = true
		this.inserting = null
		this.wake()
	}

	get busy () { return !!this.inserting }

	/** @param {number} now @returns {boolean} true while it still needs frames */
	updateInsert (now) {
		const st = this.inserting
		const h = st.handle
		const r = h.el.getBoundingClientRect()
		const t = now - st.start
		const ch = r.width * H
		const bottom = r.top + ch

		// The slot is the card's own bottom edge. Clip everything below it
		st.clip.constant = -(this.viewH - bottom)

		let offset
		if (t < INSERT_PULL_MS) {
			offset = -r.width * 0.05 * easeOutCubic(t / INSERT_PULL_MS)
		} else {
			const p = Math.min(1, (t - INSERT_PULL_MS) / INSERT_SLIDE_MS)
			// Slow to start, then in
			offset = -r.width * 0.05 + (ch * 1.04 + r.width * 0.05) * (p * p * p)
		}

		h.flip = 0
		h.rx *= 0.8
		h.ry *= 0.8
		h.poseRx *= 0.8
		h.poseRy *= 0.8
		h.bob *= 0.8
		h.shadow.visible = false
		h.group.scale.setScalar(r.width)
		h.group.rotation.set(h.rx + h.poseRx, h.ry + h.poseRy, 0)
		h.group.position.set(r.left + r.width / 2, this.viewH - (r.top + ch / 2 + offset), -(D * r.width) / 2)

		if (!st.hidden && r.top + offset >= bottom) {
			st.hidden = true
			h.group.visible = false
			st.resolve()
		}
		return !st.hidden
	}

	/**
	 * Where a card should be drawn this frame. When the page reflows, the place it
	 * is in jumps; the card eases there instead, and scrolling (which moves every
	 * card the same way) is left alone because the easing is done in page
	 * coordinates
	 * @param {any} h
	 * @param {DOMRect} r where the placeholder is now
	 * @param {number} dt seconds since the last frame
	 * @param {number} now
	 * @returns {{ rect: { left: number, top: number, width: number, bottom: number, height: number }, settled: boolean }}
	 */
	glide (h, r, dt, now) {
		const sx = window.scrollX
		const sy = window.scrollY
		const target = { x: r.left + sx, y: r.top + sy, w: r.width }
		const snap = !h.layout || this.options.reduced || now < this.snapUntil
		if (snap) {
			h.layout = target
		} else {
			// Frame-rate independent: about a tenth of a second to cover most of it
			const k = 1 - Math.exp(-dt * 11)
			h.layout.x += (target.x - h.layout.x) * k
			h.layout.y += (target.y - h.layout.y) * k
			h.layout.w += (target.w - h.layout.w) * k
		}
		const settled = Math.abs(target.x - h.layout.x) < 0.3 && Math.abs(target.y - h.layout.y) < 0.3 && Math.abs(target.w - h.layout.w) < 0.3
		if (settled) h.layout = target
		const height = h.layout.w * H
		const top = h.layout.y - sy
		return { rect: { left: h.layout.x - sx, top, width: h.layout.w, bottom: top + height, height }, settled }
	}

	/**
	 * Style and motion can change while the page is open (Settings)
	 * @param {{ style?: 'flat' | 'angled' | 'sway' | 'float', reduced?: boolean, light?: number }} next
	 */
	setOptions (next) {
		const { light, ...rest } = next
		this.options = { ...this.options, ...rest }
		// A seasonal tint on the light that falls on the cartridges; white otherwise
		if (light !== undefined) this.sun.color.setHex(light)
		if (this.options.reduced) {
			// No turn to wait for: every card is simply face-up
			const now = performance.now()
			for (const h of this.handles.values()) {
				h.revealAt = now - FLIP_MS
				h.flip = 0
				h.tx = 0
				h.ty = 0
				h.hoverTarget = 0
				h.dockT = h.dockTarget
			}
		}
		this.wake()
	}

	wake () {
		if (this.running || this.lost) return
		this.running = true
		requestAnimationFrame(this.frame)
	}

	frame = () => {
		const now = performance.now()
		const dtFrame = Math.min(0.06, (now - (this.lastFrameTime || now)) / 1000)
		this.lastFrameTime = now
		const scrolling = now - this.lastScroll < 140
		// Held to ~30fps on touch devices while nothing scrolls; scrolling needs every frame
		if (this.coarse && !scrolling && now - this.lastFrame < 32) {
			requestAnimationFrame(this.frame)
			return
		}
		this.lastFrame = now
		let animating = scrolling

		const { style: globalStyle, reduced } = this.options
		const t = now / 1000

		// Scroll speed, smoothed: the cards lean into it a little
		const sy = window.scrollY
		this.scrollVel = this.scrollVel * 0.8 + (sy - this.lastScrollY) * 0.2
		this.lastScrollY = sy

		// Read every position first, then write: no layout thrash
		const rects = []
		for (const h of this.handles.values()) rects.push(h.near || h.dockT > 0 || h.dockTarget ? h.el.getBoundingClientRect() : null)

		let i = 0
		/** @type {{ handle: any, cx: number, cy: number, w: number } | null} */
		let nextHovered = null
		for (const h of this.handles.values()) {
			/** @type {any} */
			let r = rects[i++]
			if (this.inserting && this.inserting.handle === h) continue
			const g = h.group
			const away = h.dockT > 0 || h.dockTarget
			if (r && h.layoutMode === 'glide' && !away && r.width > 0) {
				const glided = this.glide(h, r, dtFrame, now)
				r = glided.rect
				if (!glided.settled) animating = true
			}
			// A card nobody is looking at forgets where it was: if the page reflowed
			// while it was away, it should appear in its new place, not cross the screen
			if (!r) h.layout = null
			if (!r || !h.ready || (r.width === 0 && !away) || (!away && (r.bottom < -50 || r.top > this.viewH + 50))) {
				g.visible = false
				h.shadow.visible = false
				continue
			}

			// Turn from the back to the front
			if (h.revealAt !== null && h.flip > 0) {
				h.flip = Math.max(0, 1 - easeOutCubic(Math.min(1, Math.max(0, (now - h.revealAt) / FLIP_MS))))
				if (now - h.revealAt < FLIP_MS) animating = true
				else h.flip = 0
			}

			// Flying to the dock, or home again
			if (h.dockT !== h.dockTarget) {
				const step = dtFrame / DOCK_SECONDS
				h.dockT = h.dockTarget ? Math.min(1, h.dockT + step) : Math.max(0, h.dockT - step)
				animating = true
			}
			const e = easeInOutCubic(h.dockT)
			const dock = e > 0 && h.dockEl ? h.dockEl.getBoundingClientRect() : null

			// Ease toward the pointer
			h.rx += (h.ty * -0.31 - h.rx) * 0.2
			h.ry += (h.tx * 0.38 - h.ry) * 0.2
			h.hover += (h.hoverTarget - h.hover) * 0.2
			if (Math.abs(h.rx - h.ty * -0.31) > 0.002 || Math.abs(h.ry - h.tx * 0.38) > 0.002 || Math.abs(h.hover - h.hoverTarget) > 0.01) animating = true

			// How the card sits when nothing is touching it: the chosen style
			const style = h.styleOverride ?? globalStyle
			let tRx = 0
			let tRy = 0
			let tBob = 0
			if (!reduced) {
				const ph = h.phase
				if (style === 'hero') {
					// A hero card: a three-quarter view that drifts very slightly, and rides a little above its shadow
					tRx = -0.07 + 0.02 * Math.sin(t * 0.7 + ph)
					tRy = -0.27 + 0.05 * Math.sin(t * 0.5 + ph)
					tBob = 0.024 + 0.014 * Math.sin(t * 0.9 + ph)
				} else if (style === 'angled') {
					// Like the reference render: turned to show the right edge, top a touch back
					tRx = -0.12
					tRy = -0.34
				} else if (style === 'sway') {
					tRx = -0.07 + 0.03 * Math.sin(t * 0.7 + ph)
					tRy = 0.5 * Math.sin(t * 0.55 + ph)
				} else if (style === 'float') {
					tRx = -0.06 + 0.04 * Math.sin(t * 0.8 + ph)
					tRy = -0.22 + 0.08 * Math.sin(t * 0.6 + ph * 1.3)
					tBob = 0.045 + 0.03 * Math.sin(t * 1.1 + ph)
				}
			}
			h.poseRx += (tRx - h.poseRx) * 0.12
			h.poseRy += (tRy - h.poseRy) * 0.12
			h.bob += (tBob - h.bob) * 0.12
			if (Math.abs(h.poseRx - tRx) > 0.002 || Math.abs(h.poseRy - tRy) > 0.002 || Math.abs(h.bob - tBob) > 0.001) animating = true
			// The continuous styles keep the loop going; nothing else does
			if (!reduced && (style === 'sway' || style === 'float' || style === 'hero')) animating = true

			// Dragged round: it keeps the push a moment, then settles face-up (the nearest full turn)
			if (h.focus && !h.dragging) {
				// Being inspected: it keeps the push it was given and comes to rest where it is
				h.spinY += h.spinVel
				h.spinVel *= 0.93
				if (Math.abs(h.spinVel) > 0.0005) animating = true
			} else if (!h.dragging && h.dockTarget && h.dockT >= 1 && !this.options.reduced) {
				// In the bubble it turns slowly, all the time
				h.spinY += dtFrame * 1.3
				animating = true
			} else if (!h.dragging) {
				const home = Math.round(h.spinY / (Math.PI * 2)) * Math.PI * 2
				h.spinY += (home - h.spinY) * 0.07 + h.spinVel
				h.spinVel *= 0.9
				if (!h.focus) h.spinX += (0 - h.spinX) * 0.08
			}
			if (h.focus || h.dragging || Math.abs(h.spinVel) > 0.0005 || Math.abs(h.spinX) > 0.002 || Math.abs(h.spinY - Math.round(h.spinY / (Math.PI * 2)) * Math.PI * 2) > 0.002) animating = true

			// Once it has turned, a quiet response to the page moving: a card near the
			// top of the screen leans back a touch, one near the bottom forward, and
			// scrolling quickly turns it slightly the way it is going
			let tSx = 0
			let tSy = 0
			if (!reduced && h.flip === 0) {
				const centre = (r.top + (r.width * H) / 2) / this.viewH - 0.5
				tSx = centre * 0.1 * h.scrollAmp
				tSy = Math.max(-0.08, Math.min(0.08, this.scrollVel * 0.004)) * h.scrollAmp
			}
			h.scrollRx += (tSx - h.scrollRx) * 0.1
			h.scrollRy += (tSy - h.scrollRy) * 0.1
			if (Math.abs(h.scrollRx - tSx) > 0.002 || Math.abs(h.scrollRy - tSy) > 0.002) animating = true

			// The phone's tilt, eased so a jittery sensor does not make it shake
			h.sx += (h.sensorYaw - h.sx) * 0.14
			h.sy += (h.sensorPitch - h.sy) * 0.14
			if (Math.abs(h.sx - h.sensorYaw) > 0.002 || Math.abs(h.sy - h.sensorPitch) > 0.002) animating = true

			// Leaning away from the card the pointer is on, in proportion to how close it is
			const cxPx = r.left + r.width / 2
			const cyPx = r.top + (r.width * H) / 2
			let tLx = 0
			let tLy = 0
			const hov = this.hovered
			if (!reduced && hov && hov.handle !== h && !away) {
				const dx = cxPx - hov.cx
				const dy = cyPx - hov.cy
				const dist = Math.hypot(dx, dy) || 1
				const reach = hov.w * 1.9
				if (dist < reach) {
					const f = 1 - dist / reach
					tLy = (dx / dist) * f * 0.16
					tLx = (dy / dist) * f * 0.12
				}
			}
			h.leanX += (tLx - h.leanX) * 0.14
			h.leanY += (tLy - h.leanY) * 0.14
			if (Math.abs(h.leanX - tLx) > 0.002 || Math.abs(h.leanY - tLy) > 0.002) animating = true
			if (h.hoverTarget === 1 && !away) nextHovered = { handle: h, cx: cxPx, cy: cyPx, w: r.width }

			// Pose fades as it leaves for the dock: a docked card just turns
			const stay = 1 - e
			let cx = r.left + r.width / 2
			let cy = r.top + (r.width * H) / 2
			let width = r.width
			let flightYaw = 0
			if (dock && dock.width > 0) {
				// An arc, not a straight line: out to the left and up a little at the middle
				const arc = Math.sin(Math.PI * e)
				cx = cx + (dock.left + dock.width / 2 - cx) * e - arc * Math.min(window.innerWidth * 0.16, 80)
				cy = cy + (dock.top + (dock.width * H) / 2 - cy) * e - arc * this.viewH * 0.05
				width = r.width + (dock.width - r.width) * e
				flightYaw = e * Math.PI * 2
			}

			const s = width * (1 + 0.04 * h.hover)
			g.scale.setScalar(s)
			g.rotation.set(
				h.rx + (h.poseRx + h.scrollRx) * stay + h.spinX + h.sy + h.leanX,
				h.ry + (h.poseRy + h.scrollRy) * stay + h.spinY + h.sx + h.leanY + h.flip * Math.PI + flightYaw,
				0
			)
			g.position.set(
				cx,
				this.viewH - cy + (6 * h.hover + h.bob * width) * stay,
				-(D * s) / 2
			)
			g.visible = true

			// A floating card casts a shadow that thins as it rises
			const sh = h.shadow
			sh.visible = (style === 'float' || style === 'hero') && !reduced && e < 0.02
			if (sh.visible) {
				sh.scale.set(r.width * 0.9, r.width * 0.2, 1)
				sh.position.set(r.left + r.width / 2, this.viewH - (r.top + r.width * H + r.width * 0.06), -2)
				sh.material.opacity = Math.max(0.05, 0.34 - h.bob * 3.2)
			}

			// A highlight that follows the pointer across the card
			const spot = h.glare
			spot.visible = !reduced && h.hover > 0.03 && !h.dragging && h.dockT === 0
			if (spot.visible) {
				spot.position.x = h.tx
				spot.position.y = -h.ty * H
				spot.material.opacity = 0.3 * h.hover
			}
		}

		this.hovered = nextHovered

		if (this.inserting) {
			if (this.updateInsert(now)) animating = true
		}

		this.renderer.render(this.scene, this.camera)

		if (animating) {
			requestAnimationFrame(this.frame)
		} else {
			this.running = false
		}
	}

	get size () { return this.handles.size }

	dispose () {
		window.removeEventListener('scroll', this.onScroll)
		window.removeEventListener('resize', this.onResize)
		this.visibility.disconnect()
		for (const el of [...this.handles.keys()]) this.unregister(el)
		this.shadowTexture.dispose()
		this.glareTexture.dispose()
		this.glareGeometry.dispose()
		this.shadowGeometry.dispose()
		this.geometry.dispose()
		this.facePlane.dispose()
		this.shellMaterial.dispose()
		this.gradient.dispose()
		this.renderer.dispose()
		this.renderer.domElement.remove()
		this.lost = true
	}
}

/** @type {Promise<CartridgeStage | null> | null} */
let shared = null
let disposeTimer = 0

function supported () {
	try {
		const c = document.createElement('canvas')
		return !!(c.getContext('webgl2') || c.getContext('webgl'))
	} catch {
		return false
	}
}

/** The one stage, created on first use; null when WebGL is not available */
export function getStage () {
	clearTimeout(disposeTimer)
	shared ??= Promise.resolve().then(() => {
		if (!supported()) return null
		try {
			const stage = new CartridgeStage()
			stage.onLost(() => { shared = null })
			return stage
		} catch {
			return null
		}
	})
	return shared
}

/** Called when a card goes away; the stage is torn down once nothing uses it */
export function releaseStage () {
	clearTimeout(disposeTimer)
	disposeTimer = window.setTimeout(async () => {
		const stage = await shared
		if (stage && stage.size === 0 && !stage.busy) {
			stage.dispose()
			shared = null
		}
	}, 600)
}
