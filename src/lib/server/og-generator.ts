import { ImageResponse } from 'workers-og-custom'
import { html as toVdom } from 'satori-html'
import logger from '$lib/services/loggerService'

async function fetchBuffer (url: string, timeout = 5000) {
	const controller = new AbortController()
	const id = setTimeout(() => controller.abort(), timeout)

	try {
		logger.debug(`Fetching font: ${url}`, { url })
		const res = await fetch(url, { signal: controller.signal })
		clearTimeout(id)

		if (!res.ok) {
			logger.warn(`Failed to fetch font: ${url} (${res.status})`, { url, status: res.status })
			return null
		}
		return await res.arrayBuffer()
	} catch (e) {
		clearTimeout(id)
		const err = e instanceof Error ? e : new Error(String(e))
		logger.error(`Fetch error for ${url}`, err, { url })
		return null
	}
}

async function fetchDynamicFont (family: string, text: string) {
	try {
		const API = `https://fonts.googleapis.com/css2?family=${family}:wght@700&text=${encodeURIComponent(text)}`
		const cssReq = await fetch(API, {
			headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36' }
		})

		if (cssReq.ok) {
			const css = await cssReq.text()
			const resource = css.match(/src:\s*url\((['"]?)(.*?)\1\)/)
			if (resource && resource[2]) {
				return await fetchBuffer(resource[2])
			}
		}
		return null
	} catch (e) {
		return null
	}
}

async function getTitleFont (text: string, fallbackBuffer: ArrayBuffer) {
	const isKorean = /[\uAC00-\uD7AF\u1100-\u11FF]/.test(text)
	const isJapanese = /[\u3040-\u309F\u30A0-\u30FF]/.test(text)
	const isChinese = /[\u4E00-\u9FFF]/.test(text)

	let fontBuffer = null
	let fontName = 'Inter'

	if (isJapanese) {
		fontName = 'Noto Sans JP'
		fontBuffer = await fetchDynamicFont('Noto+Sans+JP', text)
	} else if (isKorean) {
		fontName = 'Noto Sans KR'
		fontBuffer = await fetchDynamicFont('Noto+Sans+KR', text)
	} else if (isChinese) {
		fontName = 'Noto Sans SC'
		fontBuffer = await fetchDynamicFont('Noto+Sans+SC', text)
	}

	if (!fontBuffer) {
		return { name: 'Inter', data: fallbackBuffer, weight: 700 }
	}

	return { name: fontName, data: fontBuffer, weight: 700 }
}

export interface OgData {
	title: string;
	publisher: string;
	bannerUrl: string;
	dockedText: string;
	handheldText: string;
}

export async function generateOgImage (data: OgData): Promise<Response> {
	logger.info('Starting OG image generation', { title: data.title })

	const [interRegular, interBold] = await Promise.all([
		fetchBuffer('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.18/files/inter-latin-400-normal.woff'),
		fetchBuffer('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.18/files/inter-latin-700-normal.woff')
	])

	if (!interRegular || !interBold) {
		throw new Error('Failed to load base fonts')
	}

	const titleFont = await getTitleFont(data.title, interBold)
	logger.info('Fonts loaded for OG image', { titleFont: titleFont.name })

	const htmlString = `
    <div style="display: flex; width: 1200px; height: 630px; background-color: #0d1117; position: relative; overflow: hidden;">
        <img src="${data.bannerUrl}" width="1200" height="630" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; opacity: 1; transform: scale(1.05);" />
        <div style="display: flex; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 100%);"></div>
        <div style="display: flex; flex-direction: column; justify-content: flex-end; width: 100%; height: 100%; padding: 60px; position: relative;">
            <div style="display: flex; flex-direction: column; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 24px; padding: 40px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
                <div style="display: flex; align-items: center; margin-bottom: 16px;">
                    <div style="display: flex; background: #3b82f6; color: white; padding: 6px 16px; border-radius: 50px; font-size: 20px; font-weight: 700; font-family: 'Inter';">
                        ${data.publisher || 'Nintendo Switch'}
                    </div>
                </div>
                <div style="display: flex; font-size: 64px; font-weight: 700; color: white; line-height: 1.1; margin-bottom: 32px; font-family: '${titleFont.name}'; text-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                    ${data.title}
                </div>
                <div style="display: flex; gap: 40px;">
                    <div style="display: flex; flex-direction: column; border-left: 4px solid #3b82f6; padding-left: 20px;">
                        <div style="display: flex; font-size: 24px; color: rgba(255,255,255,0.7); font-family: 'Inter'; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                            Docked
                        </div>
                        <div style="display: flex; font-size: 36px; font-weight: 700; color: white; font-family: 'Inter';">
                            ${data.dockedText}
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; border-left: 4px solid #ef4444; padding-left: 20px;">
                        <div style="display: flex; font-size: 24px; color: rgba(255,255,255,0.7); font-family: 'Inter'; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                            Handheld
                        </div>
                        <div style="display: flex; font-size: 36px; font-weight: 700; color: white; font-family: 'Inter';">
                            ${data.handheldText}
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

	const element = toVdom(htmlString)

	logger.info('Generating ImageResponse for OG image')

	return new ImageResponse(element, {
		width: 1200,
		height: 630,
		fonts: [
			{
				name: titleFont.name,
				data: titleFont.data as ArrayBuffer,
				weight: 700,
				style: 'normal',
			},
			{
				name: 'Inter',
				data: interRegular,
				weight: 400,
				style: 'normal'
			},
			{
				name: 'Inter',
				data: interBold,
				weight: 700,
				style: 'normal'
			}
		]
	})
}
