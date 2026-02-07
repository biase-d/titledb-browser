/**
 * @file Database Types and Interfaces
 * @description TypeScript-style JSDoc type definitions for database abstraction
 */

/**
 * @typedef {Object} DatabaseAdapter
 * @property {Function} select - Execute SELECT queries using Drizzle query builder
 * @property {Function} insert - Execute INSERT queries
 * @property {Function} update - Execute UPDATE queries
 * @property {Function} delete - Execute DELETE queries
 * @property {Function} transaction - Execute operations within a transaction
 * @property {Object} query - Drizzle query API for relational queries
 * @property {Object} _ - Internal Drizzle metadata
 */

/**
 * @typedef {Object} TransactionContext
 * @property {Function} select - SELECT within transaction
 * @property {Function} insert - INSERT within transaction
 * @property {Function} update - UPDATE within transaction
 * @property {Function} delete - DELETE within transaction
 * @property {Function} execute - Execute raw SQL within transaction
 */

/**
 * @typedef {'postgres' | 'd1' | 'unknown'} DatabaseType
 */

/**
 * @typedef {Object} DatabaseConfig
 * @property {string} [POSTGRES_URL] - PostgreSQL connection string
 * @property {string} [DATABASE_TYPE] - Database type override
 * @property {Object} [platform] - Platform context (Cloudflare Workers)
 */

export { };
