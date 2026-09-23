import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/services/loggerService', () => ({
    default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
}));

const { getSystemHealth } = await import('../src/lib/services/statusService.js');
const logger = (await import('$lib/services/loggerService')).default;

// The kind of text a real driver failure produces - names a host, a port and
// sometimes a database user
const DRIVER_ERROR = 'connect ECONNREFUSED 10.0.0.5:5432';
const AUTH_ERROR = 'password authentication failed for user "neondb_owner"';

/** @param {string} message */
const throwingDb = (message) => ({
    execute: () => Promise.reject(new Error(message))
});

const healthyDb = { execute: () => Promise.resolve([{ '?column?': 1 }]) };

describe('status messaging', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(null, { status: 200 })
        );
    });

    it('does not put driver error text in the database result', async () => {
        const health = await getSystemHealth(throwingDb(DRIVER_ERROR));
        const { database } = health.services;

        expect(database.status).toBe('down');
        expect(database.message).not.toContain('ECONNREFUSED');
        expect(database.message).not.toContain('10.0.0.5');
        expect(database.message).not.toContain('5432');
        expect(database.message).toBe(
            'Game data is unavailable right now. We are looking into it.'
        );
    });

    it('does not leak a database username', async () => {
        const health = await getSystemHealth(throwingDb(AUTH_ERROR));

        expect(health.services.database.message).not.toContain('neondb_owner');
        expect(health.services.database.message).not.toContain('password');
    });

    it('still logs the technical detail for us', async () => {
        await getSystemHealth(throwingDb(DRIVER_ERROR));

        expect(logger.error).toHaveBeenCalled();
        const [, loggedError] = logger.error.mock.calls[0];
        expect(loggedError.message).toBe(DRIVER_ERROR);
    });

    it('describes an unreachable external service by its impact', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('fetch failed'));

        const health = await getSystemHealth(healthyDb);

        expect(health.services.nintendoCdn.message).toBe(
            'Game artwork may not load. Everything else works as normal.'
        );
        expect(health.services.github.message).toBe(
            'New contributions cannot be submitted right now. Browsing is unaffected.'
        );
        expect(health.services.nintendoCdn.message).not.toContain('fetch failed');
    });

    it('does not surface a bare HTTP status code when a service is degraded', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(null, { status: 503 })
        );

        const health = await getSystemHealth(healthyDb);

        expect(health.services.nintendoCdn.status).toBe('degraded');
        expect(health.services.nintendoCdn.message).not.toContain('503');
        expect(health.services.nintendoCdn.message).toBe(
            'Game artwork may take longer than usual to load.'
        );
    });

    it('reports nothing at all when everything is up', async () => {
        const health = await getSystemHealth(healthyDb);

        for (const service of Object.values(health.services)) {
            expect(service.status).toBe('up');
            expect(service.message).toBeUndefined();
        }
    });
});

describe('status summary for monitors', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(null, { status: 200 })
        );
    });

    it('is up when everything answers', async () => {
        const health = await getSystemHealth(healthyDb);
        expect(health.status).toBe('up');
    });

    it('is down when the database is unreachable', async () => {
        const health = await getSystemHealth(throwingDb(DRIVER_ERROR));
        expect(health.status).toBe('down');
    });

    it('is only degraded when a dependency fails but the database is fine', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('fetch failed'));

        const health = await getSystemHealth(healthyDb);

        // Losing artwork or contributions is not the site being down
        expect(health.status).toBe('degraded');
    });
});
