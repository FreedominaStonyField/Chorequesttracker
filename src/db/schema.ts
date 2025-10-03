import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull(),
  avatarEmoji: text('avatar_emoji').notNull(),
  joinDate: integer('join_date', { mode: 'timestamp' }).notNull(),
  isAdult: integer('is_adult', { mode: 'boolean' }).notNull(),
  pinHash: text('pin_hash').notNull()
});

export const notificationPreferences = sqliteTable('notification_preferences', {
  userId: text('user_id').primaryKey().references(() => users.id),
  pushToken: text('push_token'),
  notifyOnLeaderboard: integer('notify_on_leaderboard', { mode: 'boolean' })
    .default(true)
    .notNull(),
  notifyOnNewQuests: integer('notify_on_new_quests', { mode: 'boolean' })
    .default(true)
    .notNull()
});

export const cardTemplates = sqliteTable('card_templates', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  flavorText: text('flavor_text'),
  difficulty: text('difficulty').notNull(),
  points: integer('points').notNull(),
  recurrence: text('recurrence'),
  active: integer('active', { mode: 'boolean' }).default(true).notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[] | null>(),
  notes: text('notes'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  weekAnchor: integer('week_anchor'),
  monthAnchor: integer('month_anchor'),
  requireProof: integer('require_proof', { mode: 'boolean' }).default(false).notNull()
});

export const cardInstances = sqliteTable('card_instances', {
  id: text('id').primaryKey(),
  templateId: text('template_id')
    .references(() => cardTemplates.id)
    .notNull(),
  scheduledFor: integer('scheduled_for', { mode: 'timestamp' }).notNull(),
  status: text('status').notNull(),
  assignedTo: text('assigned_to').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' })
});

export const claims = sqliteTable('claims', {
  id: text('id').primaryKey(),
  cardInstanceId: text('card_instance_id')
    .references(() => cardInstances.id)
    .notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  claimedAt: integer('claimed_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' })
});

export const completions = sqliteTable('completions', {
  id: text('id').primaryKey(),
  cardInstanceId: text('card_instance_id')
    .references(() => cardInstances.id)
    .notNull()
    .unique(),
  userId: text('user_id').references(() => users.id).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }).notNull(),
  proofNote: text('proof_note'),
  proofPhotoUrl: text('proof_photo_url'),
  pointsAwarded: integer('points_awarded').notNull(),
  streaksAwarded: text('streaks_awarded', { mode: 'json' }).$type<
    Record<string, number> | null
  >()
});

export const userInventories = sqliteTable('user_inventories', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id),
  items: text('items', { mode: 'json' }).$type<unknown>().notNull(),
  totalPoints: integer('total_points').default(0).notNull(),
  badges: text('badges', { mode: 'json' }).$type<unknown>().notNull(),
  streaks: text('streaks', { mode: 'json' }).$type<unknown>().notNull()
});

export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  actorUserId: text('actor_user_id').references(() => users.id),
  at: integer('at', { mode: 'timestamp' }).notNull(),
  payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>().notNull()
});

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey().default(1),
  refreshHour: integer('refresh_hour').notNull(),
  weekAnchor: integer('week_anchor').notNull(),
  monthAnchor: integer('month_anchor').notNull(),
  proofRequiredTemplateIds: text('proof_required_template_ids', { mode: 'json' })
    .$type<string[]>()
    .notNull()
});

export const usersRelations = relations(users, ({ many, one }) => ({
  notificationPreferences: one(notificationPreferences),
  inventory: one(userInventories),
  claims: many(claims),
  completions: many(completions)
}));

export const cardTemplatesRelations = relations(cardTemplates, ({ many, one }) => ({
  createdByUser: one(users, {
    fields: [cardTemplates.createdBy],
    references: [users.id]
  }),
  instances: many(cardInstances)
}));

export const cardInstancesRelations = relations(cardInstances, ({ one, many }) => ({
  template: one(cardTemplates, {
    fields: [cardInstances.templateId],
    references: [cardTemplates.id]
  }),
  assignedUser: one(users, {
    fields: [cardInstances.assignedTo],
    references: [users.id]
  }),
  claim: many(claims),
  completion: one(completions)
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type CardTemplate = typeof cardTemplates.$inferSelect;
export type NewCardTemplate = typeof cardTemplates.$inferInsert;
export type CardInstance = typeof cardInstances.$inferSelect;
export type NewCardInstance = typeof cardInstances.$inferInsert;
export type Claim = typeof claims.$inferSelect;
export type NewClaim = typeof claims.$inferInsert;
export type Completion = typeof completions.$inferSelect;
export type NewCompletion = typeof completions.$inferInsert;
export type UserInventory = typeof userInventories.$inferSelect;
export type NewUserInventory = typeof userInventories.$inferInsert;
export type SettingRow = typeof settings.$inferSelect;
export type NewSettingRow = typeof settings.$inferInsert;
