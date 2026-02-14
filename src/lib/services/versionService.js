/**
 * @file Version Service
 * @description Manages application versioning and feature flags
 */

import { version } from '$app/environment';

/**
 * Get current version and feature flags
 * @returns {Object}
 */
export function getVersionInfo() {
    return {
        version: version || '3.0.0', // Fallback if not injected
        features: {
            newContributionFlow: true,
            gamification: false, // Planned feature
            cloudStorage: true,
            betaFlow: false // New multi-stage flow (User-controlled via Settings)
        },
        announcements: [
            {
                id: 'feature-adaptive-themes',
                date: '2026-02-14',
                message: 'Immersive Themes are here! Experience dynamic colors and blurred backgrounds based on game art.',
                type: 'feature',
                link: '/settings',
                active: true
            },
            {
                id: 'feature-beta-contributions',
                date: '2026-02-14',
                message: 'Beta Contribution Flow is live! Help the community by suggesting performance and graphics profiles.',
                type: 'success',
                link: '/contribute/upcoming',
                active: true
            },
            {
                id: 'feature-hero-refactor',
                date: '2026-01-16',
                message: 'New Hero design! Swipe on mobile to browse recent updates',
                type: 'feature',
                link: 'https://github.com/biase-d/titledb-browser/pull/42',
                active: false
            }
        ],
        lastUpdated: new Date().toISOString().split('T')[0]
    };
}

/**
 * Check if a feature is enabled
 * @param {string} featureName
 * @returns {boolean}
 */
export function isFeatureEnabled(featureName) {
    const info = getVersionInfo();
    return info.features[featureName] || false;
}

/**
 * Compare two semver-like version strings
 * @param {string} v1
 * @param {string} v2
 * @returns {number} 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(p => parseInt(p, 10));
    const parts2 = v2.split('.').map(p => parseInt(p, 10));
    const len = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < len; i++) {
        const n1 = parts1[i] || 0;
        const n2 = parts2[i] || 0;
        if (n1 > n2) return 1;
        if (n1 < n2) return -1;
    }
    return 0;
}

/**
 * Check if the current version is at least the required version
 * @param {string} requiredVersion
 * @returns {boolean}
 */
export function isVersionAtLeast(requiredVersion) {
    const { version: currentVersion } = getVersionInfo();
    return compareVersions(currentVersion, requiredVersion) >= 0;
}
