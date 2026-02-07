/**
 * @typedef {Object} PlayabilityScore
 * @property {string} score - 'Perfect', 'Great', 'Playable', 'Rough'
 * @property {string} label - Display label
 * @property {string} color - Color class/value (e.g., 'text-green-500')
 * @property {string} description - Brief explanation why
 */

/**
 * Calculate the playability score based on performance profile
 * @param {Object} profile - A single profile object (e.g. from performance_profiles.profiles array)
 * @returns {PlayabilityScore}
 */
export function calculatePlayabilityScore(profile) {
    if (!profile) return { score: 'Unknown', label: 'Unknown', color: 'text-gray-500', description: 'No data available' };

    const { docked, handheld, compatibility } = profile;
    const fps = docked?.target_fps || handheld?.target_fps; // Prioritize docked, fallback to handheld
    const fpsBehavior = docked?.fps_stability || handheld?.fps_stability || 'Stable';

    // Check for "Perfect"
    // Criteria: 60FPS Stable AND (Native resolution OR >= 720p handheld/1080p docked)
    if (fps === 60 && fpsBehavior === 'Locked') {
        return {
            score: 'Perfect',
            label: 'Perfect',
            color: 'text-green-400',
            description: 'Runs at a locked 60FPS.'
        };
    }

    // Check for "Great"
    // Criteria: 30FPS Stable OR 60FPS with minor drops or dynamic res
    if ((fps === 30 && fpsBehavior === 'Locked') || (fps === 60 && fpsBehavior === 'Stable')) {
        return {
            score: 'Great',
            label: 'Great',
            color: 'text-blue-400',
            description: 'Solid performance. Either locked 30FPS or mostly stable 60FPS.'
        };
    }

    // Check for "Playable"
    // Criteria: 30FPS Stable/Unstable but playable
    if ((fps === 30 && fpsBehavior === 'Stable') || fpsBehavior === 'Unstable') {
        return {
            score: 'Playable',
            label: 'Playable',
            color: 'text-yellow-400',
            description: 'Playable, but may experience frame drops or lower resolution.'
        };
    }

    // Default to "Rough"
    return {
        score: 'Rough',
        label: 'Rough',
        color: 'text-red-400',
        description: 'Performance issues, potential crashes, or very low framerate.'
    };
}
