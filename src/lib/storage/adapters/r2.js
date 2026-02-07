/**
 * @file Cloudflare R2 Storage Adapter
 * @description Storage adapter for Cloudflare R2 (S3-compatible object storage)
 */

/**
 * Create R2 storage adapter
 * @param {R2Bucket} bucket - R2 bucket binding from Cloudflare Workers environment
 * @returns {import('../types').StorageAdapter}
 */
export function createR2Adapter(bucket) {
    if (!bucket) {
        throw new Error('R2 bucket binding is required. Configure r2_buckets in wrangler.jsonc');
    }

    return {
        /**
         * Upload file to R2
         * @param {import('../types').UploadOptions} options
         * @returns {Promise<import('../types').UploadResult>}
         */
        async upload({ key, data, contentType, metadata = {}, public: isPublic, cacheControl }) {
            const httpMetadata = {
                contentType: contentType || 'application/octet-stream'
            };

            if (cacheControl) {
                httpMetadata.cacheControl = `public, max-age=${cacheControl}`;
            }

            const result = await bucket.put(key, data, {
                httpMetadata,
                customMetadata: metadata
            });

            return {
                key,
                url: isPublic ? getPublicUrl(bucket, key) : null,
                etag: result.etag,
                size: result.size || 0
            };
        },

        /**
         * Download file from R2
         * @param {string} key - File key
         * @returns {Promise<ArrayBuffer>}
         */
        async download(key) {
            const object = await bucket.get(key);

            if (!object) {
                throw new Error(`File not found in R2: ${key}`);
            }

            return await object.arrayBuffer();
        },

        /**
         * Delete file from R2
         * @param {string} key - File key
         * @returns {Promise<void>}
         */
        async delete(key) {
            await bucket.delete(key);
        },

        /**
         * List files in R2 bucket
         * @param {string} [prefix=''] - Filter by prefix
         * @param {number} [limit=1000] - Max results
         * @returns {Promise<import('../types').FileMetadata[]>}
         */
        async list(prefix = '', limit = 1000) {
            const listed = await bucket.list({
                prefix,
                limit
            });

            return listed.objects.map(obj => ({
                key: obj.key,
                size: obj.size,
                contentType: obj.httpMetadata?.contentType || 'application/octet-stream',
                lastModified: obj.uploaded,
                etag: obj.etag,
                customMetadata: obj.customMetadata
            }));
        },

        /**
         * Check if file exists in R2
         * @param {string} key - File key
         * @returns {Promise<boolean>}
         */
        async exists(key) {
            const object = await bucket.head(key);
            return object !== null;
        },

        /**
         * Get file URL (public or presigned)
         * @param {string} key - File key
         * @param {import('../types').UrlOptions} [options={}]
         * @returns {Promise<string>}
         */
        async getUrl(key, options = {}) {
            // R2 doesn't have built-in presigned URLs like S3
            // For now, return public URL
            // TODO: Implement presigned URLs via Worker with signed tokens
            return getPublicUrl(bucket, key);
        },

        /**
         * Get file metadata
         * @param {string} key - File key
         * @returns {Promise<import('../types').FileMetadata>}
         */
        async getMetadata(key) {
            const object = await bucket.head(key);

            if (!object) {
                throw new Error(`File not found in R2: ${key}`);
            }

            return {
                key: object.key,
                size: object.size,
                contentType: object.httpMetadata?.contentType || 'application/octet-stream',
                lastModified: object.uploaded,
                etag: object.etag,
                customMetadata: object.customMetadata
            };
        }
    };
}

/**
 * Get public URL for R2 object
 * @private
 */
function getPublicUrl(bucket, key) {
    // Use custom domain if configured, otherwise use R2.dev domain
    const publicDomain = process.env.R2_PUBLIC_DOMAIN;

    if (publicDomain) {
        return `https://${publicDomain}/${key}`;
    }

    // Fallback to R2.dev public URL (requires public bucket)
    const bucketName = process.env.R2_BUCKET_NAME || 'storage';
    const accountId = process.env.R2_ACCOUNT_ID || '';

    return `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${key}`;
}
