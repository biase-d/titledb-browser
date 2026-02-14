/**
 * @file Platform Adapter
 * @description Platform detection and environment utilities
 */

/**
 * Detect the current runtime platform
 * @returns {'cloudflare-workers' | 'nodejs'| 'unknown'}
 */
export function detectPlatform() {
    // Cloudflare Workers detection
    if (typeof caches !== 'undefined' && caches.default) {
        return 'cloudflare-workers';
    }

    // Another Cloudflare Workers check
    if (typeof Request !== 'undefined' && typeof Response !== 'undefined' && typeof crypto !== 'undefined') {
        // Check for Workers-specific global
        if (typeof WorkerGlobalScope !== 'undefined' || globalThis.navigator?.userAgent === 'Cloudflare-Workers') {
            return 'cloudflare-workers';
        }
    }

    // Node.js detection
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        return 'nodejs';
    }

    return 'unknown';
}

/**
 * Get environment variable with platform awareness
 * @param {string} key - Environment variable name
 * @param {string} [defaultValue] - Default value if not found
 * @param {Object} [platform] - Platform context from SvelteKit
 * @returns {string | undefined}
 */
export function getEnv(key, defaultValue, platform) {
    // Cloudflare Workers: Check platform.env first
    if (platform?.env && platform.env[key]) {
        return platform.env[key];
    }

    // Node.js: Check process.env
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
        return process.env[key];
    }

    return defaultValue;
}

/**
 * Get platform-specific information
 * @param {Object} [platform] - SvelteKit platform context
 * @returns {Object} Platform information
 */
export function getPlatformInfo(platform) {
    const type = detectPlatform();

    const info = {
        type,
        runtime: type === 'cloudflare-workers' ? 'workerd' : 'node'
    };

    // Cloudflare-specific info
    if (type === 'cloudflare-workers' && platform?.cf) {
        info.region = platform.cf.colo; // Cloudflare data center
        info.country = platform.cf.country;
        info.city = platform.cf.city;
    }

    // Node.js-specific info
    if (type === 'nodejs') {
        info.nodeVersion = process.versions?.node;
        info.platform = process.platform;
    }

    return info;
}

/**
 * Check if running in Cloudflare Workers
 * @returns {boolean}
 */
export function isCloudflareWorkers() {
    return detectPlatform() === 'cloudflare-workers';
}

/**
 * Check if running in Node.js
 * @returns {boolean}
 */
export function isNodeJS() {
    return detectPlatform() === 'nodejs';
}
