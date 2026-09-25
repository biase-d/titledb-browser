/**
 * @file Status Service
 * @description System health monitoring and status reporting
 */

import { sql } from 'drizzle-orm'
import logger, { sendAlertEmail } from '$lib/services/loggerService'
import { notify } from '$lib/services/notifyService'
import { probeStorage } from '$lib/storage/health'

/**
 * The last verdict this process reported, so an outage is announced when it
 * starts rather than on every poll. A monitor hitting /api/v1/status every
 * minute would otherwise mean a mail every minute for as long as it lasted
 *
 * Per-process, which is right for a single container: were this ever scaled,
 * each replica would announce the outage it can see, which is still the truth
 * from where it sits
 * @type {'up'|'degraded'|'down'|null}
 */
let lastVerdict = null

/**
 * Mail on the way down and on the way back up
 *
 * Only for `down` - the site unable to serve at all. Degrading costs a feature:
 * artwork, or submitting a contribution, or image caching. Those are already
 * logged, and already reach the webhook when a check errors, and mailing on
 * them is how an inbox becomes something you stop reading
 *
 * @param {'up'|'degraded'|'down'} verdict
 * @param {Record<string, { status: string, message?: string }>} services
 */
async function announceVerdictChange (verdict, services) {
	const previous = lastVerdict
	lastVerdict = verdict

	// First check after a restart: nothing to compare against. Announcing an
	// outage here would fire on every deploy that lands while a dependency is
	// briefly unreachable
	if (previous === null) return

	if (verdict === 'down' && previous !== 'down') {
		const broken = Object.entries(services)
			.filter(([, check]) => check.status === 'down')
			.map(([name, check]) => `  ${name}: ${check.message ?? 'unreachable'}`)
			.join('\n')

		await sendAlertEmail({
			subject: '[DOWN] Switch Performance is not serving',
			text: `The site cannot serve requests.\n\nFailing:\n${broken}\n\n`
				+ `Checked at ${new Date().toISOString()}\n\n`
				+ 'This is sent once when the outage starts, not on every check. '
				+ 'A recovery message follows when it clears.'
		})
		await notify({
			event: 'dependency_down',
			title: 'Switch Performance is down',
			detail: broken,
			dedupeKey: 'verdict:down'
		})
		return
	}

	if (previous === 'down' && verdict !== 'down') {
		await sendAlertEmail({
			subject: '[RECOVERED] Switch Performance is serving again',
			text: `The site is answering again, now ${verdict}.\n\n`
				+ `Recovered at ${new Date().toISOString()}`
		})
		await notify({
			event: 'error',
			title: `Switch Performance recovered (now ${verdict})`,
			dedupeKey: 'verdict:recovered'
		})
	}
}

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
	},
	// Deliberately says nothing about which object store this is: the page is
	// public and the reader only cares what it costs them
	imageCache: {
		down: 'Images are being resized on every request, so pages may load more slowly.',
		degraded: 'Images are taking longer than usual to load.'
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
 * @typedef {Object} ServiceCheck
 * @property {'up'|'degraded'|'down'} status
 * @property {number} latency
 * @property {string} [message] - Present only on failure, and written for readers
 */

/**
 * @typedef {Object} SystemHealth
 * @property {'up'|'degraded'|'down'} status - Overall verdict, for monitors
 * @property {string} timestamp
 * @property {number} latency_ms
 * @property {{ database: ServiceCheck, nintendoCdn: ServiceCheck, github: ServiceCheck, imageCache: ServiceCheck }} services
 * @property {Object} system
 */

/**
 * Get comprehensive system health report
 * @param {import('$lib/database/types').DatabaseAdapter} db
 * @param {import('$lib/storage/types').StorageAdapter|null} [storage]
 * @returns {Promise<SystemHealth>}
 */
export async function getSystemHealth (db, storage = null) {
    const start = Date.now()

    const results = await Promise.allSettled([
        checkDatabase(db),
        checkExternalService('https://img-eshop.cdn.nintendo.net/i/ad1726955ae2cbddaaa0c531c836fd368c175f7302f9efab2c0f99118a53f2c4.jpg', 'nintendoCdn'),
        checkExternalService('https://github.com/biase-d/nx-performance/blob/38851298169a5b691fc1e62b977ea6955833c5f6/scripts/validate-data.sh', 'github'),
        checkImageCache(storage)
    ])

    // A rejected check means the check itself threw, which is still an outage
    // from the reader's point of view - report it in the same language
    const [database, nintendoCdn, github, imageCache] = ['database', 'nintendoCdn', 'github', 'imageCache']
        .map((service, i) => {
            const result = results[i]
            if (result.status === 'fulfilled') return result.value

            logger.error(`Status check threw: ${service}`, toError(result.reason))
            return { status: 'down', message: impactOf(service, 'down'), latency: 0 }
        })

    const verdict = summarise({ database, nintendoCdn, github, imageCache })

    // Not awaited: a monitor polling this endpoint should not wait on SMTP.
    // Node keeps the process alive until it settles, and both paths swallow
    // their own failures
    announceVerdictChange(verdict, { database, nintendoCdn, github, imageCache })
        .catch(() => {})

    return {
        // One field for a monitor to branch on. The database being unreachable
        // means the site cannot serve anything, so that alone is 'down'; a
        // failing CDN or GitHub costs artwork or contributions but leaves the
        // site usable, so those only ever degrade it
        status: verdict,
        timestamp: new Date().toISOString(),
        latency_ms: Date.now() - start,
        services: {
            database,
            nintendoCdn,
            github,
            imageCache
        },
        system: {
            uptime: process.uptime(),
            node_version: process.version,
            memory: process.memoryUsage()
        }
    }
}

/**
 * Roll the individual checks up into one overall state
 * @param {Record<string, { status: string }>} services
 * @returns {'up'|'degraded'|'down'}
 */
function summarise (services) {
	if (services.database.status === 'down') return 'down'

	// A storage outage costs caching, not correctness - every image is still
	// served, just recomputed - so it degrades and never takes the site down.
	// 'not-configured' is a deployment choice, not a fault, so it reads as up
	const checks = [services.database, services.nintendoCdn, services.github, services.imageCache]
	if (checks.some(s => s.status !== 'up' && s.status !== 'not-configured')) return 'degraded'

	return 'up'
}

/**
 * @param {import('$lib/storage/types').StorageAdapter|null} storage
 */
async function checkImageCache (storage) {
    const probe = await probeStorage(storage)
    if (probe.status === 'up') return { status: 'up', latency: probe.latency }
    if (probe.status === 'not-configured') return { status: 'not-configured', latency: 0 }

    logger.error('Status check failed: image cache', toError(new Error('Object store unreachable')))
    return { status: 'down', message: impactOf('imageCache', 'down'), latency: probe.latency }
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
