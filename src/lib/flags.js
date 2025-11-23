/**
 * Converts a 2-letter country code to a flag emoji
 * @param {string} countryCode 
 * @returns {string}
 */
export function getFlagEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) return '🌐';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char =>  127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

/**
 * Gets the full country name from a code
 * @param {string} code 
 * @returns {string}
 */
export function getCountryName(code) {
    try {
        return new Intl.DisplayNames(['en'], { type: 'region' }).of(code);
    } catch (e) {
        return code;
    }
}