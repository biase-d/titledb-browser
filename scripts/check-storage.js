/**
 * Verify the object store from inside the container
 *
 *   docker exec -it <container> node scripts/check-storage.js
 *
 * Walks the same path the app uses - write, read back, list, delete - against
 * the S3_* variables the app itself reads, so a pass means the app can cache
 * images and a failure names which step broke rather than "images are slow"
 */
import 'dotenv/config'
import { createS3Adapter } from '../src/lib/storage/adapters/s3.js'

const required = ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']
const missing = required.filter(name => !process.env[name])

if (missing.length) {
	console.error(`Not configured. Missing: ${missing.join(', ')}`)
	console.error('Without these the app still serves every image, it just recomputes each one.')
	process.exit(1)
}

console.log(`endpoint : ${process.env.S3_ENDPOINT}`)
console.log(`bucket   : ${process.env.S3_BUCKET}`)
console.log(`region   : ${process.env.S3_REGION || 'garage (default)'}`)
console.log(`key id   : ${process.env.S3_ACCESS_KEY_ID.slice(0, 6)}…`)
console.log('')

const storage = createS3Adapter({
	endpoint: process.env.S3_ENDPOINT,
	bucket: process.env.S3_BUCKET,
	accessKeyId: process.env.S3_ACCESS_KEY_ID,
	secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
	region: process.env.S3_REGION,
	publicUrl: process.env.S3_PUBLIC_URL
})

// Namespaced away from the real caches so a run cannot disturb them
const key = `healthcheck/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.txt`
const payload = Buffer.from(`titledb-browser storage check ${new Date().toISOString()}`)

/** @param {string} label @param {() => Promise<any>} fn */
async function step (label, fn) {
	const start = Date.now()
	try {
		const result = await fn()
		console.log(`  ok    ${label.padEnd(22)} ${Date.now() - start}ms`)
		return result
	} catch (err) {
		console.error(`  FAIL  ${label.padEnd(22)} ${Date.now() - start}ms`)
		console.error(`\n        ${err instanceof Error ? err.message : String(err)}`)
		if (/credential|signature|AccessDenied|403/i.test(String(err))) {
			console.error('        Looks like the key, or its permissions on this bucket.')
		} else if (/ENOTFOUND|ECONNREFUSED|EAI_AGAIN|timed out/i.test(String(err))) {
			console.error('        Looks like the endpoint: wrong host, wrong port, or not on this network.')
			console.error('        Between containers use the service name, not localhost.')
		} else if (/NoSuchBucket|404/i.test(String(err))) {
			console.error('        The bucket does not exist, or this key cannot see it.')
		}
		process.exit(1)
	}
}

await step('write', () => storage.upload({ key, data: payload, contentType: 'text/plain' }))

const read = await step('read back', () => storage.get(key))
if (!read || Buffer.compare(read.body, payload) !== 0) {
	console.error('\nFAIL  the object read back does not match what was written')
	process.exit(1)
}
console.log(`  ok    contents match      ${payload.length} bytes`)

await step('list', () => storage.list('healthcheck/', 5))
await step('delete', () => storage.delete(key))

const gone = await step('confirm deleted', () => storage.get(key))
if (gone !== null) {
	console.error('\nFAIL  the object still reads back after delete')
	process.exit(1)
}

console.log('\nStorage is reachable and writable. Image and OG caches will persist.')
