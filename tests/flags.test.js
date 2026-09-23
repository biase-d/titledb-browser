import { describe, it, expect } from 'vitest';
import { getFlagIcon, isSquareFlagIcon, getCountryName } from '../src/lib/flags.js';

// 'circle-flags' keys these four two-letter names by ISO 639 language rather than
// ISO 3166-1 country, and carries no country flag under any other name, so they
// must resolve to the strictly-ISO 'flag' set instead
const COLLIDING = ['AR', 'IE', 'IO', 'LA'];

describe('getFlagIcon', () => {
    it('uses circle-flags for codes that set resolves correctly', () => {
        expect(getFlagIcon('US')).toBe('circle-flags:us');
        expect(getFlagIcon('JP')).toBe('circle-flags:jp');
        expect(getFlagIcon('GB')).toBe('circle-flags:gb');
        expect(getFlagIcon('SA')).toBe('circle-flags:sa');
    });

    it('avoids circle-flags for codes it maps to a language flag', () => {
        for (const code of COLLIDING) {
            expect(getFlagIcon(code)).toBe(`flag:${code.toLowerCase()}-1x1`);
        }
    });

    it('does not confuse Argentina with Saudi Arabia', () => {
        expect(getFlagIcon('AR')).not.toBe(getFlagIcon('SA'));
        expect(getFlagIcon('AR')).toBe('flag:ar-1x1');
    });

    it('accepts lowercase codes', () => {
        expect(getFlagIcon('ie')).toBe('flag:ie-1x1');
        expect(getFlagIcon('de')).toBe('circle-flags:de');
    });

    it('falls back to a globe for a missing code', () => {
        expect(getFlagIcon('')).toBe('mdi:earth');
        expect(getFlagIcon(undefined)).toBe('mdi:earth');
    });
});

describe('isSquareFlagIcon', () => {
    it('is true only for the square fallbacks', () => {
        for (const code of COLLIDING) {
            expect(isSquareFlagIcon(code)).toBe(true);
        }
        expect(isSquareFlagIcon('US')).toBe(false);
        expect(isSquareFlagIcon('')).toBe(false);
    });

    it('agrees with the icon set getFlagIcon picked', () => {
        for (const code of [...COLLIDING, 'US', 'JP', 'DE', 'BR', 'ZA']) {
            expect(isSquareFlagIcon(code)).toBe(getFlagIcon(code).startsWith('flag:'));
        }
    });
});

describe('getCountryName', () => {
    it('resolves the affected codes to the right countries', () => {
        expect(getCountryName('AR')).toBe('Argentina');
        expect(getCountryName('IE')).toBe('Ireland');
        expect(getCountryName('SA')).toBe('Saudi Arabia');
    });
});
