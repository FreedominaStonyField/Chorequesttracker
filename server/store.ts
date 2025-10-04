import { differenceInSeconds, isAfter, isBefore, startOfMonth, startOfWeek } from 'date-fns'
import { nanoid } from 'nanoid'
import type {
  CardInstance,
  CardStatus,
  CardTemplate,
  Claim,
  Completion,
  Settings,
  User,
  UserInventory,
  BadgeId,
} from '../src/shared/types.js'
import { computeFlavorText } from '../src/shared/flavor-text.js'
import {
  applyDifficultyMultiplier,
  basePointsForTemplate,
} from '../src/shared/scoring.js'
import { updateStreaks } from '../src/shared/streaks.js'
import { computeExpiry, computeNextInstanceDate } from '../src/shared/scheduling.js'
import { db, withTransaction } from './db.js'
import { HttpError } from './utils.js'

type UserRow = {
  id: string
  name: string
  color: string
  avatar_emoji: string
  join_date: string
  is_adult: number | null
  pin: string | null
  created_at: string
  updated_at: string
}

type TemplateRow = {
  id: string
  title: string
  flavor_text: string | null
  difficulty: string
  points: number
  recurrence: string
  active: number
  tags: string
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  week_anchor: number | null
  month_anchor: number | null
  require_proof: number | null
}

type InstanceRow = {
  id: string
  template_id: string
  scheduled_for: string
  status: string
  assigned_to: string | null
  created_at: string
  expires_at: string
}

type ClaimRow = {
  id: string
  card_instance_id: string
  user_id: string
  claimed_at: string
  expires_at: string
}

type CompletionRow = {
  id: string
  card_instance_id: string
  user_id: string
  completed_at: string
  proof_note: string | null
  proof_photo_url: string | null
  streaks_awarded: string | null
  points_awarded: number
}

type InventoryRow = {
  user_id: string
  items: string
  total_points: number
  badges: string
  streaks: string
}

export type FeedCard = CardInstance & {
  template: CardTemplate
  assignedUser?: User
  completion?: Completion
}

const CLAIM_GRACE_SECONDS = 60

export const store = {
  getUsers(): User[] {
    const rows = db.prepare<[], UserRow>('SELECT * FROM users ORDER BY created_at ASC').all()
    return rows.map(mapUser)
  },

  upsertUser(user: User, actorId?: string): User {
    const now = new Date().toISOString()
    const stored: User = { ...user, joinDate: user.joinDate ?? now }

    withTransaction(() => {
      db.prepare(
        `INSERT INTO users (id, name, color, avatar_emoji, join_date, is_adult, pin, created_at, updated_at)
         VALUES (@id, @name, @color, @avatarEmoji, @joinDate, @isAdult, @pin, @createdAt, @updatedAt)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           color = excluded.color,
           avatar_emoji = excluded.avatar_emoji,
           join_date = excluded.join_date,
           is_adult = excluded.is_adult,
           pin = excluded.pin,
           updated_at = excluded.updated_at`
      ).run({
        id: stored.id,
        name: stored.name,
        color: stored.color,
        avatarEmoji: stored.avatarEmoji,
        joinDate: stored.joinDate,
        isAdult: stored.isAdult ? 1 : null,
        pin: stored.pin ?? null,
        createdAt: now,
        updatedAt: now,
      })
      if (actorId ?? stored.id) {
        log(actorId ?? stored.id, 'user', stored)
      }
    })

    return stored
  },

  deleteUser(userId: string, actorId: string): void {
    withTransaction(() => {
      db.prepare('DELETE FROM users WHERE id = ?').run(userId)
      db.prepare('DELETE FROM inventories WHERE user_id = ?').run(userId)
      log(actorId, 'user.delete', { userId })
    })
  },

  getTemplates(): CardTemplate[] {
    const rows = db
      .prepare<[], TemplateRow>('SELECT * FROM templates ORDER BY created_at ASC')
      .all()
    return rows.map(mapTemplate)
  },

  upsertTemplate(template: CardTemplate, actorId: string): CardTemplate {
    const now = new Date().toISOString()
    const stored: CardTemplate = {
      ...template,
      flavorText: template.flavorText || computeFlavorText(template.title, template.tags),
      updatedAt: now,
    }

    withTransaction(() => {
      db.prepare(
        `INSERT INTO templates (
           id, title, flavor_text, difficulty, points, recurrence, active, tags, notes,
           created_by, created_at, updated_at, week_anchor, month_anchor, require_proof
         ) VALUES (
           @id, @title, @flavorText, @difficulty, @points, @recurrence, @active, @tags, @notes,
           @createdBy, @createdAt, @updatedAt, @weekAnchor, @monthAnchor, @requireProof
         )
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           flavor_text = excluded.flavor_text,
           difficulty = excluded.difficulty,
           points = excluded.points,
           recurrence = excluded.recurrence,
           active = excluded.active,
           tags = excluded.tags,
           notes = excluded.notes,
           week_anchor = excluded.week_anchor,
           month_anchor = excluded.month_anchor,
           require_proof = excluded.require_proof,
           updated_at = excluded.updated_at`
      ).run({
        ...stored,
        flavorText: stored.flavorText ?? null,
        active: stored.active ? 1 : 0,
        tags: JSON.stringify(stored.tags ?? []),
        notes: stored.notes ?? null,
        weekAnchor: stored.weekAnchor ?? null,
        monthAnchor: stored.monthAnchor ?? null,
        requireProof: stored.requireProof ? 1 : 0,
      })
      log(actorId, 'template.upsert', stored)
    })

    return stored
  },

  duplicateTemplate(templateId: string, actorId: string): CardTemplate {
    const row = db.prepare<[string], TemplateRow>('SELECT * FROM templates WHERE id = ?').get(templateId)
    if (!row) throw new HttpError(404, 'template_not_found', { id: templateId })
    const template = mapTemplate(row)
    const duplicated: CardTemplate = {
      ...template,
      id: nanoid(),
      title: `${template.title} Copy`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.upsertTemplate(duplicated, actorId)
    log(actorId, 'template.duplicate', { source: templateId, duplicated })
    return duplicated
  },

  deleteTemplate(templateId: string, actorId: string): void {
    withTransaction(() => {
      db.prepare('DELETE FROM templates WHERE id = ?').run(templateId)
      log(actorId, 'template.delete', { templateId })
    })
  },

  getInstances(): CardInstance[] {
    const rows = db.prepare<[], InstanceRow>('SELECT * FROM instances').all()
    return rows.map(mapInstance)
  },

  generateInstances(now: Date = new Date()): CardInstance[] {
    const templates = this.getTemplates().filter((template) => template.active)
    const settings = this.getSettings()
    const created: CardInstance[] = []

    withTransaction(() => {
      for (const template of templates) {
        const scheduled = computeNextInstanceDate(template, now, settings)
        if (!scheduled) continue
        const exists = db
          .prepare<[string, string], InstanceRow>(
            'SELECT * FROM instances WHERE template_id = ? AND DATE(scheduled_for) = DATE(?) LIMIT 1'
          )
          .get(template.id, scheduled.toISOString())
        if (exists) continue
        const instance: CardInstance = {
          id: nanoid(),
          templateId: template.id,
          scheduledFor: scheduled.toISOString(),
          status: 'available',
          createdAt: now.toISOString(),
          assignedTo: undefined,
          expiresAt: computeExpiry(template, scheduled, settings).toISOString(),
        }
        db.prepare(
          `INSERT INTO instances (id, template_id, scheduled_for, status, assigned_to, created_at, expires_at)
           VALUES (@id, @templateId, @scheduledFor, @status, @assignedTo, @createdAt, @expiresAt)`
        ).run({ ...instance, assignedTo: instance.assignedTo ?? null })
        created.push(instance)
      }
    })

    return created
  },

  getFeed(now: Date = new Date()): FeedCard[] {
    this.generateInstances(now)
    const instances = this.getInstances()
    const templates = this.getTemplates()
    const users = this.getUsers()
    const completions = db
      .prepare<[], CompletionRow>('SELECT * FROM completions')
      .all()
      .map(mapCompletion)

    return instances
      .map((instance) => {
        const template = templates.find((t) => t.id === instance.templateId)
        if (!template) return undefined
      const assignedUser = instance.assignedTo
        ? users.find((user) => user.id === instance.assignedTo)
        : undefined
      const completion = completions.find((entry) => entry.cardInstanceId === instance.id)
        return {
          ...instance,
          template: template!,
          assignedUser,
          completion,
        }
      })
      .filter(Boolean) as FeedCard[]
  },

  claimCard(cardId: string, userId: string): Claim {
    const instanceRow = db.prepare<[string], InstanceRow>('SELECT * FROM instances WHERE id = ?').get(cardId)
    if (!instanceRow) throw new HttpError(404, 'quest_not_found', { cardId })
    const instance = mapInstance(instanceRow)
    if (instance.status !== 'available') {
      throw new HttpError(409, 'quest_claimed', { status: instance.status })
    }

    const claim: Claim = {
      id: nanoid(),
      cardInstanceId: cardId,
      userId,
      claimedAt: new Date().toISOString(),
      expiresAt: addSeconds(new Date(), CLAIM_GRACE_SECONDS).toISOString(),
    }

    withTransaction(() => {
      const conflict = db
        .prepare<[string], ClaimRow>('SELECT * FROM claims WHERE card_instance_id = ? LIMIT 1')
        .get(cardId)
      if (conflict) throw new HttpError(409, 'claim_conflict', { cardId })
      db.prepare(
        'INSERT INTO claims (id, card_instance_id, user_id, claimed_at, expires_at) VALUES (@id, @cardInstanceId, @userId, @claimedAt, @expiresAt)'
      ).run(claim)
      db.prepare('UPDATE instances SET status = ?, assigned_to = ? WHERE id = ?').run('claimed', userId, cardId)
    })

    log(userId, 'card.claim', { claim })
    return claim
  },

  undoClaim(claimId: string, userId: string): void {
    const claimRow = db.prepare<[string], ClaimRow>('SELECT * FROM claims WHERE id = ?').get(claimId)
    if (!claimRow) return
    const seconds = differenceInSeconds(new Date(), new Date(claimRow.claimed_at))
    if (seconds > CLAIM_GRACE_SECONDS) {
      throw new HttpError(400, 'undo_window_closed', { seconds })
    }

    withTransaction(() => {
      db.prepare('DELETE FROM claims WHERE id = ?').run(claimId)
      db.prepare('UPDATE instances SET status = ?, assigned_to = NULL WHERE id = ?').run('available', claimRow.card_instance_id)
    })

    log(userId, 'card.claim.undo', { claimId })
  },

  completeCard(cardId: string, userId: string, proof?: { note?: string; photoUrl?: string }): Completion {
    const instanceRow = db.prepare<[string], InstanceRow>('SELECT * FROM instances WHERE id = ?').get(cardId)
    if (!instanceRow) throw new HttpError(404, 'quest_not_found', { cardId })
    const instance = mapInstance(instanceRow)
    if (instance.assignedTo && instance.assignedTo !== userId) {
      throw new HttpError(403, 'not_assigned', { assignedTo: instance.assignedTo })
    }
    if (instance.status === 'completed') {
      throw new HttpError(400, 'quest_completed')
    }
    const templateRow = db.prepare<[string], TemplateRow>('SELECT * FROM templates WHERE id = ?').get(instance.templateId)
    if (!templateRow) throw new HttpError(404, 'template_not_found', { id: instance.templateId })
    const template = mapTemplate(templateRow)
    const inventory = this.getInventory(userId)
    const points = applyDifficultyMultiplier(template.difficulty, basePointsForTemplate(template))
    const completion: Completion = {
      id: nanoid(),
      cardInstanceId: cardId,
      userId,
      completedAt: new Date().toISOString(),
      proofNote: proof?.note,
      proofPhotoUrl: proof?.photoUrl,
      streaksAwarded: undefined,
      pointsAwarded: points,
    }

    withTransaction(() => {
      db.prepare('UPDATE instances SET status = ?, assigned_to = ? WHERE id = ?').run('completed', userId, cardId)
      db.prepare(
        `INSERT INTO completions (id, card_instance_id, user_id, completed_at, proof_note, proof_photo_url, streaks_awarded, points_awarded)
         VALUES (@id, @cardInstanceId, @userId, @completedAt, @proofNote, @proofPhotoUrl, @streaksAwarded, @pointsAwarded)`
      ).run({
        ...completion,
        proofNote: completion.proofNote ?? null,
        proofPhotoUrl: completion.proofPhotoUrl ?? null,
        streaksAwarded: null,
      })
      const streakUpdate = updateStreaks(template.recurrence, inventory.streaks)
      const updatedInventory: UserInventory = {
        ...inventory,
        items: updateInventoryItems(inventory.items, template.id),
        totalPoints: inventory.totalPoints + points,
        streaks: streakUpdate.state,
        badges: inventory.badges,
      }
      updatedInventory.badges = awardBadges(updatedInventory, completion)
      db.prepare(
        `INSERT INTO inventories (user_id, items, total_points, badges, streaks)
         VALUES (@userId, @items, @totalPoints, @badges, @streaks)
         ON CONFLICT(user_id) DO UPDATE SET
           items = excluded.items,
           total_points = excluded.total_points,
           badges = excluded.badges,
           streaks = excluded.streaks`
      ).run({
        userId,
        items: JSON.stringify(updatedInventory.items),
        totalPoints: updatedInventory.totalPoints,
        badges: JSON.stringify(updatedInventory.badges),
        streaks: JSON.stringify(updatedInventory.streaks),
      })
      completion.streaksAwarded = streakUpdate.snapshot
      db.prepare('UPDATE completions SET streaks_awarded = ? WHERE id = ?').run(
        JSON.stringify(completion.streaksAwarded ?? {}),
        completion.id
      )
    })

    log(userId, 'card.complete', { completion })
    return completion
  },

  getInventory(userId: string): UserInventory {
    const row = db.prepare<[string], InventoryRow>('SELECT * FROM inventories WHERE user_id = ?').get(userId)
    if (!row) {
      const inventory: UserInventory = {
        userId,
        items: [],
        totalPoints: 0,
        badges: [],
        streaks: { daily: 0, weekly: 0, monthly: 0, once: 0, longest: {} },
      }
      db.prepare(
        'INSERT OR IGNORE INTO inventories (user_id, items, total_points, badges, streaks) VALUES (?, ?, ?, ?, ?)'
      ).run(userId, '[]', 0, '[]', JSON.stringify(inventory.streaks))
      return inventory
    }
    return mapInventory(row)
  },

  getHistory(userId: string) {
    const completions = db
      .prepare<[string], CompletionRow>('SELECT * FROM completions WHERE user_id = ?')
      .all(userId)
      .map(mapCompletion)
    const instances = this.getInstances()
    const templates = this.getTemplates()
    return completions.map((completion) => {
      const instance = instances.find((entry) => entry.id === completion.cardInstanceId)
      const template = templates.find((entry) => entry?.id === instance?.templateId)
      return { completion, instance: instance!, template: template! }
    })
  },

  getLeaderboard(range: 'week' | 'month' | 'all', now: Date = new Date()) {
    const completions = db
      .prepare<[], CompletionRow>('SELECT * FROM completions')
      .all()
      .map(mapCompletion)
    const users = this.getUsers()

    const filtered = completions.filter((completion) => {
      const completedAt = new Date(completion.completedAt)
      switch (range) {
        case 'week':
          return isAfter(completedAt, startOfWeek(now, { weekStartsOn: 1 }))
        case 'month':
          return isAfter(completedAt, startOfMonth(now))
        default:
          return true
      }
    })

    const scores = new Map<string, { points: number; completions: number; earliest: Date }>()

    for (const completion of filtered) {
      const entry = scores.get(completion.userId) ?? {
        points: 0,
        completions: 0,
        earliest: new Date(completion.completedAt),
      }
      entry.points += completion.pointsAwarded
      entry.completions += 1
      entry.earliest = isBefore(new Date(completion.completedAt), entry.earliest)
        ? new Date(completion.completedAt)
        : entry.earliest
      scores.set(completion.userId, entry)
    }

    return [...scores.entries()]
      .map(([userId, data]) => ({ user: users.find((u) => u.id === userId)!, ...data }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points
        if (b.completions !== a.completions) return b.completions - a.completions
        return a.earliest.getTime() - b.earliest.getTime()
      })
  },

  saveSettings(settings: Settings): void {
    withTransaction(() => {
      db.prepare(
        `INSERT INTO settings (id, refresh_hour, week_anchor, month_anchor, proof_required_template_ids)
         VALUES (1, @refreshHour, @weekAnchor, @monthAnchor, @proofRequiredTemplateIds)
         ON CONFLICT(id) DO UPDATE SET
           refresh_hour = excluded.refresh_hour,
           week_anchor = excluded.week_anchor,
           month_anchor = excluded.month_anchor,
           proof_required_template_ids = excluded.proof_required_template_ids`
      ).run({
        refreshHour: settings.refreshHour,
        weekAnchor: settings.weekAnchor,
        monthAnchor: settings.monthAnchor,
        proofRequiredTemplateIds: JSON.stringify(settings.proofRequiredTemplateIds ?? []),
      })
    })
  },

  getSettings(): Settings {
    const row = db.prepare('SELECT * FROM settings WHERE id = 1').get() as
      | { refresh_hour: number; week_anchor: number; month_anchor: number; proof_required_template_ids: string }
      | undefined

    if (!row) {
      return {
        refreshHour: 0,
        weekAnchor: 1,
        monthAnchor: 1,
        proofRequiredTemplateIds: [],
      }
    }

    return {
      refreshHour: row.refresh_hour,
      weekAnchor: row.week_anchor,
      monthAnchor: row.month_anchor,
      proofRequiredTemplateIds: JSON.parse(row.proof_required_template_ids ?? '[]'),
    }
  },

  seed(sampleData: { users: User[]; templates: CardTemplate[] }): void {
    withTransaction(() => {
      for (const user of sampleData.users) {
        this.upsertUser(user)
      }
      for (const template of sampleData.templates) {
        this.upsertTemplate(template, 'system')
      }
    })
  },

  hasUsers(): boolean {
    const row = db.prepare<[], { count: number }>('SELECT COUNT(*) as count FROM users').get()
    return Boolean(row && row.count)
  },

  findUserByPin(pin: string): User | undefined {
    const row = db.prepare<[string], UserRow>('SELECT * FROM users WHERE pin = ? LIMIT 1').get(pin)
    return row ? mapUser(row) : undefined
  },
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    avatarEmoji: row.avatar_emoji,
    joinDate: row.join_date,
    isAdult: row.is_adult ? Boolean(row.is_adult) : undefined,
    pin: row.pin ?? undefined,
  }
}

function mapTemplate(row: TemplateRow): CardTemplate {
  return {
    id: row.id,
    title: row.title,
    flavorText: row.flavor_text ?? undefined,
    difficulty: row.difficulty as CardTemplate['difficulty'],
    points: row.points,
    recurrence: row.recurrence as CardTemplate['recurrence'],
    active: Boolean(row.active),
    tags: JSON.parse(row.tags ?? '[]'),
    notes: row.notes ?? undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    weekAnchor: row.week_anchor ?? undefined,
    monthAnchor: row.month_anchor ?? undefined,
    requireProof: row.require_proof ? Boolean(row.require_proof) : undefined,
  }
}

function mapInstance(row: InstanceRow): CardInstance {
  return {
    id: row.id,
    templateId: row.template_id,
    scheduledFor: row.scheduled_for,
    status: row.status as CardStatus,
    assignedTo: row.assigned_to ?? undefined,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }
}

function mapCompletion(row: CompletionRow): Completion {
  return {
    id: row.id,
    cardInstanceId: row.card_instance_id,
    userId: row.user_id,
    completedAt: row.completed_at,
    proofNote: row.proof_note ?? undefined,
    proofPhotoUrl: row.proof_photo_url ?? undefined,
    streaksAwarded: row.streaks_awarded ? JSON.parse(row.streaks_awarded) : undefined,
    pointsAwarded: row.points_awarded,
  }
}

function mapInventory(row: InventoryRow): UserInventory {
  return {
    userId: row.user_id,
    items: JSON.parse(row.items ?? '[]'),
    totalPoints: row.total_points,
    badges: JSON.parse(row.badges ?? '[]'),
    streaks: JSON.parse(row.streaks ?? '{}'),
  }
}

function addSeconds(date: Date, seconds: number) {
  return new Date(date.getTime() + seconds * 1000)
}

function updateInventoryItems(items: UserInventory['items'], templateId: string): UserInventory['items'] {
  const existing = items.find((item) => item.templateId === templateId)
  if (existing) {
    existing.timesCompleted += 1
    existing.lastCompletedAt = new Date().toISOString()
    return [...items]
  }
  return [...items, { templateId, timesCompleted: 1, lastCompletedAt: new Date().toISOString() }]
}

function awardBadges(inventory: UserInventory, completion: Completion) {
  const badges = [...(inventory.badges ?? [])]
  const push = (badgeId: BadgeId, details?: Record<string, unknown>) => {
    if (badges.some((badge) => badge.badgeId === badgeId)) return
    badges.push({ id: nanoid(), badgeId, unlockedAt: new Date().toISOString(), details })
  }

  if (!badges.length) {
    push('first-blood')
  }
  if (new Date(completion.completedAt).getHours() < 8) {
    push('early-bird')
  }
  if (inventory.streaks.daily >= 7) {
    push('iron-week', { streak: inventory.streaks.daily })
  }
  return badges
}

function log(actorUserId: string, type: string, payload: unknown) {
  const entryId = nanoid()
  db.prepare(
    'INSERT INTO audit_log (id, entry_type, actor_user_id, at, payload) VALUES (?, ?, ?, ?, ?)' //
  ).run(entryId, type, actorUserId, new Date().toISOString(), JSON.stringify(payload))
}

