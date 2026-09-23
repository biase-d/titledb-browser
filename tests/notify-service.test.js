import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ENV = {};
vi.mock('$env/dynamic/private', () => ({ env: ENV }));

const { notify, resetNotifyThrottle } = await import('../src/lib/services/notifyService.js');

const WEBHOOK = 'https://n8n.example.com/webhook/titledb';

describe('notify', () => {
    beforeEach(() => {
        resetNotifyThrottle();
        for (const k of Object.keys(ENV)) delete ENV[k];
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('does nothing when no webhook is configured', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');

        const sent = await notify({ event: 'error', title: 'Boom' });

        expect(sent).toBe(false);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('posts a structured event a workflow can branch on', async () => {
        ENV.N8N_WEBHOOK_URL = WEBHOOK;
        const fetchSpy = vi.spyOn(globalThis, 'fetch')
            .mockResolvedValue(new Response(null, { status: 200 }));

        const sent = await notify({
            event: 'dependency_down',
            title: 'Database unreachable',
            detail: 'connect ECONNREFUSED 10.0.0.5:5432',
            context: { service: 'database' }
        });

        expect(sent).toBe(true);
        const [calledUrl, init] = fetchSpy.mock.calls[0];
        expect(calledUrl).toBe(WEBHOOK);
        expect(init.method).toBe('POST');

        const body = JSON.parse(init.body);
        expect(body.source).toBe('titledb-browser');
        expect(body.event).toBe('dependency_down');
        expect(body.severity).toBe('critical');
        expect(body.title).toBe('Database unreachable');
        expect(body.context).toEqual({ service: 'database' });
        expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('marks a degraded dependency as a warning, not critical', async () => {
        ENV.N8N_WEBHOOK_URL = WEBHOOK;
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));

        await notify({ event: 'dependency_degraded', title: 'CDN slow' });

        const body = JSON.parse(vi.mocked(globalThis.fetch).mock.calls[0][1].body);
        expect(body.severity).toBe('warning');
    });

    it('sends an auth header when a token is set', async () => {
        ENV.N8N_WEBHOOK_URL = WEBHOOK;
        ENV.N8N_WEBHOOK_TOKEN = 'secret-token';
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));

        await notify({ event: 'error', title: 'Boom' });

        const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
        expect(init.headers.Authorization).toBe('Bearer secret-token');
    });

    it('drops repeats of the same alert inside the throttle window', async () => {
        ENV.N8N_WEBHOOK_URL = WEBHOOK;
        const fetchSpy = vi.spyOn(globalThis, 'fetch')
            .mockResolvedValue(new Response(null, { status: 200 }));

        expect(await notify({ event: 'error', title: 'Same thing' })).toBe(true);
        expect(await notify({ event: 'error', title: 'Same thing' })).toBe(false);
        expect(await notify({ event: 'error', title: 'Something else' })).toBe(true);

        expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('lets the next occurrence retry after a failed send', async () => {
        ENV.N8N_WEBHOOK_URL = WEBHOOK;
        const fetchSpy = vi.spyOn(globalThis, 'fetch')
            .mockResolvedValueOnce(new Response(null, { status: 500 }))
            .mockResolvedValueOnce(new Response(null, { status: 200 }));

        expect(await notify({ event: 'error', title: 'Retry me' })).toBe(false);
        expect(await notify({ event: 'error', title: 'Retry me' })).toBe(true);
        expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('never throws when the webhook is unreachable', async () => {
        ENV.N8N_WEBHOOK_URL = WEBHOOK;
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));

        await expect(notify({ event: 'error', title: 'Boom' })).resolves.toBe(false);
    });
});
