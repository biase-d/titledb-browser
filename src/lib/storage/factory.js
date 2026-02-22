/**
 * @file Storage Factory
 * @description Creates appropriate storage adapter based on environment and platform
 */

import { createR2Adapter } from './adapters/r2.js'
import { createVercelBlobAdapter } from './adapters/vercel-blob.js'
import { createLocalAdapter } from './adapters/local.js'
import { dev } from '$app/environment'
import logger from '$lib/services/loggerService'

/**
 * Create storage adapter based on environment
 * @param {any} env - Environment variables (process.env or Cloudflare env)
 * @param {any} [platform] - Platform context (SvelteKit platform object)
 * @returns {import('./types').StorageAdapter | null}
 */
export function createStorage (env, platform) {
	// Priority 1: Cloudflare Workers with R2 binding (preferred)
	if (platform?.env?.STORAGE || platform?.env?.R2_BUCKET) {
		const bucket = platform.env.STORAGE || platform.env.R2_BUCKET
		logger.info('Using Cloudflare R2', { platform: !!platform })
		return createR2Adapter(bucket)
	}

	// Priority 2: Vercel Blob Storage
	if (env.BLOB_READ_WRITE_TOKEN) {
		logger.info('Using Vercel Blob Storage')
		return createVercelBlobAdapter({
			token: env.BLOB_READ_WRITE_TOKEN
		})
	}

	// Priority 3: Local filesystem (development only)
	if (dev || env.NODE_ENV === 'development') {
		logger.info('Using local filesystem (development)')
		return createLocalAdapter({
			basePath: env.STORAGE_PATH || './storage'
		})
	}

	// No storage configured - this is OK, storage is optional
	logger.warn('No storage provider configured. File uploads will not work.')
	return null
}

/**
 * Detect storage provider type
 * @param {any} env - Environment variables
 * @param {any} [platform] - Platform context
 * @returns {import('./types').StorageProvider}
 */
export function detectStorageProvider (env, platform) {
	if (platform?.env?.STORAGE || platform?.env?.R2_BUCKET) {
		return 'r2'
	}

	if (env.BLOB_READ_WRITE_TOKEN) {
		return 'vercel-blob'
	}

	if (dev || env.NODE_ENV === 'development') {
		return 'local'
	}

	return 'none'
}
