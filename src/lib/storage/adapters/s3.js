/**
 * @file S3 Storage Adapter
 * @description Storage adapter for Garage, and for any other S3-compatible store
 *
 * Garage is addressed path-style (`endpoint/bucket/key`) because virtual-host
 * style would need a wildcard DNS record per bucket. `region` is whatever the
 * Garage cluster was configured with — it is not an AWS region and the signature
 * only has to agree with the server
 */

import {
	S3Client,
	GetObjectCommand,
	PutObjectCommand,
	DeleteObjectCommand,
	HeadObjectCommand,
	ListObjectsV2Command
} from '@aws-sdk/client-s3'

/** @param {import('stream').Readable | ReadableStream | Blob} body */
async function toBuffer (body) {
	if (body instanceof Blob) return Buffer.from(await body.arrayBuffer())
	// @ts-ignore - the AWS SDK attaches this helper to Node streams
	if (typeof body?.transformToByteArray === 'function') {
		// @ts-ignore
		return Buffer.from(await body.transformToByteArray())
	}
	const chunks = []
	// @ts-ignore - Node Readable is async-iterable
	for await (const chunk of body) chunks.push(Buffer.from(chunk))
	return Buffer.concat(chunks)
}

/** @param {unknown} err */
function isNotFound (err) {
	const e = /** @type {any} */ (err)
	return e?.name === 'NoSuchKey' || e?.name === 'NotFound' || e?.$metadata?.httpStatusCode === 404
}

/**
 * @param {Object} config
 * @param {string} config.endpoint - e.g. http://garage:3900
 * @param {string} config.bucket
 * @param {string} config.accessKeyId
 * @param {string} config.secretAccessKey
 * @param {string} [config.region='garage']
 * @param {string} [config.publicUrl] - Base URL of Garage's web endpoint, when the bucket is exposed
 * @returns {import('../types').StorageAdapter}
 */
export function createS3Adapter (config) {
	const { endpoint, bucket, accessKeyId, secretAccessKey, region = 'garage', publicUrl } = config

	if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
		throw new Error('S3 storage needs S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY')
	}

	const client = new S3Client({
		endpoint,
		region,
		forcePathStyle: true,
		credentials: { accessKeyId, secretAccessKey }
	})

	return {
		/**
		 * @param {import('../types').UploadOptions} options
		 * @returns {Promise<import('../types').UploadResult>}
		 */
		async upload ({ key, data, contentType, metadata, cacheControl }) {
			const body = data instanceof ArrayBuffer ? Buffer.from(data)
				: Buffer.isBuffer(data) ? data
					: Buffer.from(await (/** @type {Blob} */ (data)).arrayBuffer())

			const result = await client.send(new PutObjectCommand({
				Bucket: bucket,
				Key: key,
				Body: body,
				ContentType: contentType,
				CacheControl: cacheControl ? `public, max-age=${cacheControl}` : undefined,
				Metadata: /** @type {Record<string, string>} */ (metadata)
			}))

			return {
				key,
				url: publicUrl ? `${publicUrl.replace(/\/$/, '')}/${key}` : undefined,
				etag: result.ETag ?? '',
				size: body.byteLength
			}
		},

		/**
		 * Fetch bytes and content type in one round trip, or null when absent.
		 * The cache read path uses this instead of exists() + download(), which
		 * would pay two round trips for every hit
		 * @param {string} key
		 * @returns {Promise<{ body: Buffer, contentType: string|undefined, etag: string|undefined } | null>}
		 */
		async get (key) {
			try {
				const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
				return {
					body: await toBuffer(/** @type {any} */ (result.Body)),
					contentType: result.ContentType,
					etag: result.ETag
				}
			} catch (err) {
				if (isNotFound(err)) return null
				throw err
			}
		},

		/** @param {string} key */
		async download (key) {
			const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
			const buffer = await toBuffer(/** @type {any} */ (result.Body))
			return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
		},

		/** @param {string} key */
		async delete (key) {
			await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
		},

		/**
		 * @param {string} [prefix]
		 * @param {number} [limit]
		 */
		async list (prefix = '', limit = 1000) {
			const result = await client.send(new ListObjectsV2Command({
				Bucket: bucket,
				Prefix: prefix,
				MaxKeys: limit
			}))

			return (result.Contents ?? []).map(object => ({
				key: object.Key ?? '',
				size: object.Size ?? 0,
				contentType: 'application/octet-stream',
				lastModified: object.LastModified ?? new Date(0),
				etag: object.ETag ?? ''
			}))
		},

		/** @param {string} key */
		async exists (key) {
			try {
				await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
				return true
			} catch (err) {
				if (isNotFound(err)) return false
				throw err
			}
		},

		/** @param {string} key */
		async getUrl (key) {
			return publicUrl
				? `${publicUrl.replace(/\/$/, '')}/${key}`
				: `${endpoint.replace(/\/$/, '')}/${bucket}/${key}`
		},

		/** @param {string} key */
		async getMetadata (key) {
			const result = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))

			return {
				key,
				size: result.ContentLength ?? 0,
				contentType: result.ContentType ?? 'application/octet-stream',
				lastModified: result.LastModified ?? new Date(0),
				etag: result.ETag ?? '',
				customMetadata: result.Metadata ?? {}
			}
		}
	}
}
