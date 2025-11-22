/**
 * Maps a list of country codes to a human-readable region label
 * Aligned with Switch System Settings categories:
 * - Japan
 * - The Americas
 * - Europe
 * - Australia / New Zealand
 * - Hong Kong / Taiwan / South Korea
 * 
 * @param {string[]} regions - Array of country codes (e.g. ['US', 'JP'])
 * @returns {string|null} - The formatted label or null if empty
 */
export function getRegionLabel(regions) {
	if (!regions || !Array.isArray(regions) || regions.length === 0) return null;

	const set = new Set(regions);
	const count = set.size;

	const americas = new Set([
		'US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'CR', 'GT', 'HN', 'NI', 'PA', 'PY', 'UY', 'EC', 'SV', 'BO', 'DO'
	]);
	
	const europe = new Set([
		'GB', 'FR', 'DE', 'IT', 'ES', 'NL', 'PT', 'RU', 'ZA', 
		'AT', 'BE', 'BG', 'CH', 'CY', 'CZ', 'DK', 'EE', 'FI', 'GR', 'HR', 'HU', 'IE', 
		'IL', 'LT', 'LU', 'LV', 'MT', 'NO', 'PL', 'RO', 'SE', 'SI', 'SK'
	]);

	const oceania = new Set(['AU', 'NZ']);
	
	const eastAsia = new Set(['HK', 'TW', 'KR']);
	
	const japan = 'JP';

	const hasAmericas = regions.some(c => americas.has(c));
	const hasEurope = regions.some(c => europe.has(c));
	const hasOceania = regions.some(c => oceania.has(c));
	const hasEastAsia = regions.some(c => eastAsia.has(c));
	const hasJapan = set.has(japan);

	// WORLDWIDE: Americas + Europe + Japan
	if (hasAmericas && hasEurope && hasJapan) {
		return 'Worldwide';
	}

	// WESTERN: Americas + Europe
	if (hasAmericas && hasEurope && !hasJapan && !hasEastAsia) {
		return 'Western';
	}

	// JAPAN & ASIA: Common grouping for releases covering JP + HK/TW/KR
	if (!hasAmericas && !hasEurope && hasJapan && hasEastAsia) {
		return 'Japan & East Asia';
	}

	// JAPAN
	if (hasJapan && !hasAmericas && !hasEurope && !hasEastAsia && !hasOceania) {
		return 'Japan';
	}

	// THE AMERICAS
	if (hasAmericas && !hasEurope && !hasJapan && !hasEastAsia && !hasOceania) {
		return 'The Americas';
	}

	// HONG KONG / TAIWAN / SOUTH KOREA
	if (hasEastAsia && !hasAmericas && !hasEurope && !hasJapan && !hasOceania) {
		return 'Hong Kong / Taiwan / South Korea';
	}

	// AUSTRALIA / NEW ZEALAND
	if (hasOceania && !hasAmericas && !hasEurope && !hasJapan && !hasEastAsia) {
		return 'Australia / New Zealand';
	}

	// EUROPE
	if (hasEurope && !hasAmericas && !hasJapan && !hasEastAsia) {
		return 'Europe';
	}

	if (count <= 3) {
		return regions.join(', ');
	}

	return 'Global';
}