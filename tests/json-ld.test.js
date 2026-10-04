import { describe, it, expect } from 'vitest';
import { serializeJsonLd } from '../src/lib/jsonLd.js';

describe('serializeJsonLd', () => {
    it('produces valid JSON', () => {
        const data = { '@context': 'https://schema.org', '@type': 'VideoGame', name: 'Celeste' };
        expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
    });

    it('cannot break out of the surrounding script tag', () => {
        const evil = '</script><img src=x onerror=alert(1)>';
        const out = serializeJsonLd({ name: evil });

        expect(out).not.toContain('</script>');
        expect(out).not.toContain('<img');
        // still the same value once parsed
        expect(JSON.parse(out).name).toBe(evil);
    });

    it('escapes every angle bracket, not just a closing tag', () => {
        const out = serializeJsonLd({ name: 'a < b', description: '<b>bold</b>' });

        expect(out).not.toContain('<');
        expect(out).toContain('\\u003c');
        expect(JSON.parse(out).description).toBe('<b>bold</b>');
    });

    it('handles quotes and backslashes that naive escaping would miss', () => {
        const name = 'Ori and the Will of the Wisps "Deluxe" \\ Edition';
        expect(JSON.parse(serializeJsonLd({ name })).name).toBe(name);
    });
});
