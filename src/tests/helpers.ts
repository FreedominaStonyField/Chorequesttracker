import bcrypt from 'bcrypt';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { nanoid } from 'nanoid';

import { db } from '../db/client.js';
import {
  auditLog,
  cardInstances,
  cardTemplates,
  claims,
  completions,
  notificationPreferences,
  settings,
  userInventories,
  users
} from '../db/schema.js';
import { DEFAULT_SETTINGS } from '../services/settingsService.js';
import type { CardTemplate } from '../models/types.js';

export async function resetDatabase() {
  await migrate(db, { migrationsFolder: './src/db/migrations' });
  await db.delete(auditLog);
  await db.delete(claims);
  await db.delete(completions);
  await db.delete(cardInstances);
  await db.delete(cardTemplates);
  await db.delete(notificationPreferences);
  await db.delete(userInventories);
  await db.delete(users);
  await db.delete(settings);
  await db.insert(settings).values({
    id: 1,
    refreshHour: DEFAULT_SETTINGS.refreshHour,
    weekAnchor: DEFAULT_SETTINGS.weekAnchor,
    monthAnchor: DEFAULT_SETTINGS.monthAnchor,
    proofRequiredTemplateIds: DEFAULT_SETTINGS.proofRequiredTemplateIds
  });
}

export async function createTestUser(id: string, pin = '1234') {
  const hashed = await bcrypt.hash(pin, 4);
  await db.insert(users).values({
    id,
    name: id,
    color: '#ffffff',
    avatarEmoji: '😀',
    joinDate: new Date(),
    isAdult: true,
    pinHash: hashed
  });
  await db.insert(userInventories).values({
    userId: id,
    items: [],
    badges: [],
    streaks: { daily: 0, weekly: 0, monthly: 0, once: 0, longest: {} },
    totalPoints: 0
  });
  await db.insert(notificationPreferences).values({
    userId: id,
    notifyOnLeaderboard: true,
    notifyOnNewQuests: true
  });
}

export async function createTemplate(template: Partial<CardTemplate> = {}) {
  const now = new Date();
  const id = template.id ?? nanoid();
  await db.insert(cardTemplates).values({
    id,
    title: template.title ?? 'Test Template',
    flavorText: template.flavorText,
    difficulty: template.difficulty ?? 'normal',
    points: template.points ?? 10,
    recurrence: template.recurrence ?? 'once',
    active: template.active ?? true,
    tags: template.tags ?? [],
    notes: template.notes,
    createdBy: template.createdBy ?? null,
    createdAt: now,
    updatedAt: now,
    weekAnchor: template.weekAnchor,
    monthAnchor: template.monthAnchor,
    requireProof: template.requireProof ?? false
  });
  return id;
}

export async function createInstance(templateId: string, overrides: Partial<typeof cardInstances.$inferInsert> = {}) {
  const id = overrides.id ?? nanoid();
  await db.insert(cardInstances).values({
    id,
    templateId,
    scheduledFor: overrides.scheduledFor ?? new Date(),
    status: overrides.status ?? 'available',
    assignedTo: overrides.assignedTo ?? null,
    createdAt: overrides.createdAt ?? new Date(),
    expiresAt: overrides.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000)
  });
  return id;
}
