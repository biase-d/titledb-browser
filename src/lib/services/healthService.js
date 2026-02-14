/**
 * @file Health Service
 * @description Logic for checking system health and component status
 */

import { sql } from 'drizzle-orm';
import { getPlatformInfo } from '$lib/platform/adapter';

/**
 * Check health of all system components
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {import('$lib/storage/types').StorageAdapter|null} storage
 * @param {Object} platform
 * @returns {Promise<Object>}
 */
export async function checkHealth(db, storage, platform) {
    const start = globalThis.performance.now(); // Use globalThis for platform compatibility

    // Check Database
    let dbStatus = 'unknown';
    let dbLatency = 0;
    try {
        const dbStart = globalThis.performance.now();
        // Execute simple query to verify connection
        // Using drizzle's execute for raw SQL if available, or a simple select
        await db.execute(sql`SELECT 1`);
        dbLatency = globalThis.performance.now() - dbStart;
        dbStatus = 'healthy';
    } catch (e) {
        dbStatus = 'unhealthy';
        console.error('DB Health Check Failed:', e);
    }

    // Check Storage
    let storageStatus = 'not-configured';
    if (storage) {
        storageStatus = 'configured';
        // We assume configured means mostly healthy to avoid high latency/cost on health check
        // Could verify environment vars here
    }

    const info = getPlatformInfo(platform);

    return {
        status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
        latency: Math.round(globalThis.performance.now() - start),
        services: {
            database: { status: dbStatus, latency: Math.round(dbLatency) + 'ms' },
            storage: { status: storageStatus },
            platform: info
        },
        timestamp: new Date().toISOString()
    };
}
