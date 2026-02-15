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
export async function getSystemHealth(db) {
    const start = Date.now()

    const results = await Promise.allSettled([
        checkDatabase(db),
        checkExternalService('https://img-eshop.cdn.nintendo.net/i/333917865768565a5078502a514d50514a51475734504a5746413954564c483149595232', 'Nintendo CDN'),
        checkExternalService('https://raw.githubusercontent.com/titledb/titledb.github.io/master/VERSION', 'GitHub TitleDB')
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
async function checkDatabase(db) {
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
async function checkExternalService(url, name) {
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
