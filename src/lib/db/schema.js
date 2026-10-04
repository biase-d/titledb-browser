import { pgTable, text, bigint, integer, timestamp, serial, jsonb, pgEnum, uniqueIndex, primaryKey } from 'drizzle-orm/pg-core'

export const resolutionTypeEnum = pgEnum('resolution_type', ['Fixed', 'Dynamic', 'Multiple Fixed'])
export const fpsBehaviorEnum = pgEnum('fps_behavior', ['Locked', 'Stable', 'Unstable', 'Very Unstable'])
export const contributionStatusEnum = pgEnum('contribution_status', ['pending', 'approved', 'rejected'])

/**
 * Web application tables bound to public schema views.
 * These views are refreshed by the build pipeline to point at the active layer (A or B).
 * 
 * NOTE: We rely on the connection pool's search_path being set to 'public, extensions'
 * to resolve these without explicit qualification, which avoids Drizzle 'public' schema restrictions.
 */

export const gameGroups = pgTable('active_game_groups', {
	id: text('id').primaryKey(),
	platformId: integer('platform_id').notNull().default(1),
	youtubeContributors: text('youtube_contributors').array(),
	lastUpdated: timestamp('last_updated', { withTimezone: true }).defaultNow()
})

export const games = pgTable('active_games', {
	id: text('id').primaryKey(),
	groupId: text('group_id').notNull(),
	names: text('names').array().notNull(),
	regions: text('regions').array(),
	publisher: text('publisher'),
	releaseDate: integer('release_date'),
	sizeInBytes: bigint('size_in_bytes', { mode: 'number' }),
	iconUrl: text('icon_url'),
	bannerUrl: text('banner_url'),
	screenshots: text('screenshots').array(),
	lastUpdated: timestamp('last_updated', { withTimezone: true }).defaultNow()
})

export const performanceProfiles = pgTable('active_performance_data', {
	id: serial('id').primaryKey(),
	groupId: text('group_id').notNull(),
	platformId: integer('platform_id').notNull().default(1),
	gameVersion: text('game_version').notNull(),
	suffix: text('suffix'),
	profiles: jsonb('profiles').notNull(),
	contributor: text('contributor').array(),
	sourcePrUrl: text('source_pr_url'),
	status: contributionStatusEnum('status').notNull().default('approved'),
	prNumber: integer('pr_number'),
	lastUpdated: timestamp('last_updated', { withTimezone: true }).defaultNow()
}, (table) => {
	return {
		groupId_version_unq: uniqueIndex('groupId_version_unq').on(table.groupId, table.gameVersion, table.suffix)
	}
})

export const graphicsSettings = pgTable('active_graphics_settings', {
	groupId: text('group_id').primaryKey(),
	platformId: integer('platform_id').notNull().default(1),
	settings: jsonb('settings').notNull(),
	contributor: text('contributor').array(),
	status: contributionStatusEnum('status').notNull().default('approved'),
	prNumber: integer('pr_number'),
	lastUpdated: timestamp('last_updated', { withTimezone: true }).defaultNow()
})

export const youtubeLinks = pgTable('active_youtube_links', {
	id: serial('id').primaryKey(),
	groupId: text('group_id').notNull(),
	url: text('url').notNull(),
	notes: text('notes'),
	submittedBy: text('submitted_by'),
	status: contributionStatusEnum('status').notNull().default('approved'),
	prNumber: integer('pr_number'),
	submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow()
})

/**
 * Persistent tables in the public schema.
 */

export const dataRequests = pgTable('data_requests', {
	gameId: text('game_id').notNull(),
	userId: text('user_id').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
}, (table) => {
	return {
		pk: primaryKey({ columns: [table.gameId, table.userId] })
	}
})

export const favorites = pgTable('favorites', {
	userId: text('user_id').notNull(),
	gameId: text('game_id').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
}, (table) => {
	return {
		pk: primaryKey({ columns: [table.userId, table.gameId] })
	}
})

export const userPreferences = pgTable('user_preferences', {
	userId: text('user_id').primaryKey(),
	hasOnboarded: integer('has_onboarded').default(0),
	preferredRegion: text('preferred_region'),
	featuredGameId: text('featured_game_id'),
	lastUpdated: timestamp('last_updated', { withTimezone: true }).defaultNow()
})

export const users = pgTable('users', {
	id: text('id').primaryKey(),
	login: text('login').notNull(),
	karma: integer('karma').notNull().default(0),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
	lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow()
})

export const submissions = pgTable('submissions', {
	id: serial('id').primaryKey(),
	userId: text('user_id').notNull(),
	githubPrNumber: integer('github_pr_number'),
	groupId: text('group_id').notNull(),
	data: jsonb('data').notNull(),
	status: text('status').notNull().default('pending'),
	type: text('type').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

/**
 * Tokens for the public API, one row per token a signed-in person has made. Only
 * the SHA-256 of the token is kept (see $lib/server/apiAuth). Shared by every
 * layer, like users and favourites: it is people's data, not content
 */
export const apiTokens = pgTable('api_tokens', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull(),
	login: text('login').notNull(),
	name: text('name').notNull().default(''),
	tokenHash: text('token_hash').notNull().unique(),
	display: text('display').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
	lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
	revokedAt: timestamp('revoked_at', { withTimezone: true })
})

/**
 * A person's lists of favourites ("Playing now", "Co-op"…). They belong to the
 * account, in public, and are never swapped with a layer
 */
export const favoriteLists = pgTable('favorite_lists', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull(),
	name: text('name').notNull(),
	position: integer('position').notNull().default(0),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

export const favoriteListItems = pgTable('favorite_list_items', {
	listId: text('list_id').notNull(),
	gameId: text('game_id').notNull(),
	addedAt: timestamp('added_at', { withTimezone: true }).defaultNow()
}, (table) => ({
	pk: primaryKey({ columns: [table.listId, table.gameId] })
}))

