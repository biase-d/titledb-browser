/**
 * @file Platform Adapter
 * @description Runtime information for the health report
 */

/**
 * Describe the runtime the server is on. Reported by /api/health, so it is
 * useful for confirming which Node a container is actually running
 * @returns {{ type: string, runtime: string, nodeVersion?: string, platform?: string }}
 */
export function getPlatformInfo () {
	return {
		type: 'nodejs',
		runtime: 'node',
		nodeVersion: process.versions?.node,
		platform: process.platform
	}
}
