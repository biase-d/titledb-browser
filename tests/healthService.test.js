
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as healthService from '../src/lib/services/healthService.js';

vi.mock('$app/environment', () => ({
    browser: false,
    dev: false,
    building: false,
    version: '1.0.0'
}));

vi.mock('$lib/platform/adapter', () => ({
    getPlatformInfo: vi.fn().mockReturnValue({ type: 'nodejs', runtime: 'node' })
}));

describe('Health Service', () => {
    let dbMock;
    let storageMock;

    beforeEach(() => {
        vi.clearAllMocks();

        dbMock = {
            execute: vi.fn().mockResolvedValue([])
        };

        storageMock = {
            list: vi.fn().mockResolvedValue([])
        };
    });

    it('should report healthy status when db works and storage is present', async () => {
        const result = await healthService.checkHealth(dbMock, storageMock);

        expect(result.status).toBe('healthy');
        expect(result.services.database.status).toBe('healthy');
        // 'up' means the probe actually reached the store. It used to report
        // 'configured', which only meant an adapter object existed and stayed
        // true with wrong credentials or an unreachable host
        expect(result.services.storage.status).toBe('up');
        expect(storageMock.list).toHaveBeenCalled();
        expect(result.services.platform).toEqual({ type: 'nodejs', runtime: 'node' });
        expect(dbMock.execute).toHaveBeenCalled();
    });

    it('should report unhealthy/degraded if db check fails', async () => {
        const error = new Error('Connection failed');
        dbMock.execute.mockRejectedValue(error);

        const result = await healthService.checkHealth(dbMock, storageMock);

        expect(result.status).toBe('degraded');
        expect(result.services.database.status).toBe('unhealthy');
    });

    it('should report storage as not-configured if missing', async () => {
        const result = await healthService.checkHealth(dbMock, null);

        expect(result.status).toBe('healthy');
        expect(result.services.storage.status).toBe('not-configured');
    });

    it('reports storage down when the store cannot be reached', async () => {
        storageMock.list.mockRejectedValue(new Error('ECONNREFUSED'));

        const result = await healthService.checkHealth(dbMock, storageMock);

        expect(result.services.storage.status).toBe('down');
        // Storage is a cache: losing it costs speed, not correctness, so it
        // must not drag the overall verdict down with it
        expect(result.status).toBe('healthy');
    });
});
