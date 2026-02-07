/**
 * @file Local Filesystem Storage Adapter
 * @description Storage adapter for local development (Node.js filesystem)
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Create local filesystem storage adapter (for development only)
 * @param {Object} config
 * @param {string} [config.basePath='./storage'] - Base storage directory
 * @returns {import('../types').StorageAdapter}
 */
export function createLocalAdapter(config = {}) {
    const basePath = config.basePath || './storage';

    // Ensure storage directory exists
    fs.mkdir(basePath, { recursive: true }).catch(console.error);

    return {
        /**
         * Upload file to local filesystem
         * @param {import('../types').UploadOptions} options
         * @returns {Promise<import('../types').UploadResult>}
         */
        async upload({ key, data, contentType, metadata }) {
            const filePath = path.join(basePath, key);
            const fileDir = path.dirname(filePath);

            // Ensure directory exists
            await fs.mkdir(fileDir, { recursive: true });

            // Write file data
            let buffer;
            if (data instanceof ArrayBuffer) {
                buffer = Buffer.from(data);
            } else if (Buffer.isBuffer(data)) {
                buffer = data;
            } else {
                // Assume Blob or File
                buffer = Buffer.from(await data.arrayBuffer());
            }

            await fs.writeFile(filePath, buffer);

            // Write metadata if provided
            if (metadata && Object.keys(metadata).length > 0) {
                const metadataPath = `${filePath}.meta.json`;
                await fs.writeFile(metadataPath, JSON.stringify({
                    contentType,
                    customMetadata: metadata,
                    uploaded: new Date().toISOString()
                }));
            }

            const stats = await fs.stat(filePath);

            return {
                key,
                url: `/storage/${key}`, // Local dev URL
                etag: stats.mtime.getTime().toString(),
                size: stats.size
            };
        },

        /**
         * Download file from local filesystem
         */
        async download(key) {
            const filePath = path.join(basePath, key);
            const buffer = await fs.readFile(filePath);
            return buffer.buffer;
        },

        /**
         * Delete file from local filesystem
         */
        async delete(key) {
            const filePath = path.join(basePath, key);
            await fs.unlink(filePath);

            // Also delete metadata if exists
            const metadataPath = `${filePath}.meta.json`;
            try {
                await fs.unlink(metadataPath);
            } catch {
                // Metadata file doesn't exist, ignore
            }
        },

        /**
         * List files in local storage
         */
        async list(prefix = '', limit = 1000) {
            const searchPath = path.join(basePath, prefix);
            const files = [];

            async function walk(dir) {
                if (files.length >= limit) return;

                try {
                    const entries = await fs.readdir(dir, { withFileTypes: true });

                    for (const entry of entries) {
                        if (files.length >= limit) break;

                        const fullPath = path.join(dir, entry.name);

                        if (entry.isDirectory()) {
                            await walk(fullPath);
                        } else if (!entry.name.endsWith('.meta.json')) {
                            const relativePath = path.relative(basePath, fullPath);
                            const stats = await fs.stat(fullPath);

                            files.push({
                                key: relativePath.replace(/\\/g, '/'),
                                size: stats.size,
                                contentType: 'application/octet-stream',
                                lastModified: stats.mtime,
                                etag: stats.mtime.getTime().toString()
                            });
                        }
                    }
                } catch (err) {
                    // Directory doesn't exist yet, return empty
                }
            }

            await walk(searchPath);
            return files;
        },

        /**
         * Check if file exists
         */
        async exists(key) {
            const filePath = path.join(basePath, key);
            try {
                await fs.access(filePath);
                return true;
            } catch {
                return false;
            }
        },

        /**
         * Get file URL (local dev URL)
         */
        async getUrl(key) {
            return `/storage/${key}`;
        },

        /**
         * Get file metadata
         */
        async getMetadata(key) {
            const filePath = path.join(basePath, key);
            const stats = await fs.stat(filePath);

            // Try to read metadata file
            let customMetadata = {};
            let contentType = 'application/octet-stream';

            try {
                const metadataPath = `${filePath}.meta.json`;
                const metaContent = await fs.readFile(metadataPath, 'utf-8');
                const meta = JSON.parse(metaContent);
                customMetadata = meta.customMetadata || {};
                contentType = meta.contentType || contentType;
            } catch {
                // No metadata file
            }

            return {
                key,
                size: stats.size,
                contentType,
                lastModified: stats.mtime,
                etag: stats.mtime.getTime().toString(),
                customMetadata
            };
        }
    };
}
