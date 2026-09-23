import { describe, it, expect, vi, beforeEach } from 'vitest';

// The drafts store loads from IndexedDB at module scope. IndexedDB is not always
// available - private windows, blocked site data, a failed version upgrade - and
// a rejection there used to escape as an unhandled rejection on every page view
vi.mock('$app/environment', () => ({ browser: true }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

describe('drafts store with IndexedDB unavailable', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('loads as an empty store instead of rejecting', async () => {
        const rejections = [];
        const onRejection = (e) => rejections.push(e);
        process.on('unhandledRejection', onRejection);
        vi.spyOn(console, 'warn').mockImplementation(() => {});

        vi.doMock('$lib/indexedDB.js', () => ({
            getAllDrafts: () => Promise.reject(new Error('indexedDB is not defined')),
            saveDraft: vi.fn(),
            deleteDraft: vi.fn()
        }));

        const { draftsStore } = await import('../src/lib/stores/index.js');

        // let the module-scope init() settle
        await new Promise((resolve) => setTimeout(resolve, 0));

        let value;
        draftsStore.subscribe((v) => { value = v; })();

        expect(value).toEqual([]);
        expect(rejections).toHaveLength(0);
        expect(console.warn).toHaveBeenCalled();

        process.off('unhandledRejection', onRejection);
    });

    it('still loads drafts when IndexedDB works', async () => {
        const drafts = [{ id: '0100A3D000196000', data: { fps: 60 } }];

        vi.doMock('$lib/indexedDB.js', () => ({
            getAllDrafts: () => Promise.resolve(drafts),
            saveDraft: vi.fn(),
            deleteDraft: vi.fn()
        }));

        const { draftsStore } = await import('../src/lib/stores/index.js');
        await new Promise((resolve) => setTimeout(resolve, 0));

        let value;
        draftsStore.subscribe((v) => { value = v; })();

        expect(value).toEqual(drafts);
    });
});
