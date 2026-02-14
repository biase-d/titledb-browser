import { extractTheme } from '../utils/theme';

class ThemeStore {
    /**
     * @type {{ primary: string, accent: string, overlay: string } | null}
     */
    colors = $state(null);
    /**
     * @type {string | null}
     */
    backgroundImage = $state(null);
    isActive = $state(false);

    /**
     * @param {string | null} colorSource
     * @param {string | null} [backgroundUrl]
     */
    async setTheme(colorSource, backgroundUrl) {
        console.log('[ThemeStore] Setting theme for:', colorSource);
        if (!colorSource) {
            this.clearTheme();
            return;
        }

        const theme = await extractTheme(colorSource);
        if (theme) {
            console.log('[ThemeStore] Theme extracted and applying:', theme);
            this.colors = theme;
            this.backgroundImage = backgroundUrl || colorSource;
            this.isActive = true;
        } else {
            console.warn('[ThemeStore] Failed to extract theme');
        }
    }

    clearTheme() {
        console.log('[ThemeStore] Clearing theme');
        this.colors = null;
        this.backgroundImage = null;
        this.isActive = false;
    }
}

export const themeStore = new ThemeStore();
