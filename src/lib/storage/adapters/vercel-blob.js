/**
 * @file Vercel Blob Storage Adapter
 * @description Storage adapter for Vercel Blob Storage
 */

/**
 * Create Vercel Blob storage adapter
 * 
 * @param {Object} config
 * @param {string} config.token - Vercel Blob API token
 * @returns {import('../types').StorageAdapter}
 */
export function createVercelBlobAdapter(config) {
    const { token } = config;

    if (!token) {
        throw new Error('BLOB_READ_WRITE_TOKEN is required for Vercel Blob adapter');
    }

    return {
        /**
         * Upload file to Vercel Blob
         * @param {import('../types').UploadOptions} options
         * @returns {Promise<import('../types').UploadResult>}
         */
        async upload({ key, data, contentType, public: isPublic, cacheControl }) {
            const { put } = await import('@vercel/blob');
            const result = await put(key, data, {
                access: isPublic ? 'public' : 'private',
                contentType,
                token,
                addRandomSuffix: false,
                cacheControlMaxAge: cacheControl || 31536000
            });

            return {
                key: result.pathname,
                url: result.url,
                etag: result.pathname,
                size: result.size
            };
        },

        /**
         * Download file from Vercel Blob
         */
        async download(key) {
            const url = await this.getUrl(key);
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to download file from Vercel Blob: ${key}`);
            }

            return await response.arrayBuffer();
        },

        /**
         * Delete file from Vercel Blob
         */
        async delete(key) {
            const { del } = await import('@vercel/blob');
            await del(key, { token });
        },

        /**
         * List files in Vercel Blob
         */
        async list(prefix = '', limit = 1000) {
            const { list } = await import('@vercel/blob');
            const result = await list({ prefix, limit, token });

            return result.blobs.map(blob => ({
                key: blob.pathname,
                size: blob.size,
                contentType: blob.contentType,
                lastModified: new Date(blob.uploadedAt),
                etag: blob.pathname,
                customMetadata: {}
            }));
        },

        /**
         * Check if file exists
         */
        async exists(key) {
            try {
                const { head } = await import('@vercel/blob');
                await head(key, { token });
                return true;
            } catch {
                return false;
            }
        },

        /**
         * Get file URL
         */
        async getUrl(key, options = {}) {
            // Basic public URL construction, might need adjustment for private files
            return `https://blob.vercel-storage.com/${key}`;
        },

        /**
         * Get file metadata
         */
        async getMetadata(key) {
            const { head } = await import('@vercel/blob');
            const metadata = await head(key, { token });

            return {
                key: metadata.pathname,
                size: metadata.size,
                contentType: metadata.contentType,
                lastModified: new Date(metadata.uploadedAt),
                etag: metadata.pathname,
                customMetadata: {}
            };
        }
    };
}

