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
	dockedText: string;
	handheldText: string;
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

	const title = escapeHtml(data.title)
	const publisher = escapeHtml(data.publisher || 'Nintendo Switch')
	const docked = escapeHtml(data.dockedText)
	const handheld = escapeHtml(data.handheldText)
	const banner = encodeURI(data.bannerUrl || '')

	const htmlString = `
    <div style="display: flex; width: 1200px; height: 630px; background-color: #0d1117; position: relative; overflow: hidden;">
        ${banner ? `<img src="${banner}" width="1200" height="630" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; transform: scale(1.05);" />` : ''}
        <div style="display: flex; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 100%);"></div>
        <div style="display: flex; flex-direction: column; justify-content: flex-end; width: 100%; height: 100%; padding: 60px; position: relative;">
            <div style="display: flex; flex-direction: column; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 24px; padding: 40px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
                <div style="display: flex; align-items: center; margin-bottom: 16px;">
                    <div style="display: flex; background: #3b82f6; color: white; padding: 6px 16px; border-radius: 50px; font-size: 20px; font-weight: 700; font-family: '${publisherFont.name}';">
                        ${publisher}
                    </div>
                </div>
                <div style="display: flex; font-size: 64px; font-weight: 700; color: white; line-height: 1.1; margin-bottom: 32px; font-family: '${titleFont.name}'; text-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                    ${title}
                </div>
                <div style="display: flex; gap: 40px;">
                    <div style="display: flex; flex-direction: column; border-left: 4px solid #3b82f6; padding-left: 20px;">
                        <div style="display: flex; font-size: 24px; color: rgba(255,255,255,0.7); font-family: 'Inter'; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                            Docked
                        </div>
                        <div style="display: flex; font-size: 36px; font-weight: 700; color: white; font-family: 'Inter';">
                            ${docked}
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; border-left: 4px solid #ef4444; padding-left: 20px;">
                        <div style="display: flex; font-size: 24px; color: rgba(255,255,255,0.7); font-family: 'Inter'; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                            Handheld
                        </div>
                        <div style="display: flex; font-size: 36px; font-weight: 700; color: white; font-family: 'Inter';">
                            ${handheld}
                        </div>
                    </div>
                </div>
            </div>
            <div style="display: flex; justify-content: flex-end; margin-top: 30px; opacity: 0.6;">
                <div style="display: flex; font-size: 24px; color: white; font-family: 'Inter'; font-weight: 600;">
                    switchperformance.biasedproject.com
                </div>
            </div>
        </div>
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
