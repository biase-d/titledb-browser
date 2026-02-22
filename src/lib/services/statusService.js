/**
 * @file Status Service
 * @description System health monitoring and status reporting
 */

import { sql } from 'drizzle-orm'

/**
 * Get comprehensive system health report
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @returns {Promise<Object>}
 */
export async function getSystemHealth (db) {
    const start = Date.now()

    const results = await Promise.allSettled([
        checkDatabase(db),
        checkExternalService('https://img-eshop.cdn.nintendo.net/i/ad1726955ae2cbddaaa0c531c836fd368c175f7302f9efab2c0f99118a53f2c4.jpg', 'eshop cdn'),
        checkExternalService('https://github.com/biase-d/nx-performance/blob/38851298169a5b691fc1e62b977ea6955833c5f6/scripts/validate-data.sh', 'nx-performance-repo')
    ])

    const [database, nintendoCdn, github] = results.map(r => r.status === 'fulfilled' ? r.value : {
        status: 'down',
        message: 'Service check failed',
        latency: 0
    })

    return {
        timestamp: new Date().toISOString(),
        latency_ms: Date.now() - start,
        services: {
            database,
            nintendoCdn,
            github
        },
        system: {
            uptime: process.uptime(),
            node_version: process.version,
            memory: process.memoryUsage()
        }
    }
}

/**
 * Check database connectivity
 * @param {import('$lib/database/types').DatabaseAdapter} db
 */
async function checkDatabase (db) {
    const start = Date.now()
    try {
        await db.execute(sql`SELECT 1`)
        return { status: 'up', latency: Date.now() - start }
    } catch (e) {
        return { status: 'down', message: e instanceof Error ? e.message : 'Unknown error', latency: Date.now() - start }
    }
}

/**
 * Check external service reachability
 * @param {string} url
 * @param {string} name
 */
async function checkExternalService (url, _name) {
    const start = Date.now()
    try {
        const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
        if (res.ok) {
            return { status: 'up', latency: Date.now() - start }
        }
        return { status: 'degraded', message: `HTTP ${res.status}`, latency: Date.now() - start }
    } catch (e) {
        return { status: 'down', message: e instanceof Error ? e.message : 'Fetch failed', latency: Date.now() - start }
    }
}
