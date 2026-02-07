
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitConflictError, GitHubService } from '../src/lib/services/GitHubService.js';

const mockOctokit = vi.hoisted(() => ({
    repos: {
        getContent: vi.fn(),
        getBranch: vi.fn(),
    },
    git: {
        createRef: vi.fn(),
        createBlob: vi.fn(),
        createTree: vi.fn(),
        createCommit: vi.fn(),
        updateRef: vi.fn(),
        deleteRef: vi.fn(),
    },
    pulls: {
        create: vi.fn(),
    },
}));

vi.mock('@octokit/rest', () => {
    return {
        Octokit: class {
            constructor() {
                return mockOctokit;
            }
        }
    };
});

vi.mock('$env/static/private', () => ({
    GITHUB_BOT_TOKEN: 'mock-token',
}));

describe('GitHub Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getFileSha', () => {
        it('should return SHA when file exists', async () => {
            mockOctokit.repos.getContent.mockResolvedValue({
                data: { sha: 'test-sha', content: 'test' }
            });

            const sha = await GitHubService.getFileSha('path/to/file.json');
            expect(sha).toBe('test-sha');
            expect(mockOctokit.repos.getContent).toHaveBeenCalledWith({
                owner: 'biase-d',
                repo: 'nx-performance',
                path: 'path/to/file.json'
            });
        });

        it('should return null when file not found (404)', async () => {
            const error = new Error('Not Found');
            error.status = 404;
            mockOctokit.repos.getContent.mockRejectedValue(error);

            const sha = await GitHubService.getFileSha('path/missing.json');
            expect(sha).toBeNull();
        });

        it('should return null if result is array (directory)', async () => {
            mockOctokit.repos.getContent.mockResolvedValue({
                data: [{ name: 'file1' }]
            });

            const sha = await GitHubService.getFileSha('path/to/dir');
            expect(sha).toBeNull();
        });
    });

    describe('getJsonContent', () => {
        it('should return parsed JSON content', async () => {
            const jsonContent = JSON.stringify({ key: 'value' });
            const base64Content = Buffer.from(jsonContent).toString('base64');

            mockOctokit.repos.getContent.mockResolvedValue({
                data: { content: base64Content }
            });

            const result = await GitHubService.getJsonContent('data.json');
            expect(result).toEqual({ key: 'value' });
        });

        it('should return null on 404', async () => {
            const error = new Error('Not Found');
            error.status = 404;
            mockOctokit.repos.getContent.mockRejectedValue(error);

            const result = await GitHubService.getJsonContent('missing.json');
            expect(result).toBeNull();
        });
    });

    describe('createPullRequest', () => {
        const prParams = {
            branchName: 'test-branch',
            commitMessage: 'msg',
            prTitle: 'PR Title',
            prBody: 'Body',
            files: [{ path: 'file1.json', content: '{}' }]
        };

        beforeEach(() => {
            // Setup happy path defaults
            mockOctokit.repos.getBranch.mockResolvedValue({
                data: { commit: { sha: 'base-sha' } }
            });
            mockOctokit.git.createRef.mockResolvedValue({});
            mockOctokit.git.createBlob.mockResolvedValue({ data: { sha: 'blob-sha' } });
            mockOctokit.git.createTree.mockResolvedValue({ data: { sha: 'tree-sha' } });
            mockOctokit.git.createCommit.mockResolvedValue({ data: { sha: 'commit-sha' } });
            mockOctokit.git.updateRef.mockResolvedValue({});
            mockOctokit.pulls.create.mockResolvedValue({
                data: { html_url: 'http://pr-url' }
            });
        });

        it('should create a PR successfully', async () => {
            const url = await GitHubService.createPullRequest(prParams);

            expect(url).toBe('http://pr-url');
            expect(mockOctokit.git.createRef).toHaveBeenCalled();
            expect(mockOctokit.git.updateRef).toHaveBeenCalled();
            expect(mockOctokit.pulls.create).toHaveBeenCalled();
        });

        it('should handle git conflict (409) and throw GitConflictError', async () => {
            const error = new Error('Conflict');
            error.status = 409;
            mockOctokit.git.createRef.mockRejectedValue(error);

            await expect(GitHubService.createPullRequest(prParams))
                .rejects.toThrow(GitConflictError);

            expect(mockOctokit.git.deleteRef).toHaveBeenCalled();
        });

        it('should handle validation error (422) as conflict', async () => {
            const error = new Error('Unprocessable');
            error.status = 422;
            mockOctokit.git.createRef.mockRejectedValue(error);

            await expect(GitHubService.createPullRequest(prParams))
                .rejects.toThrow(GitConflictError);
        });
    });
});
