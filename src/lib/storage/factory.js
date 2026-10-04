/**
 * @file Storage Factory
 * @description Creates the storage adapter from the environment
 */

import { createS3Adapter } from './adapters/s3.js'
import { createLocalAdapter } from './adapters/local.js'
import { dev } from '$app/environment'
import logger from '$lib/services/loggerService'

/**
 * @param {any} env - Environment variables
 * @returns {import('./types').StorageAdapter | null}
 */
export function createStorage (env) {
	// Garage, or any other S3-compatible store
	if (env.S3_ENDPOINT && env.S3_BUCKET) {
		logger.info('Using S3 storage', { endpoint: env.S3_ENDPOINT, bucket: env.S3_BUCKET })
		return createS3Adapter({
			endpoint: env.S3_ENDPOINT,
			bucket: env.S3_BUCKET,
			accessKeyId: env.S3_ACCESS_KEY_ID,
			secretAccessKey: env.S3_SECRET_ACCESS_KEY,
			region: env.S3_REGION,
			publicUrl: env.S3_PUBLIC_URL
		})
	}

	// Filesystem, so development needs no object store running
	if (dev || env.NODE_ENV === 'development') {
		logger.info('Using local filesystem storage (development)')
		return createLocalAdapter({ basePath: env.STORAGE_PATH || './storage' })
	}

	// Storage is optional: the derived-asset caches fall back to recomputing
	logger.warn('No storage configured. Image and OG caches will not persist.')
	return null
}

/**
 * @param {any} env - Environment variables
 * @returns {import('./types').StorageProvider}
 */
export function detectStorageProvider (env) {
	if (env.S3_ENDPOINT && env.S3_BUCKET) return 's3'
	if (dev || env.NODE_ENV === 'development') return 'local'
	return 'none'
}
