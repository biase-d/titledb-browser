import { describe, it, expect, vi, beforeEach } from 'vitest';
import { actions } from '../src/routes/contribute/[id]/+page.server.js';
import * as contributionService from '../src/lib/services/ContributionService.js';
import { GitHubService } from '../src/lib/services/GitHubService.js';

vi.mock('../src/lib/services/ContributionService.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    submitContribution: vi.fn().mockResolvedValue({ success: true, url: 'http://pr' })
  };
});

vi.mock('../src/lib/services/GitHubService.js', () => {
    return {
        GitHubService: {
            getFileSha: vi.fn().mockResolvedValue('sha123'),
            getJsonContent: vi.fn().mockResolvedValue(null)
        }
    };
});

describe('Contribution Form Action', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should_successfully_generate_pr_with_partial_graphics_payload', async () => {
        // A payload containing a YouTube link, regional game data, dynamic_resolution: true, triple_buffer: "unlocked", and null/empty baseline resolution fields.
        const graphicsData = {
            docked: {
                dynamic_resolution: true,
                triple_buffer: "unlocked",
                baseline_resolution: null
            },
            handheld: {}
        };
        
        const formData = new Map([
            ['titleId', '0100123456789000'],
            ['gameName', 'Test Game'],
            ['currentGroupId', '0100123456789000'],
            ['performanceData', '[]'],
            ['graphicsData', JSON.stringify(graphicsData)],
            ['youtubeLinks', '[{"url":"http://youtube.com","notes":""}]'],
            ['updatedGroupData', '[{"id":"0100123456789000","regions":["US"]}]'],
            ['originalGroupData', '[]'],
            ['originalPerformanceData', '[]'],
            ['originalGraphicsData', '{}'],
            ['originalYoutubeLinks', '[]'],
            ['shas', '{}']
        ]);

        const request = { formData: async () => formData };
        const locals = { getSession: async () => ({ user: { login: 'testuser' } }), db: {} };
        const cookies = { get: () => 'false' };

        const result = await actions.default({ request, locals, cookies });

        expect(result.success).toBe(true);
        expect(contributionService.submitContribution).toHaveBeenCalled();
        
        const submitArgs = contributionService.submitContribution.mock.calls[0][0];
        
        // Assert that the generated mock PR contains the correct JSON data structure representing the partial graphics settings
        const graphicsFile = submitArgs.files.find(f => f.path.startsWith('graphics/'));
        expect(graphicsFile).toBeDefined();
        
        // Format expectations: dynamic_resolution: true should be mapped to resolutionType: "Dynamic", etc.
        expect(graphicsFile.content).toContain('"resolutionType": "Dynamic"');
        expect(graphicsFile.content).toContain('"apiBuffering": "Triple"');
        expect(graphicsFile.content).toContain('"lockType": "Unlocked"');
    });
});
