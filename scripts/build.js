import 'dotenv/config';
import { runPipeline } from '../src/lib/services/pipelineService.js';

(async () => {
    try {
        const isFullRebuild = process.argv.includes('--full-rebuild');
        if (isFullRebuild) {
            process.env.PIPELINE_FULL_REBUILD = 'true';
        }

        console.log(`Starting local pipeline execution (Full Rebuild: ${isFullRebuild})...`);
        // We pass undefined for the db parameter here because runPipeline handles
        // setting up its own raw postgres client for the schema operations.
        // It'll fall back to its internal drizzle instance just fine.
        await runPipeline(undefined);
        console.log('Local pipeline execution completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Local pipeline execution failed:', error);
        process.exit(1);
    }
})();