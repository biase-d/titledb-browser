import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sql } from 'drizzle-orm'

const sendAlertEmail = vi.fn().mockResolvedValue(true)
const notify = vi.fn().mockResolvedValue(true)

vi.mock('$app/environment', () => ({ browser: false, dev: false, building: false, version: 'test' }))
vi.mock('$lib/services/loggerService', () => ({
	default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
	sendAlertEmail
}))
vi.mock('$lib/services/notifyService', () => ({ notify }))

const { getSystemHealth } = await import('../src/lib/services/statusService.js')

const healthyDb = { execute: vi.fn().mockResolvedValue([{ '?column?': 1 }]) }
const deadDb = { execute: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) }

/** Mail on the transition, not on every poll: a monitor checks every minute */
describe('Outage alerting', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }))
	})

	it('says nothing on the very first check, whatever it finds', async () => {
		const health = await getSystemHealth(deadDb)
		expect(health.status).toBe('down')
		// A restart during a blip would otherwise alert on every deploy
		expect(sendAlertEmail).not.toHaveBeenCalled()
	})

	it('mails once when the site goes down', async () => {
		await getSystemHealth(healthyDb)          // establishes 'up'
		sendAlertEmail.mockClear()

		await getSystemHealth(deadDb)

		expect(sendAlertEmail).toHaveBeenCalledTimes(1)
		const { subject, text } = sendAlertEmail.mock.calls[0][0]
		expect(subject).toContain('[DOWN]')
		expect(text).toContain('database')
	})

	it('does not mail again while the outage continues', async () => {
		await getSystemHealth(healthyDb)
		await getSystemHealth(deadDb)
		sendAlertEmail.mockClear()

		await getSystemHealth(deadDb)
		await getSystemHealth(deadDb)

		expect(sendAlertEmail).not.toHaveBeenCalled()
	})

	it('mails when it recovers', async () => {
		await getSystemHealth(healthyDb)
		await getSystemHealth(deadDb)
		sendAlertEmail.mockClear()

		await getSystemHealth(healthyDb)

		expect(sendAlertEmail).toHaveBeenCalledTimes(1)
		expect(sendAlertEmail.mock.calls[0][0].subject).toContain('[RECOVERED]')
	})

	it('does not mail for degraded, only for down', async () => {
		await getSystemHealth(healthyDb)
		sendAlertEmail.mockClear()

		// CDN and GitHub unreachable: a feature is lost, the site is not
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('fetch failed'))
		const health = await getSystemHealth(healthyDb)

		expect(health.status).toBe('degraded')
		expect(sendAlertEmail).not.toHaveBeenCalled()
	})

	it('a slow mail never delays the status response', async () => {
		await getSystemHealth(healthyDb)
		sendAlertEmail.mockImplementation(() => new Promise(() => {}))   // never settles

		const started = Date.now()
		const health = await getSystemHealth(deadDb)

		expect(health.status).toBe('down')
		expect(Date.now() - started).toBeLessThan(1000)
	})
})
