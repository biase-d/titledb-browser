/**
 * Pipeline entrypoint
 *
 * This is what the Coolify Scheduled Task runs:
 *   node scripts/build.js                 incremental sync
 *   node scripts/build.js --full-rebuild   rebuild into the standby schema, then swap
 *   node scripts/build.js --no-cache       ignore the cached contributor map
 */
import 'dotenv/config'
import { runPipeline } from '../src/lib/services/pipelineService.js'
import { PipelineBusyError } from '../src/lib/pipeline/lock.js'

const isFullRebuild = process.argv.includes('--full-rebuild')
// Previously parsed nowhere, so `--no-cache` in the workflows did nothing
const noCache = process.argv.includes('--no-cache')

if (isFullRebuild) process.env.PIPELINE_FULL_REBUILD = 'true'
if (noCache) process.env.PIPELINE_NO_CACHE = 'true'

try {
	console.log(`Starting pipeline (full rebuild: ${isFullRebuild}, cache: ${!noCache})`)
	// runPipeline opens its own connection for the schema and lock work
	await runPipeline(undefined)
	console.log('Pipeline completed successfully.')
	process.exit(0)
} catch (error) {
	if (error instanceof PipelineBusyError) {
		// Not a failure: the scheduled task overlapped a run that is already
		// going. Exiting 0 keeps it out of the alerting path
		console.log('A pipeline run is already in progress, exiting.')
		process.exit(0)
	}
	console.error('Pipeline failed:', error)
	process.exit(1)
}
