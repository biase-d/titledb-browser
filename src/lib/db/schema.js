import { pgTable, text, bigint, integer, timestamp, serial, jsonb, pgEnum, uniqueIndex, primaryKey } from 'drizzle-orm/pg-core';

export const resolutionTypeEnum = pgEnum('resolution_type', ['Fixed', 'Dynamic', 'Multiple Fixed']);
export const fpsBehaviorEnum = pgEnum('fps_behavior', ['Locked', 'Stable', 'Unstable', 'Very Unstable']);

export const gameGroups = pgTable('game_groups', {
	id: text('id').primaryKey(),
	youtubeContributors: text('youtube_contributors').array(),
	lastUpdated: timestamp('last_updated', { withTimezone: true }).defaultNow()
});

export const games = pgTable('games', {
	id: text('id').primaryKey(),
	groupId: text('group_id').notNull().references(() => gameGroups.id),
	names: text('names').array().notNull(),
	regions: text('regions').array(),
	publisher: text('publisher'),
	releaseDate: integer('release_date'),
	sizeInBytes: bigint('size_in_bytes', { mode: 'number' }),
	iconUrl: text('icon_url'),
	bannerUrl: text('banner_url'),
	screenshots: text('screenshots').array(),
	lastUpdated: timestamp('last_updated', { withTimezone: true }).defaultNow()
});

export const performanceProfiles = pgTable('performance_profiles', {
	id: serial('id').primaryKey(),
	groupId: text('group_id').notNull().references(() => gameGroups.id),
	gameVersion: text('game_version').notNull(),
	suffix: text('suffix'),
	profiles: jsonb('profiles').notNull(),
	contributor: text('contributor').array(),
	sourcePrUrl: text('source_pr_url'),
	lastUpdated: timestamp('last_updated', { withTimezone: true }).defaultNow()
}, (table) => {
	return {
		groupId_version_unq: uniqueIndex('groupId_version_unq').on(table.groupId, table.gameVersion, table.suffix)
	};
});

export const graphicsSettings = pgTable('graphics_settings', {
	groupId: text('group_id').primaryKey().references(() => gameGroups.id),
	settings: jsonb('settings').notNull(),
	contributor: text('contributor').array(),
	lastUpdated: timestamp('last_updated', { withTimezone: true }).defaultNow()
});

export const youtubeLinks = pgTable('youtube_links', {
	id: serial('id').primaryKey(),
	groupId: text('group_id').notNull().references(() => gameGroups.id),
	url: text('url').notNull(),
	notes: text('notes'),
	submittedBy: text('submitted_by'),
	submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow()
});

export const dataRequests = pgTable('data_requests', {
	gameId: text('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
	userId: text('user_id').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
}, (table) => {
	return {
		pk: primaryKey({ columns: [table.gameId, table.userId] })
	};
});