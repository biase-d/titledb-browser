import { html } from 'satori-html';
import satori from 'satori';
import { Resvg, initWasm } from '@resvg/resvg-wasm';

let initialized = false;
const init = async () => {
    if (initialized) return;
    try {
        const res = await fetch('https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm');
        if (!res.ok) throw new Error('Failed to load WASM');
        await initWasm(res);
        initialized = true;
    } catch (e: any) {
        if (e.message && e.message.includes('Already initialized')) {
            initialized = true;
            return;
        }
        console.error('OG Image WASM Init Failed:', e);
        throw e;
    }
};

async function fetchBuffer(url: string) {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return await res.arrayBuffer();
    } catch { return null; }
}

async function fetchDynamicFont(family: string, text: string) {
    try {
        const API = `https://fonts.googleapis.com/css2?family=${family}:wght@700&text=${encodeURIComponent(text)}`;
        const cssReq = await fetch(API, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36' }
        });
        
        if (cssReq.ok) {
            const css = await cssReq.text();
            const resource = css.match(/src:\s*url\((['"]?)(.*?)\1\)/);
            if (resource && resource[2]) {
                return await fetchBuffer(resource[2]);
            }
        }

        console.warn(`Subsetting failed for ${family}, trying fallback...`);
        return null;
    } catch (e) {
        return null;
    }
}

async function getTitleFont(text: string, fallbackBuffer: ArrayBuffer) {
    const isKorean = /[\uAC00-\uD7AF\u1100-\u11FF]/.test(text);
    const isJapanese = /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
    const isChinese = /[\u4E00-\u9FFF]/.test(text);

    let fontName = 'Inter';
    let fontBuffer = null;

    if (isJapanese) fontBuffer = await fetchDynamicFont('Noto+Sans+JP', text);
    else if (isKorean) fontBuffer = await fetchDynamicFont('Noto+Sans+KR', text);
    else if (isChinese) fontBuffer = await fetchDynamicFont('Noto+Sans+SC', text);

    if (!fontBuffer) {
        return { name: 'Inter', data: fallbackBuffer, weight: 700 };
    }

    return { name: isJapanese ? 'Noto Sans JP' : isKorean ? 'Noto Sans KR' : 'Noto Sans SC', data: fontBuffer, weight: 700 };
}

export interface OgData {
    title: string;
    publisher: string;
    bannerUrl: string;
    dockedText: string;
    handheldText: string;
}

export async function generateOgImage(data: OgData): Promise<Buffer> {
    await init();

    const [interRegular, interBold] = await Promise.all([
        fetchBuffer('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.18/files/inter-latin-400-normal.woff'),
        fetchBuffer('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.18/files/inter-latin-700-normal.woff')
    ]);

    if (!interRegular || !interBold) throw new Error("Failed to load base fonts");

    const titleFont = await getTitleFont(data.title, interBold);

    const template = html(`
    <div style="display: flex; width: 1200px; height: 630px; background-color: #0d1117; position: relative; overflow: hidden;">
        <img src="${data.bannerUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; filter: blur(8px); opacity: 0.6; transform: scale(1.05);" />
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
                    switch-performance.com
                </div>
            </div>
        </div>
    </div>
    `);

    const svg = await satori(template, {
        width: 1200,
        height: 630,
        fonts: [
            { name: titleFont.name, data: titleFont.data as ArrayBuffer, weight: 700, style: 'normal' },
            { name: 'Inter', data: interRegular, weight: 400, style: 'normal' },
            { name: 'Inter', data: interBold, weight: 700, style: 'normal' }
        ]
    });

    const resvg = new Resvg(svg);
    const pngData = resvg.render();
    return Buffer.from(pngData.asPng());
}
