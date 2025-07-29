import { pgTable, text, integer, bigint, timestamp, pgEnum, jsonb } from 'drizzle-orm/pg-core'

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

export const fpsBehavior = pgEnum('fps_behavior', ['Locked', 'Unlocked'])
export const resolutionType = pgEnum('resolution_type', ['Fixed', 'Dynamic', 'Multiple Fixed'])