
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as contributionService from '../src/lib/services/ContributionService.js';
import * as githubRepo from '$lib/repositories/githubRepository';

vi.mock('$lib/repositories/githubRepository');

describe('Contribution Service', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(githubRepo.getRemoteJson).mockResolvedValue({ contributor: 'original', foo: 'bar' });
        vi.mocked(githubRepo.getRemoteSha).mockResolvedValue('sha123');
        vi.mocked(githubRepo.createPullRequest).mockResolvedValue({ url: 'http://pr', number: 1 });
    });

    it('should prepare file update appending contributor', async () => {
        const newData = { contributor: 'newGuy', baz: 'qux' };

        const result = await contributionService.prepareFileUpdate('path/to/file', newData, 'newGuy');

        const parsed = JSON.parse(result.content);
        expect(parsed.contributor).toContain('original');
        expect(parsed.contributor).toContain('newGuy');
        expect(parsed.baz).toBe('qux');
        expect(result.sha).toBe('sha123');
    });

    it('should prepare group update merging IDs', async () => {
        vi.mocked(githubRepo.getRemoteJson).mockResolvedValue(['id1', 'id2']);

        const result = await contributionService.prepareGroupUpdate('path', ['id3', 'id1']);

        const parsed = JSON.parse(result.content);
        expect(parsed).toEqual(['id1', 'id2', 'id3']); // sort checks?
        expect(parsed.length).toBe(3);
    });

    it('should submit contribution via PR', async () => {
        const prDetails = { title: 'Test PR', body: 'Body', files: [] };
        const result = await contributionService.submitContribution(prDetails, 'user1');
        expect(result.url).toBe('http://pr');
    });
});
