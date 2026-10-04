/**
 * OG image generation, rendered in-process
 *
 * Previously this went through a Workers-shaped renderer: satori plus resvg
 * compiled to WASM, with both Inter weights fetched from a CDN on every single
 * request because a Worker keeps nothing between invocations. On a long-lived
 * Node server neither is true, so fonts are read from node_modules once and the
 * PNG is rendered by native resvg
 */
import satori from 'satori'
import sharp from 'sharp'
import { Resvg } from '@resvg/resvg-js'
import { html as toVdom } from 'satori-html'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import logger from '$lib/services/loggerService'
import { isSwitch2Id } from '$lib/platform'
import { getSourceImage } from '$lib/server/assetCache'

const require = createRequire(import.meta.url)

/** Loaded once per process, not once per request */
let basePromise: Promise<{ regular: Buffer; bold: Buffer }> | null = null

/** Google Fonts subsets for scripts Inter does not cover, keyed by family */
const scriptFontCache = new Map<string, ArrayBuffer | null>()

function loadBaseFonts () {
	basePromise ??= (async () => {
		const [regular, bold] = await Promise.all([
			readFile(require.resolve('@fontsource/inter/files/inter-latin-400-normal.woff')),
			readFile(require.resolve('@fontsource/inter/files/inter-latin-700-normal.woff'))
		])
		return { regular, bold }
	})()
	return basePromise
}

async function fetchBuffer (url: string, timeout = 5000) {
	const controller = new AbortController()
	const id = setTimeout(() => controller.abort(), timeout)

	try {
		const res = await fetch(url, { signal: controller.signal })
		if (!res.ok) {
			logger.warn(`Failed to fetch font: ${url} (${res.status})`, { url, status: res.status })
			return null
		}
		return await res.arrayBuffer()
	} catch (e) {
		const err = e instanceof Error ? e : new Error(String(e))
		logger.error(`Fetch error for ${url}`, err, { url })
		return null
	} finally {
		clearTimeout(id)
	}
}

/**
 * Fetch a CJK face from Google Fonts. Cached per family for the life of the
 * process: the subset is requested for the whole script, not for `text`, so one
 * download serves every title in that language
 */
async function fetchScriptFont (family: string) {
	if (scriptFontCache.has(family)) return scriptFontCache.get(family) ?? null

	const result = await (async () => {
		try {
			const api = `https://fonts.googleapis.com/css2?family=${family}:wght@700`
			const cssReq = await fetch(api, {
				// Google serves woff2 to modern UA strings, and satori cannot read woff2
				headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64)' }
			})
			if (!cssReq.ok) return null
			const css = await cssReq.text()
			const resource = css.match(/src:\s*url\((['"]?)(.*?)\1\)/)
			return resource?.[2] ? await fetchBuffer(resource[2]) : null
		} catch {
			return null
		}
	})()

	scriptFontCache.set(family, result)
	return result
}

async function getTitleFont (text: string, fallback: Buffer) {
	const isKorean = /[가-힯ᄀ-ᇿ]/.test(text)
	const isJapanese = /[぀-ゟ゠-ヿ]/.test(text)
	const isChinese = /[一-鿿]/.test(text)

	let data: ArrayBuffer | Buffer | null = null
	let name = 'Inter'

	if (isJapanese) {
		name = 'Noto Sans JP'
		// Shipped as a dependency, so the common case needs no network at all
		data = await readFile(require.resolve('@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-700-normal.woff'))
			.catch(() => null)
		data ??= await fetchScriptFont('Noto+Sans+JP')
	} else if (isKorean) {
		name = 'Noto Sans KR'
		data = await fetchScriptFont('Noto+Sans+KR')
	} else if (isChinese) {
		name = 'Noto Sans SC'
		data = await fetchScriptFont('Noto+Sans+SC')
	}

	if (!data) return { name: 'Inter', data: fallback, weight: 700 as const }
	return { name, data, weight: 700 as const }
}

/** Titles and publisher names are arbitrary text and go straight into markup */
function escapeHtml (value: string) {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
}

export interface OgData {
	title: string;
	publisher: string;
	bannerUrl: string;
	/** The cover, used as the cartridge's label */
	iconUrl?: string;
	gameId?: string;
	dockedText: string;
	handheldText: string;
	/** The frame rates for the cartridge's red band: 30, 60, 'Unlocked', or null when there is none */
	dockedFps?: string | null;
	handheldFps?: string | null;
	/** Switch 2 cartridges are red, not black */
	platform?: 'switch' | 'switch2';
}

/**
 * An image as a small data URI, fetched and resized here, so the card never
 * depends on the renderer fetching it and a dead link costs the picture, not
 * the card. Null when it cannot be had
 */
async function imageDataUri (url: string | undefined | null, opts: { width: number; height: number; blur?: number; fit?: 'cover' | 'inside'; quality?: number }): Promise<string | null> {
	if (!url) return null
	let bytes: Buffer | ArrayBuffer | null = null
	if (url.startsWith('data:')) {
		bytes = Buffer.from(url.split(',')[1] || '', 'base64')
	} else {
		try {
			const source = await getSourceImage(url)
			bytes = source.body
		} catch (e) {
			logger.warn('Failed to get source image from cache for OG, falling back to fetchBuffer', { url, error: e instanceof Error ? e.message : String(e) })
			bytes = await fetchBuffer(encodeURI(url), 6000)
		}
	}
	if (!bytes || (bytes as Buffer).length === 0) return null
	try {
		let image = sharp(Buffer.from(bytes)).resize(opts.width, opts.height, { fit: opts.fit ?? 'cover' })
		if (opts.blur) image = image.blur(opts.blur).modulate({ brightness: 0.75, saturation: 1.5 })
		const jpeg = await image.jpeg({ quality: opts.quality ?? 82 }).toBuffer()
		return `data:image/jpeg;base64,${jpeg.toString('base64')}`
	} catch (e) {
		logger.warn('OG image could not be decoded', { url, error: e instanceof Error ? e.message : String(e) })
		return null
	}
}

/** The size of the title that fits its length, in px */
function titleSize (title: string) {
	const n = [...title].length
	if (n <= 16) return 92
	if (n <= 28) return 74
	if (n <= 44) return 60
	return 48
}

/** A frame rate for the band: a number, or a short word, or a dash when there is none */
function bandValue (fps: string | null | undefined) {
	if (!fps) return null
	return /^unlocked$/i.test(fps) ? 'Unlocked' : String(fps).replace(/\D+$/, '')
}

/**
 * Render the card to JPEG bytes. Returns the buffer rather than a Response so
 * the caller can put it in the object store before serving it
 *
 * JPEG rather than PNG because the card is photographic — a game banner under a
 * gradient — and resvg emits raw, unfiltered PNG. The same image measured
 * 1.2 MB as PNG against 106 KB at q88, with no visible difference. Palette PNG
 * would have landed in between and banded the gradient
 */
export async function generateOgImage (data: OgData): Promise<Buffer> {
	const { regular, bold } = await loadBaseFonts()

	const [titleFont, publisherFont] = await Promise.all([
		getTitleFont(data.title, bold),
		getTitleFont(data.publisher || '', bold)
	])

	// satori rejects the same family name registered twice
	const fonts: Array<{ name: string; data: any; weight: 400 | 700; style: 'normal' }> = [
		{ name: titleFont.name, data: titleFont.data, weight: 700, style: 'normal' }
	]
	if (publisherFont.name !== titleFont.name) {
		fonts.push({ name: publisherFont.name, data: publisherFont.data, weight: 700, style: 'normal' })
	}
	if (titleFont.name !== 'Inter' && publisherFont.name !== 'Inter') {
		fonts.push({ name: 'Inter', data: bold, weight: 700, style: 'normal' })
	}
	fonts.push({ name: 'Inter', data: regular, weight: 400, style: 'normal' })

	const isSwitch2 = data.platform === 'switch2' || isSwitch2Id(data.gameId)
	const title = escapeHtml(data.title)
	const publisher = escapeHtml(data.publisher || (isSwitch2 ? 'Nintendo Switch 2' : 'Nintendo Switch'))
	const docked = escapeHtml(data.dockedText)
	const handheld = escapeHtml(data.handheldText)
	const gameId = escapeHtml(data.gameId || '')

	// The backdrop is the banner, blurred hard so it is a colour and a mood and not a
	// competing picture; the cover goes on the cartridge's label
	const [backdrop, cover] = await Promise.all([
		imageDataUri(data.bannerUrl || data.iconUrl, { width: 320, height: 168, blur: 14, quality: 70 }),
		imageDataUri(data.iconUrl || data.bannerUrl, { width: 560, height: 560, quality: 86 })
	])

	// The cartridge, in the real card's proportions (21 x 31 mm). Everything inside it
	// is measured from the card: the label window starts 8.7% of the width in and
	// 12.4% down, is 82.6% wide and 117.1% tall, with a 28.4% band across the top
	const W = 340
	const labelX = Math.round(W * 0.087)
	const labelY = Math.round(W * 0.124)
	const labelW = Math.round(W * 0.826)
	const labelH = Math.round(W * 1.171)
	const bandH = Math.round(W * 0.284)
	const cartH = Math.round(W * 31 / 21)

	const dockedFps = bandValue(data.dockedFps)
	const handheldFps = bandValue(data.handheldFps)
	const hasData = !!(dockedFps || handheldFps)
	const modes = [
		dockedFps && { label: 'DOCKED', value: dockedFps },
		handheldFps && { label: 'HANDHELD', value: handheldFps }
	].filter(Boolean) as Array<{ label: string; value: string }>

	// Each mode gets its half of the band at a fixed place, rather than leaving flex to
	// divide the width, which gave the second one less than its share
	const colW = Math.round(labelW / Math.max(1, modes.length))
	const bandContent = hasData
		? modes.map((m, i) => `
			<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; position: absolute; top: 0; left: ${i * colW}px; width: ${colW}px; height: ${bandH}px; ${i > 0 ? 'border-left: 1px solid rgba(255,255,255,0.28);' : ''}">
				<div style="display: flex; justify-content: center; width: ${colW - 8}px; font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.82); font-family: 'Inter';">${m.label}</div>
				<div style="display: flex; justify-content: center; align-items: baseline; width: ${colW - 8}px; margin-top: 3px;">
					<div style="display: flex; font-size: ${m.value.length > 3 ? 26 : 46}px; font-weight: 700; color: white; font-family: 'Inter'; line-height: 1;">${escapeHtml(m.value)}</div>
					${m.value.length > 3 ? '' : '<div style="display: flex; font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.88); font-family: \'Inter\'; margin-left: 4px;">FPS</div>'}
				</div>
			</div>`).join('')
		: `<div style="display: flex; align-items: center; justify-content: center; width: ${labelW}px; height: ${bandH}px; font-size: 20px; font-weight: 700; color: rgba(255,255,255,0.85); font-family: 'Inter';">NO DATA YET</div>`

	const artHeight = labelH - bandH
	const art = cover
		? `<img src="${cover}" width="${labelW}" height="${artHeight}" style="display: flex; width: ${labelW}px; height: ${artHeight}px; object-fit: cover; border-radius: 0 0 6px 6px;" />`
		: `<div style="display: flex; width: ${labelW}px; height: ${artHeight}px; border-radius: 0 0 6px 6px; background: linear-gradient(160deg, #3a3d4a, #20222b);"></div>`

	const shellBg = isSwitch2
		? 'linear-gradient(135deg, #d62b3c, #b3101f 42%, #6f0710)'
		: 'linear-gradient(135deg, #34343c, #19191e 42%, #0a0a0d)'

	const shellShadow = isSwitch2
		? '0 34px 60px rgba(0,0,0,0.6), inset 0 2px 0 rgba(255,255,255,0.22), inset 0 0 0 1px rgba(255,255,255,0.1)'
		: '0 34px 60px rgba(0,0,0,0.6), inset 0 2px 0 rgba(255,255,255,0.14), inset 0 0 0 1px rgba(255,255,255,0.06)'

	const cartridge = `
		<div style="display: flex; position: relative; width: ${W}px; height: ${cartH}px; border-radius: 24px; background: ${shellBg}; box-shadow: ${shellShadow};">
			<div style="display: flex; position: absolute; left: ${labelX - 3}px; top: ${labelY - 3}px; width: ${labelW + 6}px; height: ${labelH + 6}px; border-radius: 9px; background: #050506;"></div>
			<div style="display: flex; flex-direction: column; position: absolute; left: ${labelX}px; top: ${labelY}px; width: ${labelW}px; height: ${labelH}px; border-radius: 6px; background: #f4f4f2;">
				<div style="display: flex; position: relative; width: ${labelW}px; height: ${bandH}px; border-radius: 6px 6px 0 0; background: ${hasData ? 'linear-gradient(180deg, #ee2a38, #c3121f)' : 'linear-gradient(180deg, #7b7b84, #5a5a62)'};">${bandContent}</div>
				${art}
				<div style="display: flex; position: absolute; left: 0; bottom: 0; width: ${labelW}px; height: 70px; border-radius: 0 0 6px 6px; background: linear-gradient(180deg, rgba(8,9,12,0), rgba(8,9,12,0.65));"></div>
				<div style="display: flex; position: absolute; left: 14px; bottom: 10px; font-size: 13px; letter-spacing: 1px; color: rgba(255,255,255,0.9); font-family: 'Inter';">${gameId}</div>
			</div>
			<svg width="34" height="17" viewBox="0 0 34 17" style="position: absolute; left: ${Math.round(W / 2) - 17}px; top: ${cartH - 40}px;"><path d="M0 0H34L17 17Z" fill="rgba(255,255,255,0.22)" /></svg>
		</div>`

	const size = titleSize(data.title)

	const htmlString = `
    <div style="display: flex; position: relative; width: 1200px; height: 630px; background: linear-gradient(135deg, #171a22, #0b0c10); overflow: hidden;">
        ${backdrop ? `<img src="${backdrop}" width="1200" height="630" style="position: absolute; top: 0; left: 0; width: 1200px; height: 630px; object-fit: cover; opacity: 0.55;" />` : ''}
        <div style="display: flex; position: absolute; top: 0; left: 0; width: 1200px; height: 630px; background: linear-gradient(100deg, rgba(8,9,12,0.15) 0%, rgba(8,9,12,0.7) 55%, rgba(8,9,12,0.9) 100%);"></div>
        <div style="display: flex; position: absolute; left: 0; top: 0; width: 640px; height: 630px; background: radial-gradient(60% 55% at 32% 78%, rgba(238,42,56,0.28), rgba(238,42,56,0));"></div>

        <!-- The ledge the cartridge stands on, as in the site's footer -->
        <div style="display: flex; flex-direction: column; position: absolute; left: 0; bottom: 0; width: 1200px; height: 58px; background: linear-gradient(180deg, #2c313c, #15181f);">
            <div style="display: flex; width: 1200px; height: 4px; background: #4a5060;"></div>
        </div>
        <div style="display: flex; position: absolute; left: 70px; top: 548px; width: 420px; height: 36px; background: radial-gradient(50% 50% at 50% 50%, rgba(0,0,0,0.6), rgba(0,0,0,0));"></div>

        <div style="display: flex; position: absolute; left: 130px; top: ${630 - 54 - cartH + 10}px; transform: rotate(-5deg); transform-origin: 50% 100%;">${cartridge}</div>

        <div style="display: flex; flex-direction: column; position: absolute; left: 540px; top: 54px; width: 604px; height: 456px;">
            <div style="display: flex; align-items: center; margin-bottom: 38px;">
                <div style="display: flex; flex-direction: column; width: 30px; height: 36px; border-radius: 7px; background: ${isSwitch2 ? '#b3101f' : '#17171b'}; padding: 4px 4px 7px 4px;">
                    <div style="display: flex; width: 22px; height: 24px; border-radius: 3px; background: #f4f4f2; flex-direction: column;"><div style="display: flex; width: 22px; height: 9px; background: #e4202f; border-radius: 3px 3px 0 0;"></div></div>
                </div>
                <div style="display: flex; font-size: 24px; font-weight: 700; color: rgba(255,255,255,0.9); margin-left: 14px; font-family: 'Inter';">Switch Performance</div>
            </div>
            <div style="display: flex; font-size: 22px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: rgba(255,255,255,0.7); margin-bottom: 16px; font-family: '${publisherFont.name}';">${publisher}</div>
            <div style="display: flex; font-size: ${size}px; font-weight: 700; line-height: 1.05; color: white; height: ${Math.round(size * 1.05 * 3)}px; overflow: hidden; font-family: '${titleFont.name}'; text-shadow: 0 4px 16px rgba(0,0,0,0.5);">${title}</div>
            <div style="display: flex; flex-direction: column; position: absolute; left: 0; top: 330px; width: 604px;">
                <div style="display: flex; align-items: center; margin-bottom: 14px;">
                    <div style="display: flex; width: 150px; font-size: 18px; font-weight: 700; letter-spacing: 3px; color: #ff6b76; font-family: 'Inter';">DOCKED</div>
                    <div style="display: flex; font-size: 32px; font-weight: 700; color: white; font-family: 'Inter';">${docked}</div>
                </div>
                <div style="display: flex; align-items: center;">
                    <div style="display: flex; width: 150px; font-size: 18px; font-weight: 700; letter-spacing: 3px; color: #ff6b76; font-family: 'Inter';">HANDHELD</div>
                    <div style="display: flex; font-size: 32px; font-weight: 700; color: white; font-family: 'Inter';">${handheld}</div>
                </div>
            </div>
        </div>

        <div style="display: flex; position: absolute; right: 56px; bottom: 16px; font-size: 22px; font-weight: 600; color: rgba(255,255,255,0.72); font-family: 'Inter';">switchperformance.biasedproject.com</div>
    </div>
    `

	const svg = await satori(toVdom(htmlString) as any, { width: 1200, height: 630, fonts })

	const png = new Resvg(svg, {
		fitTo: { mode: 'width', value: 1200 },
		font: { loadSystemFonts: false }
	}).render().asPng()

	// mozjpeg for the better encoder; chromaSubsampling off because the card
	// carries small, saturated text over a busy banner, which 4:2:0 smears
	return await sharp(Buffer.from(png))
		.jpeg({ quality: 88, mozjpeg: true, chromaSubsampling: '4:4:4' })
		.toBuffer()
}
