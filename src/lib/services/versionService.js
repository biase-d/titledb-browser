/**
 * @file Version Service
 * @description Manages application versioning and feature flags
 */

import { version } from '$app/environment'

/**
 * @typedef {Object} Announcement
 * @property {string} id
 * @property {string} date
 * @property {string} message
 * @property {string} type
 * @property {string} [link]
 * @property {boolean} active
 */

/**
 * @typedef {Object} VersionInfo
 * @property {string} version
 * @property {Object.<string, boolean>} features
 * @property {Announcement[]} announcements
 * @property {string} lastUpdated
 */

/**
 * Get current version and feature flags
 * @returns {VersionInfo}
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
				id: 'feature-contribute-status',
				date: '2026-02-15',
				message: 'Community Power! The Contribute page has been redesigned with impact stats, and we\'ve added a new System Status dashboard for transparency.',
				type: 'success',
				link: '/contribute',
				active: true
			},
			{
				id: 'feature-personalization',
				date: '2026-02-15',
				message: 'Brand Your Identity! Choose a favorite site color during onboarding or in settings, and enjoy a more compact country selector.',
				type: 'feature',
				link: '/settings#appearance',
				active: true
			},
			{
				id: 'feature-performance-hero',
				date: '2026-02-14',
				message: 'Instant Insights! The Hero section now displays FPS and resolution data for your favorite games.',
				type: 'feature',
				active: true
			},
			{
				id: 'feature-light-mode-polish',
				date: '2026-02-14',
				message: 'Shiny & New! We\'ve polished Light Mode for better contrast and a smoother day-time experience.',
				type: 'success',
				active: true
			},
			{
				id: 'feature-beta-refinements',
				date: '2026-02-14',
				message: 'Enhanced Contributions! The Beta Workflow is now more robust with improved verification and feedback.',
				type: 'feature',
				link: '/settings#beta',
				active: true
			},
			{
				id: 'feature-image-optimization',
				date: '2026-02-15',
				message: 'Faster Loading! We now optimize and cache game images locally. You can toggle high-resolution images in settings if you prefer full quality.',
				type: 'feature',
				link: '/settings#appearance',
				active: true
			}
		],
		lastUpdated: new Date().toISOString().split('T')[0]
	}
}

/**
 * Check if a feature is enabled
 * @param {string} featureName
 * @returns {boolean}
 */
export function isFeatureEnabled(featureName) {
	const info = getVersionInfo()
	return info.features[featureName] || false
}

/**
 * Compare two semver-like version strings
 * @param {string} v1
 * @param {string} v2
 * @returns {number} 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export function compareVersions(v1, v2) {
	const parts1 = v1.split('.').map(p => parseInt(p, 10))
	const parts2 = v2.split('.').map(p => parseInt(p, 10))
	const len = Math.max(parts1.length, parts2.length)

	for (let i = 0; i < len; i++) {
		const n1 = parts1[i] || 0
		const n2 = parts2[i] || 0
		if (n1 > n2) return 1
		if (n1 < n2) return -1
	}
	return 0
}

/**
 * Check if the current version is at least the required version
 * @param {string} requiredVersion
 * @returns {boolean}
 */
export function isVersionAtLeast(requiredVersion) {
	const { version: currentVersion } = getVersionInfo()
	return compareVersions(currentVersion, requiredVersion) >= 0
}
