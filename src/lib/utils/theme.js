/**
 * Extracts a dominant color from an image URL.
 * @param {string} imageUrl
 * @returns {Promise<{ primary: string, accent: string, overlay: string } | null>}
 */
export async function extractTheme(imageUrl) {
    if (!imageUrl) return null;

    // Use internal proxy to bypass CORS for external assets
    let proxyUrl = imageUrl;
    if (imageUrl.includes('nintendo.net') || imageUrl.includes('githubusercontent.com')) {
        proxyUrl = `/api/v1/proxy/image?url=${encodeURIComponent(imageUrl)}`;
    }

    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = proxyUrl;

        img.onload = () => {
            console.log('[ThemeEngine] Image loaded successfully:', imageUrl);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(null);
                return;
            }

            // Downscale for performance
            const size = 50;
            canvas.width = size;
            canvas.height = size;

            try {
                ctx.drawImage(img, 0, 0, size, size);
                const imageData = ctx.getImageData(0, 0, size, size).data;

                let r = 0, g = 0, b = 0, count = 0;

                for (let i = 0; i < imageData.length; i += 4) {
                    const alpha = imageData[i + 3];
                    if (alpha < 128) continue; // Skip semi-transparent

                    const pixelR = imageData[i];
                    const pixelG = imageData[i + 1];
                    const pixelB = imageData[i + 2];

                    // Very dark or very light pixels are less useful for themes
                    const brightness = (pixelR + pixelG + pixelB) / 3;
                    if (brightness < 10 || brightness > 245) continue;

                    r += pixelR;
                    g += pixelG;
                    b += pixelB;
                    count++;
                }

                console.log(`[ThemeEngine] Processed ${count} valid pixels out of ${imageData.length / 4}`);

                if (count === 0) {
                    console.warn('[ThemeEngine] No valid pixels found, using fallback');
                    const fallback = {
                        primary: 'var(--color-primary-dark)',
                        accent: 'rgba(128, 128, 128, 0.1)',
                        overlay: 'rgba(0, 0, 0, 0.6)'
                    };
                    resolve(fallback);
                    return;
                }

                r = Math.floor(r / count);
                g = Math.floor(g / count);
                b = Math.floor(b / count);

                const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

                let primary = `rgb(${r}, ${g}, ${b})`;
                let accent = `rgba(${r}, ${g}, ${b}, 0.15)`;
                let overlay = `rgba(${Math.floor(r * 0.1)}, ${Math.floor(g * 0.1)}, ${Math.floor(b * 0.1)}, 0.7)`;

                if (!isDarkMode) {
                    // In light mode, we might need to darken the color to ensure it's readable as an accent/primary
                    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                    if (brightness > 160) {
                        const factor = 0.6;
                        r = Math.floor(r * factor);
                        g = Math.floor(g * factor);
                        b = Math.floor(b * factor);
                        primary = `rgb(${r}, ${g}, ${b})`;
                    }
                    accent = `rgba(${r}, ${g}, ${b}, 0.12)`;
                    overlay = `rgba(255, 255, 255, 0.85)`; // Light mode uses light overlay
                }

                const theme = { primary, accent, overlay };

                console.log('[ThemeEngine] Extracted theme:', theme);
                resolve(theme);
            } catch (e) {
                console.error('[ThemeEngine] Failed to extract colors:', e);
                resolve(null);
            }
        };

        img.onerror = (err) => {
            console.error('[ThemeEngine] Image failed to load (CORS issue?):', imageUrl, err);
            resolve(null);
        };
    });
}
