import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import CountryFlag from '../src/lib/components/CountryFlag.svelte';
import { BUNDLED_FLAG_COUNT } from '../src/lib/flag-icons.js';
import { KNOWN_REGION_CODES } from '../src/lib/regions.js';

describe('CountryFlag', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('bundles an icon for every known region code', () => {
        expect(BUNDLED_FLAG_COUNT).toBe(KNOWN_REGION_CODES.length);
    });

    it('renders bundled flags without calling the Iconify API', () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));

        for (const code of ['US', 'JP', 'AR', 'IE', 'BR', 'ZA']) {
            const { container, unmount } = render(CountryFlag, { code });
            expect(container.querySelector('svg'), `no svg for ${code}`).toBeTruthy();
            unmount();
        }

        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('clips the square fallback icons into circles', () => {
        const { container: ar } = render(CountryFlag, { code: 'AR' });
        expect(ar.querySelector('.flag').className).toContain('square');

        const { container: us } = render(CountryFlag, { code: 'US' });
        expect(us.querySelector('.flag').className).not.toContain('square');
    });

    it('renders Argentina and Saudi Arabia as different flags', () => {
        const { container: ar } = render(CountryFlag, { code: 'AR' });
        const { container: sa } = render(CountryFlag, { code: 'SA' });
        expect(ar.querySelector('svg').innerHTML).not.toBe(sa.querySelector('svg')?.innerHTML ?? '');
    });
});
