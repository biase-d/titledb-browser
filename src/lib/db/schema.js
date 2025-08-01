import { pgTable, text, integer, bigint, timestamp, pgEnum, jsonb, serial } from 'drizzle-orm/pg-core'

export const games = pgTable('games', {
  id: text('id').primaryKey().notNull(),
  group_id: text('group_id').notNull(),
  names: text('names').array().notNull(),
  publisher: text('publisher'),
  release_date: integer('release_date'),
  size_in_bytes: bigint('size_in_bytes', { mode: 'number' }),
  icon_url: text('icon_url'),
  banner_url: text('banner_url'),
  screenshots: text('screenshots').array(),
  last_updated: timestamp('last_updated', { withTimezone: true }).defaultNow()
})

export const performance_profiles = pgTable('performance_profiles', {
  group_id: text('group_id').primaryKey().notNull(),
  game_version: text('game_version'),
  profiles: jsonb('profiles').notNull(),
  contributor: text('contributor'),
  source_pr_url: text('source_pr_url'),
  last_updated: timestamp('last_updated', { withTimezone: true }).defaultNow()
})

export const graphics_settings = pgTable('graphics_settings', {
  group_id: text('group_id').primaryKey().references(() => performance_profiles.group_id),
  settings: jsonb('settings').notNull(),
  last_updated: timestamp('last_updated', { withTimezone: true }).defaultNow()
})

export const youtube_links = pgTable('youtube_links', {
  id: serial('id').primaryKey(),
  group_id: text('group_id').notNull().references(() => performance_profiles.group_id),
  url: text('url').notNull(),
  submitted_by: text('submitted_by'),
  submitted_at: timestamp('submitted_at', { withTimezone: true }).defaultNow()
})

export const fps_behavior = pgEnum('fps_behavior', ['Locked', 'Stable', 'Unstable', 'Very Unstable'])
export const resolution_type = pgEnum('resolution_type', ['Fixed', 'Dynamic', 'Multiple Fixed'])