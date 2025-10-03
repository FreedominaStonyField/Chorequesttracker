import { and, desc, eq, gte, inArray, lt } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '../db/client.js';
import {
  cardInstances,
  cardTemplates,
  claims,
  completions,
  userInventories,
  users
} from '../db/schema.js';
import { mapClaim, mapCompletion, mapInstance, mapTemplate, mapUser } from '../models/mappers.js';
import type {
  BadgeId,
  CardInstance,
  CardTemplate,
  Claim,
  Completion,
  FeedItem,
  HistoryEntry,
  LeaderboardEntry,
  StreakSnapshot
} from '../models/types.js';
import { appendAudit } from './auditService.js';
import { computeExpiry, computeNextInstanceDate } from './recurrence.js';
import { getSettings } from './settingsService.js';
import { ensureUserInventory } from './userService.js';

interface TemplateInput {
  id?: string;
  title: string;
  flavorText?: string;
  difficulty: CardTemplate['difficulty'];
  points: number;
  recurrence: CardTemplate['recurrence'];
  active?: boolean;
  tags?: string[];
  notes?: string;
  createdBy: string;
  weekAnchor?: number;
  monthAnchor?: number;
  requireProof?: boolean;
}

interface UpdateTemplateInput extends Partial<TemplateInput> {}

interface CompletionInput {
  proofNote?: string;
  proofPhotoUrl?: string;
}

export async function listTemplates(): Promise<CardTemplate[]> {
  const rows = await db
    .select()
    .from(cardTemplates)
    .orderBy(desc(cardTemplates.createdAt));
  return rows.map(mapTemplate);
}

export async function getTemplate(id: string): Promise<CardTemplate | null> {
  const row = await db.query.cardTemplates.findFirst({ where: eq(cardTemplates.id, id) });
  return row ? mapTemplate(row) : null;
}

export async function createTemplate(input: TemplateInput): Promise<CardTemplate> {
  const now = new Date();
  const id = input.id ?? nanoid();
  await db.insert(cardTemplates).values({
    id,
    title: input.title,
    flavorText: input.flavorText,
    difficulty: input.difficulty,
    points: input.points,
    recurrence: input.recurrence,
    active: input.active ?? true,
    tags: input.tags ?? [],
    notes: input.notes,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
    weekAnchor: input.weekAnchor,
    monthAnchor: input.monthAnchor,
    requireProof: input.requireProof ?? false
  });
  const created = await getTemplate(id);
  if (!created) throw new Error('Template not found after creation');
  return created;
}

export async function updateTemplate(
  id: string,
  patch: UpdateTemplateInput
): Promise<CardTemplate> {
  const existing = await getTemplate(id);
  if (!existing) throw new Error('Template not found');
  const now = new Date();
  await db
    .update(cardTemplates)
    .set({
      title: patch.title ?? existing.title,
      flavorText: patch.flavorText ?? existing.flavorText,
      difficulty: patch.difficulty ?? existing.difficulty,
      points: patch.points ?? existing.points,
      recurrence: patch.recurrence ?? existing.recurrence,
      active: patch.active ?? existing.active,
      tags: patch.tags ?? existing.tags,
      notes: patch.notes ?? existing.notes,
      weekAnchor: patch.weekAnchor ?? existing.weekAnchor,
      monthAnchor: patch.monthAnchor ?? existing.monthAnchor,
      requireProof: patch.requireProof ?? existing.requireProof ?? false,
      updatedAt: now
    })
    .where(eq(cardTemplates.id, id));
  const updated = await getTemplate(id);
  if (!updated) throw new Error('Failed to reload template');
  return updated;
}

export async function deleteTemplate(id: string): Promise<void> {
  db.transaction((tx) => {
    const instanceIds = tx
      .select({ id: cardInstances.id })
      .from(cardInstances)
      .where(eq(cardInstances.templateId, id))
      .all();
    if (instanceIds.length) {
      const ids = instanceIds.map((row) => row.id);
      tx.delete(claims).where(inArray(claims.cardInstanceId, ids)).run();
      tx.delete(completions).where(inArray(completions.cardInstanceId, ids)).run();
      tx.delete(cardInstances).where(inArray(cardInstances.id, ids)).run();
    }
    tx.delete(cardTemplates).where(eq(cardTemplates.id, id)).run();
  });
}

export async function duplicateTemplate(id: string, actorUserId: string): Promise<CardTemplate> {
  const existing = await getTemplate(id);
  if (!existing) throw new Error('Template not found');
  const clone = await createTemplate({
    ...existing,
    id: nanoid(),
    title: `${existing.title} (Copy)`,
    createdBy: actorUserId
  });
  return clone;
}

type FeedRow = {
  instance: typeof cardInstances.$inferSelect;
  template: typeof cardTemplates.$inferSelect | null;
  user: typeof users.$inferSelect | null;
  completion: typeof completions.$inferSelect | null;
  claim: typeof claims.$inferSelect | null;
};

export async function getFeed(): Promise<FeedItem[]> {
  const rows = (await db
    .select({
      instance: cardInstances,
      template: cardTemplates,
      user: users,
      completion: completions,
      claim: claims
    })
    .from(cardInstances)
    .leftJoin(cardTemplates, eq(cardTemplates.id, cardInstances.templateId))
    .leftJoin(users, eq(users.id, cardInstances.assignedTo))
    .leftJoin(completions, eq(completions.cardInstanceId, cardInstances.id))
    .leftJoin(claims, eq(claims.cardInstanceId, cardInstances.id))
    .orderBy(desc(cardInstances.scheduledFor))) as FeedRow[];
  return rows
    .filter((row): row is FeedRow & { template: typeof cardTemplates.$inferSelect } => Boolean(row.template))
    .map((row) => ({
      instance: mapInstance(row.instance),
      template: mapTemplate(row.template),
      assignedUser: row.user ? mapUser(row.user) : undefined,
      completion: row.completion ? mapCompletion(row.completion) : undefined,
      claim: row.claim ? mapClaim(row.claim) : undefined
    }));
}

export async function spawnInstancesForActiveTemplates(now = new Date()): Promise<void> {
  const settings = await getSettings();
  const templates = await db
    .select()
    .from(cardTemplates)
    .where(eq(cardTemplates.active, true));
  db.transaction((tx) => {
    for (const template of templates) {
      const templateModel = mapTemplate(template);
      const nextDate = computeNextInstanceDate(templateModel, now, settings);
      if (!nextDate) continue;
      const existing = tx
        .select({ id: cardInstances.id })
        .from(cardInstances)
        .where(
          and(
            eq(cardInstances.templateId, template.id),
            gte(cardInstances.scheduledFor, nextDate)
          )
        )
        .limit(1)
        .all();
      if (existing.length === 0) {
        tx
          .insert(cardInstances)
          .values({
            id: nanoid(),
            templateId: template.id,
            scheduledFor: nextDate,
            status: 'available',
            createdAt: now,
            expiresAt: computeExpiry(templateModel, nextDate, settings)
          })
          .run();
      }
    }
  });
}

export async function expireOverdueInstances(reference = new Date()): Promise<void> {
  await db
    .update(cardInstances)
    .set({ status: 'expired' })
    .where(
      and(
        inArray(cardInstances.status, ['available', 'claimed']),
        lt(cardInstances.expiresAt, reference)
      )
    );
}

export async function claimCard(
  cardId: string,
  userId: string
): Promise<{ claim: Claim; instance: CardInstance }> {
  const now = new Date();
  const { claim, instance } = db.transaction((tx) => {
    const instanceRow = tx
      .select()
      .from(cardInstances)
      .where(eq(cardInstances.id, cardId))
      .limit(1)
      .all()[0];
    if (!instanceRow) throw new Error('Card not found');
    if (instanceRow.status !== 'available') {
      throw new Error('Card already claimed');
    }
    const newClaimId = nanoid();
    tx
      .insert(claims)
      .values({
        id: newClaimId,
        cardInstanceId: cardId,
        userId,
        claimedAt: now,
        expiresAt: instanceRow.expiresAt
      })
      .run();
    tx
      .update(cardInstances)
      .set({ status: 'claimed', assignedTo: userId })
      .where(eq(cardInstances.id, cardId))
      .run();
    const claimRow = tx
      .select()
      .from(claims)
      .where(eq(claims.id, newClaimId))
      .limit(1)
      .all()[0];
    if (!claimRow) throw new Error('Failed to load claim');
    const updatedInstance = tx
      .select()
      .from(cardInstances)
      .where(eq(cardInstances.id, cardId))
      .limit(1)
      .all()[0];
    if (!updatedInstance) throw new Error('Failed to load instance');
    return { claim: claimRow, instance: updatedInstance };
  });
  await appendAudit('action', userId, { action: 'claim', cardId });
  return { claim: mapClaim(claim), instance: mapInstance(instance) };
}

export async function releaseClaim(claimId: string, userId: string): Promise<void> {
  const now = new Date();
  db.transaction((tx) => {
    const claimRow = tx
      .select()
      .from(claims)
      .where(eq(claims.id, claimId))
      .limit(1)
      .all()[0];
    if (!claimRow) throw new Error('Claim not found');
    if (claimRow.userId !== userId) throw new Error('Cannot release other user claims');
    if (now.getTime() - new Date(claimRow.claimedAt).getTime() > 60_000) {
      throw new Error('Claim can no longer be released');
    }
    tx.delete(claims).where(eq(claims.id, claimId)).run();
    tx
      .update(cardInstances)
      .set({ status: 'available', assignedTo: null })
      .where(eq(cardInstances.id, claimRow.cardInstanceId))
      .run();
  });
  await appendAudit('action', userId, { action: 'claim.release', claimId });
}

export async function completeCard(
  cardId: string,
  userId: string,
  input: CompletionInput
): Promise<Completion> {
  await ensureUserInventory(userId);
  const now = new Date();
  const completion = db.transaction((tx) => {
    const instanceRow = tx
      .select()
      .from(cardInstances)
      .where(eq(cardInstances.id, cardId))
      .get();
    if (!instanceRow) throw new Error('Card not found');
    if (instanceRow.status === 'completed') throw new Error('Card already completed');
    if (instanceRow.assignedTo && instanceRow.assignedTo !== userId) {
      throw new Error('Card assigned to another hero');
    }
    const templateRow = tx
      .select()
      .from(cardTemplates)
      .where(eq(cardTemplates.id, instanceRow.templateId))
      .get();
    if (!templateRow) throw new Error('Template missing');
    const template = mapTemplate(templateRow);
    const points = template.points;
    const completionId = nanoid();
    const inventoryRow = tx
      .select()
      .from(userInventories)
      .where(eq(userInventories.userId, userId))
      .get();
    if (!inventoryRow) throw new Error('Inventory missing');
    const items = [...((inventoryRow.items as UserInventoryItem[] | null) ?? [])];
    const badges = [...((inventoryRow.badges as BadgeUnlock[] | null) ?? [])];
    const baseStreaks = (inventoryRow.streaks as StreakState | null) ?? DEFAULT_STREAKS();
    const streaks: StreakState = {
      daily: baseStreaks.daily,
      weekly: baseStreaks.weekly,
      monthly: baseStreaks.monthly,
      once: baseStreaks.once,
      longest: { ...(baseStreaks.longest ?? {}) }
    };
    const existingItem = items.find((item) => item.templateId === template.id);
    if (existingItem) {
      existingItem.timesCompleted += 1;
      existingItem.lastCompletedAt = now.toISOString();
    } else {
      items.push({
        templateId: template.id,
        timesCompleted: 1,
        lastCompletedAt: now.toISOString()
      });
    }
    streaks[template.recurrence] = (streaks[template.recurrence] ?? 0) + 1;
    const currentStreak = streaks[template.recurrence];
    if ((streaks.longest[template.recurrence] ?? 0) < currentStreak) {
      streaks.longest[template.recurrence] = currentStreak;
    }
    const snapshot: StreakSnapshot = {
      [template.recurrence]: currentStreak
    };
    const updatedBadges = awardBadges(badges, streaks, now);
    tx
      .update(userInventories)
      .set({
        items,
        badges: updatedBadges,
        streaks,
        totalPoints: (inventoryRow.totalPoints ?? 0) + points
      })
      .where(eq(userInventories.userId, userId))
      .run();
    tx
      .insert(completions)
      .values({
        id: completionId,
        cardInstanceId: cardId,
        userId,
        completedAt: now,
        proofNote: input.proofNote,
        proofPhotoUrl: input.proofPhotoUrl,
        pointsAwarded: points,
        streaksAwarded: snapshot
      })
      .run();
    tx
      .update(cardInstances)
      .set({ status: 'completed', assignedTo: userId })
      .where(eq(cardInstances.id, cardId))
      .run();
    tx.delete(claims).where(eq(claims.cardInstanceId, cardId)).run();
    const completionRow = tx
      .select()
      .from(completions)
      .where(eq(completions.id, completionId))
      .get();
    if (!completionRow) throw new Error('Completion missing');
    return completionRow;
  });
  await appendAudit('action', userId, { action: 'complete', cardId });
  return mapCompletion(completion);
}

type UserInventoryItem = {
  templateId: string;
  timesCompleted: number;
  lastCompletedAt?: string;
};

type BadgeUnlock = {
  id: string;
  badgeId: BadgeId;
  unlockedAt: string;
  details?: Record<string, unknown>;
};

type StreakState = {
  daily: number;
  weekly: number;
  monthly: number;
  once: number;
  longest: Partial<Record<CardTemplate['recurrence'], number>>;
};

function DEFAULT_STREAKS(): StreakState {
  return { daily: 0, weekly: 0, monthly: 0, once: 0, longest: {} };
}

function awardBadges(
  badges: BadgeUnlock[],
  streaks: StreakState,
  completedAt: Date
): BadgeUnlock[] {
  const next = [...badges];
  const push = (badgeId: BadgeId, details?: Record<string, unknown>) => {
    if (next.some((badge) => badge.badgeId === badgeId)) return;
    next.push({ id: nanoid(), badgeId, unlockedAt: new Date().toISOString(), details });
  };
  if (next.length === 0) {
    push('first-blood');
  }
  if (completedAt.getHours() < 8) {
    push('early-bird');
  }
  if (streaks.daily >= 7) {
    push('iron-week', { streak: streaks.daily });
  }
  return next;
}

type HistoryRow = {
  completion: typeof completions.$inferSelect;
  instance: typeof cardInstances.$inferSelect | null;
  template: typeof cardTemplates.$inferSelect | null;
};

export async function getHistory(userId: string): Promise<HistoryEntry[]> {
  const rows = (await db
    .select({
      completion: completions,
      instance: cardInstances,
      template: cardTemplates
    })
    .from(completions)
    .leftJoin(cardInstances, eq(cardInstances.id, completions.cardInstanceId))
    .leftJoin(cardTemplates, eq(cardTemplates.id, cardInstances.templateId))
    .where(eq(completions.userId, userId))
    .orderBy(desc(completions.completedAt))) as HistoryRow[];
  return rows
    .filter(
      (row): row is {
        completion: typeof completions.$inferSelect;
        instance: typeof cardInstances.$inferSelect;
        template: typeof cardTemplates.$inferSelect;
      } => Boolean(row.instance && row.template)
    )
    .map((row) => ({
      completion: mapCompletion(row.completion),
      instance: mapInstance(row.instance),
      template: mapTemplate(row.template)
    }));
}

export async function getLeaderboard(range: 'week' | 'month' | 'all'):
  Promise<LeaderboardEntry[]> {
  const since = computeLeaderboardSince(range);
  const rows = await db
    .select({ completion: completions, user: users })
    .from(completions)
    .leftJoin(users, eq(users.id, completions.userId))
    .where(since ? gte(completions.completedAt, since) : undefined);

  const aggregates = new Map<string, LeaderboardEntry>();
  for (const row of rows) {
    if (!row.user) continue;
    const user = mapUser(row.user);
    const completedAt = row.completion.completedAt
      ? new Date(row.completion.completedAt).toISOString()
      : undefined;
    const entry = aggregates.get(user.id) ?? {
      user,
      points: 0,
      completions: 0,
      lastCompletedAt: undefined
    };
    entry.points += row.completion.pointsAwarded;
    entry.completions += 1;
    if (!entry.lastCompletedAt || (completedAt && completedAt < entry.lastCompletedAt)) {
      entry.lastCompletedAt = completedAt;
    }
    aggregates.set(user.id, entry);
  }

  return [...aggregates.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.completions !== a.completions) return b.completions - a.completions;
    if (a.lastCompletedAt && b.lastCompletedAt) {
      return new Date(a.lastCompletedAt).getTime() - new Date(b.lastCompletedAt).getTime();
    }
    if (a.lastCompletedAt) return -1;
    if (b.lastCompletedAt) return 1;
    return 0;
  });
}

function computeLeaderboardSince(range: 'week' | 'month' | 'all'): Date | undefined {
  const now = new Date();
  switch (range) {
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return undefined;
  }
}
