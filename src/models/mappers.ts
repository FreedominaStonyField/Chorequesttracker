import type {
  AuditLog,
  CardInstance,
  CardTemplate,
  Claim,
  Completion,
  Settings,
  User,
  UserInventory,
  UserWithSecret
} from './types.js';
import type {
  auditLog,
  cardInstances,
  cardTemplates,
  claims,
  completions,
  settings as settingsTable,
  userInventories,
  users
} from '../db/schema.js';

function toIso(value: Date | number | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
}

export function mapUser(row: typeof users.$inferSelect): User {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    avatarEmoji: row.avatarEmoji,
    joinDate: toIso(row.joinDate) ?? new Date().toISOString(),
    isAdult: row.isAdult ?? undefined
  };
}

export function mapUserWithSecret(row: typeof users.$inferSelect): UserWithSecret {
  return {
    ...mapUser(row),
    pinHash: row.pinHash
  };
}

export function mapTemplate(row: typeof cardTemplates.$inferSelect): CardTemplate {
  return {
    id: row.id,
    title: row.title,
    flavorText: row.flavorText ?? undefined,
    difficulty: row.difficulty as CardTemplate['difficulty'],
    points: row.points,
    recurrence: row.recurrence as CardTemplate['recurrence'],
    active: row.active,
    tags: (row.tags as string[] | null) ?? [],
    notes: row.notes ?? undefined,
    createdBy: row.createdBy ?? '',
    createdAt: toIso(row.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(row.updatedAt) ?? new Date().toISOString(),
    weekAnchor: row.weekAnchor ? Number(row.weekAnchor) : undefined,
    monthAnchor: row.monthAnchor ? Number(row.monthAnchor) : undefined,
    requireProof: row.requireProof ?? undefined
  };
}

export function mapInstance(row: typeof cardInstances.$inferSelect): CardInstance {
  return {
    id: row.id,
    templateId: row.templateId,
    scheduledFor: toIso(row.scheduledFor) ?? new Date().toISOString(),
    status: row.status as CardInstance['status'],
    assignedTo: row.assignedTo ?? undefined,
    createdAt: toIso(row.createdAt) ?? new Date().toISOString(),
    expiresAt: toIso(row.expiresAt) ?? undefined
  };
}

export function mapClaim(row: typeof claims.$inferSelect): Claim {
  return {
    id: row.id,
    cardInstanceId: row.cardInstanceId,
    userId: row.userId,
    claimedAt: toIso(row.claimedAt) ?? new Date().toISOString(),
    expiresAt: toIso(row.expiresAt)
  };
}

export function mapCompletion(row: typeof completions.$inferSelect): Completion {
  return {
    id: row.id,
    cardInstanceId: row.cardInstanceId,
    userId: row.userId,
    completedAt: toIso(row.completedAt) ?? new Date().toISOString(),
    proofNote: row.proofNote ?? undefined,
    proofPhotoUrl: row.proofPhotoUrl ?? undefined,
    streaksAwarded: (row.streaksAwarded as Completion['streaksAwarded']) ?? undefined,
    pointsAwarded: row.pointsAwarded
  };
}

export function mapInventory(row: typeof userInventories.$inferSelect): UserInventory {
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

export function mapSettings(row: typeof settingsTable.$inferSelect): Settings {
  return {
    refreshHour: row.refreshHour,
    weekAnchor: Number(row.weekAnchor),
    monthAnchor: Number(row.monthAnchor),
    proofRequiredTemplateIds: (row.proofRequiredTemplateIds as string[] | null) ?? []
  };
}

export function mapAudit(row: typeof auditLog.$inferSelect): AuditLog {
  return {
    id: row.id,
    type: row.type as AuditLog['type'],
    actorUserId: row.actorUserId ?? undefined,
    at: toIso(row.at) ?? new Date().toISOString(),
    payload: (row.payload as AuditLog['payload']) ?? {}
  };
}
