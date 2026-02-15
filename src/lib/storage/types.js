/**
 * @file Storage Types and Interfaces
 * @description TypeScript-style JSDoc type definitions for storage abstraction
 */

/**
 * @typedef {Object} StorageAdapter
 * @property {Function} upload - Upload a file to storage
 * @property {Function} download - Download a file from storage
 * @property {Function} delete - Delete a file from storage
 * @property {Function} list - List files in storage
 * @property {Function} exists - Check if file exists
 * @property {Function} getUrl - Get public or presigned URL
 * @property {Function} getMetadata - Get file metadata
 */

/**
 * @typedef {Object} UploadOptions
 * @property {string} key - File key/path in storage
 * @property {Blob|File|ArrayBuffer|ReadableStream} data - File data
 * @property {string} [contentType] - MIME type
 * @property {Object} [metadata] - Custom metadata key-value pairs
 * @property {boolean} [public] - Make file publicly accessible
 * @property {number} [cacheControl] - Cache duration in seconds
 */

/**
 * @typedef {Object} UploadResult
 * @property {string} key - File key in storage
 * @property {string} [url] - Public URL (if public=true)
 * @property {string} etag - Entity tag for versioning
 * @property {number} size - File size in bytes
 */

/**
 * @typedef {Object} FileMetadata
 * @property {string} key - File key
 * @property {number} size - Size in bytes
 * @property {string} contentType - MIME type
 * @property {Date} lastModified - Last modification timestamp
 * @property {string} etag - Entity tag
 * @property {Object} [customMetadata] - Custom metadata
 */

/**
 * @typedef {Object} UrlOptions
 * @property {number} [expiresIn] - URL expiry in seconds (for presigned URLs)
 */

/**
 * @typedef {'r2' | 'vercel-blob' | 'local' | 'none'} StorageProvider
 */

export { }
