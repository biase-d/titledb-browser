import { pgTable, text, integer, bigint, timestamp, pgEnum, jsonb, serial } from 'drizzle-orm/pg-core'

export const games = pgTable('games', {
  id: text('id').primaryKey().notNull(),
  groupId: text('groupId').notNull(),
  names: text('names').array().notNull(),
  publisher: text('publisher'),
  releaseDate: integer('releaseDate'),
  sizeInBytes: bigint('sizeInBytes', { mode: 'number' }),
  iconUrl: text('iconUrl'),
  bannerUrl: text('bannerUrl'),
  screenshots: text('screenshots').array(),

  lastUpdated: timestamp('lastUpdated', { withTimezone: true }).defaultNow()
})

export const performanceProfiles = pgTable('performance_profiles', {
  groupId: text('groupId').primaryKey().notNull(),
  profiles: jsonb('profiles').notNull(),
  contributor: text('contributor'),
  sourcePrUrl: text('sourcePrUrl'),
  lastUpdated: timestamp('lastUpdated', { withTimezone: true }).defaultNow()
})

export const graphicsSettings = pgTable('graphics_settings', {
  groupId: text('groupId').primaryKey().references(() => performanceProfiles.groupId),
  settings: jsonb('settings').notNull(),
  lastUpdated: timestamp('lastUpdated', { withTimezone: true }).defaultNow()
})

export const youtubeLinks = pgTable('youtube_links', {
  id: serial('id').primaryKey(),
  groupId: text('groupId').notNull().references(() => performanceProfiles.groupId),
  url: text('url').notNull(),
  description: text('description'),
  submittedBy: text('submittedBy'),
  submittedAt: timestamp('submittedAt', { withTimezone: true }).defaultNow()
})

export const fpsBehavior = pgEnum('fps_behavior', ['Locked', 'Unlocked'])
export const resolutionType = pgEnum('resolution_type', ['Fixed', 'Dynamic', 'Multiple Fixed'])