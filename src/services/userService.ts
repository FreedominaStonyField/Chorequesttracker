import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '../db/client.js';
import {
  notificationPreferences,
  userInventories,
  users
} from '../db/schema.js';
import { mapUser, mapUserWithSecret } from '../models/mappers.js';
import type {
  NotificationPreference,
  User,
  UserInventory,
  UserWithSecret
} from '../models/types.js';
import { config } from '../config.js';

export interface CreateUserInput {
  id?: string;
  name: string;
  color: string;
  avatarEmoji: string;
  joinDate?: string;
  isAdult?: boolean;
  pin: string;
}

export interface UpdateUserInput {
  name?: string;
  color?: string;
  avatarEmoji?: string;
  isAdult?: boolean;
  pin?: string;
}

export async function listUsers(): Promise<User[]> {
  const rows = await db.select().from(users);
  return rows.map(mapUser);
}

export async function getUser(id: string): Promise<UserWithSecret | null> {
  const row = await db.query.users.findFirst({ where: eq(users.id, id) });
  return row ? mapUserWithSecret(row) : null;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const id = input.id ?? nanoid();
  const hashed = await bcrypt.hash(input.pin, config.bcryptRounds);
  const joinDate = input.joinDate ? new Date(input.joinDate) : new Date();
  db.transaction((tx) => {
    tx
      .insert(users)
      .values({
        id,
        name: input.name,
        color: input.color,
        avatarEmoji: input.avatarEmoji,
        joinDate,
        isAdult: input.isAdult ?? false,
        pinHash: hashed
      })
      .run();
    tx
      .insert(userInventories)
      .values({
        userId: id,
        items: [],
        totalPoints: 0,
        badges: [],
        streaks: { daily: 0, weekly: 0, monthly: 0, once: 0, longest: {} }
      })
      .run();
    tx
      .insert(notificationPreferences)
      .values({
        userId: id,
        notifyOnLeaderboard: true,
        notifyOnNewQuests: true
      })
      .run();
  });
  const created = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!created) throw new Error('Failed to load created user');
  return mapUser(created);
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  const existing = await getUser(id);
  if (!existing) {
    throw new Error('User not found');
  }
  const patch: Partial<typeof users.$inferInsert> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.color !== undefined) patch.color = input.color;
  if (input.avatarEmoji !== undefined) patch.avatarEmoji = input.avatarEmoji;
  if (input.isAdult !== undefined) patch.isAdult = input.isAdult;
  if (input.pin) {
    patch.pinHash = await bcrypt.hash(input.pin, config.bcryptRounds);
  }
  if (Object.keys(patch).length) {
    await db.update(users).set(patch).where(eq(users.id, id));
  }
  const updated = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!updated) throw new Error('Failed to reload user');
  return mapUser(updated);
}

export async function deleteUser(id: string): Promise<void> {
  db.transaction((tx) => {
    tx.delete(notificationPreferences).where(eq(notificationPreferences.userId, id)).run();
    tx.delete(userInventories).where(eq(userInventories.userId, id)).run();
    tx.delete(users).where(eq(users.id, id)).run();
  });
}

export async function getInventory(userId: string): Promise<UserInventory | null> {
  const row = await db.query.userInventories.findFirst({
    where: eq(userInventories.userId, userId)
  });
  if (!row) return null;
  return {
    userId: row.userId,
    items: (row.items as UserInventory['items'] | null) ?? [],
    totalPoints: row.totalPoints ?? 0,
    badges: (row.badges as UserInventory['badges'] | null) ?? [],
    streaks: (row.streaks as UserInventory['streaks'] | null) ?? {
      daily: 0,
      weekly: 0,
      monthly: 0,
      once: 0,
      longest: {}
    }
  };
}

export async function updateNotificationPreference(
  userId: string,
  prefs: Partial<NotificationPreference>
): Promise<NotificationPreference> {
  const existing = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .get();
  if (!existing) {
    throw new Error('Notification preferences missing');
  }
  const next = {
    pushToken: prefs.pushToken ?? existing.pushToken ?? undefined,
    notifyOnLeaderboard:
      prefs.notifyOnLeaderboard ?? Boolean(existing.notifyOnLeaderboard ?? true),
    notifyOnNewQuests:
      prefs.notifyOnNewQuests ?? Boolean(existing.notifyOnNewQuests ?? true)
  };
  await db
    .update(notificationPreferences)
    .set({
      pushToken: next.pushToken,
      notifyOnLeaderboard: next.notifyOnLeaderboard,
      notifyOnNewQuests: next.notifyOnNewQuests
    })
    .where(eq(notificationPreferences.userId, userId));
  return { userId, ...next };
}

export async function findUserByPin(id: string, pin: string): Promise<User | null> {
  const user = await getUser(id);
  if (!user) return null;
  const matches = await bcrypt.compare(pin, user.pinHash);
  return matches ? user : null;
}

export async function findUserByPinOrBypass(
  id: string,
  pin: string
): Promise<UserWithSecret | null> {
  const user = await getUser(id);
  if (!user) return null;
  const bypass = config.pinBypassSecret && pin === config.pinBypassSecret;
  const matches = bypass || (await bcrypt.compare(pin, user.pinHash));
  return matches ? user : null;
}

export async function ensureUserInventory(userId: string): Promise<void> {
  const existing = await db.query.userInventories.findFirst({
    where: eq(userInventories.userId, userId)
  });
  if (!existing) {
    await db.insert(userInventories).values({
      userId,
      items: [],
      totalPoints: 0,
      badges: [],
      streaks: { daily: 0, weekly: 0, monthly: 0, once: 0, longest: {} }
    });
  }
}
