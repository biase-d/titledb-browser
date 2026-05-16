import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../src/routes/api/v1/pipeline/run/+server.js';
import * as pipelineService from '../src/lib/services/pipelineService.js';

vi.mock('../src/lib/services/pipelineService.js', () => ({
    runPipeline: vi.fn().mockResolvedValue({ success: true })
}));

describe('Pipeline API Route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.PIPELINE_SECRET = 'test-secret';
    });

    it('should reject requests with missing authorization', async () => {
        const request = new Request('http://localhost/api/v1/pipeline/run', { method: 'POST' });
        const response = await POST({ request });
        
        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error).toBe('Unauthorized');
    });

    it('should reject requests with invalid authorization', async () => {
        const request = new Request('http://localhost/api/v1/pipeline/run', { 
            method: 'POST',
            headers: { 'Authorization': 'Bearer wrong-token' }
        });
        const response = await POST({ request });
        
        expect(response.status).toBe(403);
    });

    it('should execute pipeline sequentially on valid request', async () => {
        const request = new Request('http://localhost/api/v1/pipeline/run', { 
            method: 'POST',
            headers: { 'Authorization': 'Bearer test-secret' }
        });

        // Set env variable for test
        process.env.PIPELINE_SECRET = 'test-secret';

        const locals = { db: {} };
        const response = await POST({ request, locals });
        
        expect(response.status).toBe(200);
        expect(pipelineService.runPipeline).toHaveBeenCalledTimes(1);
        
        const data = await response.json();
        expect(data.success).toBe(true);
    });
});
