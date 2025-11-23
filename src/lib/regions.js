/**
 * Maps country codes to human-readable
 * Prioritizes specific sub-regions and common cross-regional pairings
 * 
 * @param {string[]} regions - Array of country codes (e.g. ['US', 'JP'])
 * @returns {string|null} - The formatted label or null if empty
 */
export function getRegionLabel(regions) {
	if (!regions || !Array.isArray(regions) || regions.length === 0) return null;

	const set = new Set(regions);
	const count = set.size;

	if (count === 1) {
		const code = regions[0];
        if (code === 'KR') return 'Korea';
        if (code === 'US') return 'USA';
        if (code === 'GB') return 'UK';
        if (code === 'HK') return 'Hong Kong';
		const name = new Intl.DisplayNames(['en'], { type: 'region' }).of(code);
		return name || code;
	}

    const northAmerica = new Set(['US', 'CA', 'MX']);
    const southAmerica = new Set(['BR', 'AR', 'CL', 'CO', 'PE', 'CR', 'GT', 'HN', 'NI', 'PA', 'PY', 'UY', 'EC', 'SV', 'BO', 'DO']);
    
    const nordic = new Set(['SE', 'NO', 'DK', 'FI']);
    const dach = new Set(['DE', 'AT', 'CH']); 
    const benelux = new Set(['BE', 'NL', 'LU']);
    const iberia = new Set(['ES', 'PT']);
    const britishIsles = new Set(['GB', 'IE']);
    
    const oceania = new Set(['AU', 'NZ']);
    const eastAsia = new Set(['HK', 'TW', 'KR', 'CN', 'MO', 'JP']);
    const southeastAsia = new Set(['SG', 'TH', 'MY']);
    const africa = new Set(['ZA']);

    const americas = new Set([...northAmerica, ...southAmerica]);
    const europe = new Set(['GB', 'FR', 'DE', 'IT', 'ES', 'NL', 'PT', 'RU', 'AT', 'BE', 'BG', 'CH', 'CY', 'CZ', 'DK', 'EE', 'FI', 'GR', 'HR', 'HU', 'IE', 'IL', 'LT', 'LU', 'LV', 'MT', 'NO', 'PL', 'RO', 'SE', 'SI', 'SK']); 

    const isStrict = (/** @type {Set<string>} */ targetSet) => regions.every(r => targetSet.has(r));

    if (isStrict(nordic)) return 'Nordic';
    if (isStrict(dach)) return 'Germany & Austria';
    if (isStrict(benelux)) return 'Benelux';
    if (isStrict(iberia)) return 'Iberia';
    if (isStrict(britishIsles)) return 'UK & Ireland';

    if (isStrict(northAmerica)) return 'North America';
    if (isStrict(southAmerica)) return 'South America';

    if (isStrict(oceania)) return 'Australia & New Zealand';
    
    if (isStrict(eastAsia)) {
        if (set.has('JP') && count > 1) return 'Japan & East Asia';
        if (!set.has('JP')) return 'East Asia';
    }
    if (isStrict(southeastAsia)) return 'Southeast Asia';
    
    if (isStrict(new Set([...eastAsia, ...southeastAsia]))) return 'Asia';
    if (isStrict(americas)) return 'The Americas';
    if (isStrict(europe)) return 'Europe';
    if (isStrict(africa)) return 'Africa';

    const hasNorthAmerica = regions.some(r => northAmerica.has(r));
    const hasEurope = regions.some(r => europe.has(r));
    const hasJapan = set.has('JP');
    const hasAsia = regions.some(r => eastAsia.has(r) && r !== 'JP');

    if (count === 2 && set.has('US') && set.has('JP')) return 'USA & Japan';
    if (isStrict(new Set([...northAmerica, 'JP']))) return 'North America & Japan';

    if (hasNorthAmerica && hasEurope && !hasJapan && !hasAsia) {
        return 'Western';
    }

    if (hasNorthAmerica && hasEurope && hasJapan) {
        return 'Worldwide';
    }

    if (isStrict(new Set([...europe, ...oceania]))) return 'Europe & Oceania';

    if (hasEurope && (hasJapan || hasAsia) && !hasNorthAmerica) {
        return 'Europe & Asia';
    }

    if (hasNorthAmerica && (hasJapan || hasAsia) && !hasEurope) {
        return 'Americas & Asia';
    }

    if (hasNorthAmerica && hasEurope) {
        return 'International';
    }

	if (count <= 3) return regions.join(', ');
    
    return 'Multi-Region';
}