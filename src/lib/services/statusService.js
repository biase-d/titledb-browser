/**
 * @file Status Service
 * @description System health monitoring and status reporting
 */

import { sql } from 'drizzle-orm'
import logger from '$lib/services/loggerService'

/**
 * What a failing check actually means for someone using the site
 *
 * These strings are rendered on the public /status page and served from
 * /api/v1/status, so they describe impact rather than cause. The raw error is
 * logged instead of returned: driver text like `connect ECONNREFUSED 10.0.0.5:5432`
 * or `password authentication failed for user "..."` tells a visitor nothing
 * useful and leaks infrastructure detail
 *
 * @type {Record<string, { down: string, degraded: string }>}
 */
const IMPACT = {
	database: {
		down: 'Game data is unavailable right now. We are looking into it.',
		degraded: 'Game data is loading more slowly than usual.'
	},
	nintendoCdn: {
		down: 'Game artwork may not load. Everything else works as normal.',
		degraded: 'Game artwork may take longer than usual to load.'
	},
	github: {
		down: 'New contributions cannot be submitted right now. Browsing is unaffected.',
		degraded: 'Submitting a contribution may take longer than usual.'
	}
}

/**
 * Plain-language fallback for a service we have no specific copy for
 * @param {string} service
 * @param {'down'|'degraded'} level
 */
function impactOf (service, level) {
	return IMPACT[service]?.[level] ?? (level === 'degraded'
		? 'This part of the site is running slowly.'
		: 'This part of the site is unavailable right now.')
}

/** @param {unknown} e */
function toError (e) {
	return e instanceof Error ? e : new Error(String(e))
}

/**
 * Get comprehensive system health report
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @returns {Promise<Object>}
 */
export async function getSystemHealth (db) {
    const start = Date.now()

    const results = await Promise.allSettled([
        checkDatabase(db),
        checkExternalService('https://img-eshop.cdn.nintendo.net/i/ad1726955ae2cbddaaa0c531c836fd368c175f7302f9efab2c0f99118a53f2c4.jpg', 'nintendoCdn'),
        checkExternalService('https://github.com/biase-d/nx-performance/blob/38851298169a5b691fc1e62b977ea6955833c5f6/scripts/validate-data.sh', 'github')
    ])

    // A rejected check means the check itself threw, which is still an outage
    // from the reader's point of view - report it in the same language
    const [database, nintendoCdn, github] = ['database', 'nintendoCdn', 'github']
        .map((service, i) => {
            const result = results[i]
            if (result.status === 'fulfilled') return result.value

            logger.error(`Status check threw: ${service}`, toError(result.reason))
            return { status: 'down', message: impactOf(service, 'down'), latency: 0 }
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
        logger.error('Status check failed: database', toError(e))
        return { status: 'down', message: impactOf('database', 'down'), latency: Date.now() - start }
    }
}

/**
 * Check external service reachability
 * @param {string} url
 * @param {string} name - Key into IMPACT, and the field this result populates
 */
async function checkExternalService (url, name) {
    const start = Date.now()
    try {
        const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
        if (res.ok) {
            return { status: 'up', latency: Date.now() - start }
        }
        logger.warn(`Status check degraded: ${name} returned HTTP ${res.status}`)
        return { status: 'degraded', message: impactOf(name, 'degraded'), latency: Date.now() - start }
    } catch (e) {
        logger.error(`Status check failed: ${name}`, toError(e))
        return { status: 'down', message: impactOf(name, 'down'), latency: Date.now() - start }
    }
}
