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
        version: version || '0.1.0', // Fallback if not injected
        features: {
            newContributionFlow: true,
            gamification: false, // Planned feature
            cloudStorage: true
        },
        announcements: [
            {
                id: 'maintenance-2023-10-27',
                date: '2023-10-27',
                message: 'Scheduled maintenance: The site will be read-only on Oct 28th for database upgrades.',
                type: 'warning',
                link: 'https://github.com/biase-d/titledb-browser/issues/1',
                active: false // Expired
            },
            {
                id: 'feature-hero-refactor',
                date: '2026-01-16',
                message: 'New Hero design! Swipe on mobile to browse recent updates.',
                type: 'feature',
                link: 'https://github.com/biase-d/titledb-browser/pull/42',
                active: true
            }
        ],
        lastUpdated: new Date().toISOString().split('T')[0] // Just date part
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
