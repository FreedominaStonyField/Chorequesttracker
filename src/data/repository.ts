import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  isAfter,
  isBefore,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
  differenceInSeconds,
} from 'date-fns'
import { nanoid } from 'nanoid'
import { db } from './db'
import type {
  AuditLog,
  BadgeId,
  CardInstance,
  CardStatus,
  CardTemplate,
  Claim,
  Completion,
  Settings,
  User,
  UserInventory,
} from '../types'
import { computeFlavorText } from '../lib/flavor-text'
import { applyDifficultyMultiplier, basePointsForTemplate } from '../lib/scoring'
import { updateStreaks } from '../lib/streaks'

const CLAIM_GRACE_SECONDS = 60

export interface FeedCard extends CardInstance {
  template: CardTemplate
  assignedUser?: User
  completion?: Completion
}

export const repository = {
  async getUsers() {
    return db.users.toArray()
  },

  async upsertUser(user: User, actorId?: string) {
    await db.users.put(user)
    await log(actorId ?? user.id, 'user', user)
    return user
  },

  async deleteUser(userId: string, actorId: string) {
    await db.transaction('rw', db.users, db.inventories, async () => {
      await db.users.delete(userId)
      await db.inventories.delete(userId)
    })
    await log(actorId, 'user.delete', { userId })
  },

  async getTemplates() {
    return db.templates.toArray()
  },

  async upsertTemplate(template: CardTemplate, actorId: string) {
    const now = new Date().toISOString()
    const stored: CardTemplate = {
      ...template,
      flavorText: template.flavorText || computeFlavorText(template.title, template.tags),
      updatedAt: now,
    }
    await db.templates.put(stored)
    await log(actorId, 'template.upsert', stored)
    return stored
  },

  async duplicateTemplate(templateId: string, actorId: string) {
    const template = await db.templates.get(templateId)
    if (!template) throw new Error('Template not found')
    const duplicated: CardTemplate = {
      ...template,
      id: nanoid(),
      title: `${template.title} Copy`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await db.templates.put(duplicated)
    await log(actorId, 'template.duplicate', { source: templateId, duplicated })
    return duplicated
  },

  async deleteTemplate(templateId: string, actorId: string) {
    await db.transaction('rw', db.templates, db.instances, db.claims, db.completions, db.inventories, db.settings, async () => {
      const instances = await db.instances.where('templateId').equals(templateId).toArray()
      const instanceIds = instances.map((instance) => instance.id)
      let affectedUserIds = new Set<string>()

      if (instanceIds.length > 0) {
        const relatedCompletions = await db.completions.where('cardInstanceId').anyOf(instanceIds).toArray()
        affectedUserIds = new Set(relatedCompletions.map((completion) => completion.userId))
        await db.claims.where('cardInstanceId').anyOf(instanceIds).delete()
        await db.completions.where('cardInstanceId').anyOf(instanceIds).delete()
        await db.instances.bulkDelete(instanceIds)
      }

      await db.templates.delete(templateId)

      const settings = await getSettings()
      if (settings.proofRequiredTemplateIds.includes(templateId)) {
        const nextSettings: Settings = {
          ...settings,
          proofRequiredTemplateIds: settings.proofRequiredTemplateIds.filter((id) => id !== templateId),
        }
        await db.settings.clear()
        await db.settings.add(nextSettings)
      }

      for (const userId of affectedUserIds) {
        const inventory = await rebuildInventory(userId)
        await db.inventories.put(inventory)
      }
    })
    await log(actorId, 'template.delete', { templateId })
  },

  async getInstances() {
    return db.instances.toArray()
  },

  async generateInstances(now: Date = new Date()) {
    const templates = (await db.templates.toArray()).filter((template) => template.active)
    const settings = await getSettings()
    const created: CardInstance[] = []

    await db.transaction('rw', db.instances, async () => {
      for (const template of templates) {
        const scheduled = computeNextInstanceDate(template, now, settings)
        if (!scheduled) continue
        const alreadyExists = await db.instances
          .where({ templateId: template.id })
          .filter((instance) => isSameDay(new Date(instance.scheduledFor), scheduled))
          .first()
        if (alreadyExists) continue
        const instance: CardInstance = {
          id: nanoid(),
          templateId: template.id,
          scheduledFor: scheduled.toISOString(),
          status: 'available',
          createdAt: now.toISOString(),
          assignedTo: undefined,
          expiresAt: computeExpiry(template, scheduled, settings).toISOString(),
        }
        await db.instances.put(instance)
        created.push(instance)
      }
    })

    return created
  },

  async getFeed(now: Date = new Date()): Promise<FeedCard[]> {
    await repository.generateInstances(now)
    const [instances, templates, users, completions] = await Promise.all([
      db.instances.toArray(),
      db.templates.toArray(),
      db.users.toArray(),
      db.completions.toArray(),
    ])

    const cards: FeedCard[] = []
    for (const instance of instances) {
      const template = templates.find((t) => t.id === instance.templateId)
      if (!template) continue
      const assignedUser = instance.assignedTo
        ? users.find((user) => user.id === instance.assignedTo)
        : undefined
      const completion = completions.find((c) => c.cardInstanceId === instance.id)
      cards.push({ ...instance, template, assignedUser, completion })
    }
    return cards
  },

  async claimCard(cardId: string, userId: string) {
    const instance = await db.instances.get(cardId)
    if (!instance) throw new Error('Quest not found')
    if (instance.status !== 'available') throw new Error('Quest already claimed')

    const claim: Claim = {
      id: nanoid(),
      cardInstanceId: cardId,
      userId,
      claimedAt: new Date().toISOString(),
      expiresAt: addSeconds(new Date(), CLAIM_GRACE_SECONDS).toISOString(),
    }

    await db.transaction('rw', db.instances, db.claims, async () => {
      const conflict = await db.claims.where('cardInstanceId').equals(cardId).first()
      if (conflict) throw new Error('Another hero was quicker!')
      await db.claims.put(claim)
      await db.instances.update(cardId, { status: 'claimed', assignedTo: userId })
    })

    await log(userId, 'card.claim', { claim })
    return claim
  },

  async undoClaim(claimId: string, userId: string) {
    const claim = await db.claims.get(claimId)
    if (!claim) return
    const seconds = differenceInSeconds(new Date(), new Date(claim.claimedAt))
    if (seconds > CLAIM_GRACE_SECONDS) {
      throw new Error('Undo window closed')
    }
    await db.transaction('rw', db.claims, db.instances, async () => {
      await db.claims.delete(claimId)
      await db.instances.update(claim.cardInstanceId, { status: 'available', assignedTo: undefined })
    })
    await log(userId, 'card.claim.undo', { claimId })
  },

  async completeCard(cardId: string, userId: string, proof?: { note?: string; photoUrl?: string }) {
    const instance = await db.instances.get(cardId)
    if (!instance) throw new Error('Quest not found')
    if (instance.assignedTo && instance.assignedTo !== userId) {
      throw new Error('Only the assigned hero may complete this quest')
    }
    if (instance.status === 'completed') {
      throw new Error('Quest already complete')
    }
    const template = await db.templates.get(instance.templateId)
    if (!template) throw new Error('Quest template missing')

    const inventory = await repository.getInventory(userId)
    const points = applyDifficultyMultiplier(template.difficulty, basePointsForTemplate(template))
    const completion: Completion = {
      id: nanoid(),
      cardInstanceId: cardId,
      userId,
      completedAt: new Date().toISOString(),
      proofNote: proof?.note,
      proofPhotoUrl: proof?.photoUrl,
      pointsAwarded: points,
      streaksAwarded: undefined,
    }

    await db.transaction('rw', db.instances, db.completions, db.inventories, async () => {
      await db.instances.update(cardId, { status: 'completed' as CardStatus })
      await db.completions.put(completion)
      const streakUpdate = updateStreaks(template.recurrence, inventory.streaks)
      const updatedInventory: UserInventory = {
        ...inventory,
        items: updateInventoryItems(inventory.items, template.id, completion.completedAt),
        totalPoints: inventory.totalPoints + points,
        streaks: streakUpdate.state,
      }
      updatedInventory.badges = awardBadges(updatedInventory, completion, completion.completedAt)
      await db.inventories.put(updatedInventory)
      completion.streaksAwarded = streakUpdate.snapshot
    })

    await log(userId, 'card.complete', { completion })
    return completion
  },

  async getInventory(userId: string) {
    let inventory = await db.inventories.get(userId)
    if (!inventory) {
      inventory = {
        userId,
        items: [],
        totalPoints: 0,
        badges: [],
        streaks: { daily: 0, weekly: 0, monthly: 0, once: 0, longest: {} },
      }
      await db.inventories.put(inventory)
    }
    return inventory
  },

  async getHistory(userId: string) {
    const [completions, instances, templates] = await Promise.all([
      db.completions.where('userId').equals(userId).toArray(),
      db.instances.toArray(),
      db.templates.toArray(),
    ])
    const instanceMap = new Map(instances.map((instance) => [instance.id, instance]))
    const templateMap = new Map(templates.map((template) => [template.id, template]))
    return completions
      .map((completion) => {
        const instance = instanceMap.get(completion.cardInstanceId)
        if (!instance) return null
        const template = templateMap.get(instance.templateId)
        if (!template) return null
        return { completion, instance, template }
      })
      .filter((entry): entry is { completion: Completion; instance: CardInstance; template: CardTemplate } => entry !== null)
  },

  async getLeaderboard(range: 'week' | 'month' | 'all', now: Date = new Date()) {
    const [completions, users] = await Promise.all([db.completions.toArray(), db.users.toArray()])

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

  async saveSettings(settings: Settings) {
    await db.settings.clear()
    await db.settings.add(settings)
  },

  async getSettings() {
    return getSettings()
  },

  async seed(sampleData: { users: User[]; templates: CardTemplate[] }) {
    await db.transaction('rw', db.users, db.templates, async () => {
      await db.users.bulkPut(sampleData.users)
      await db.templates.bulkPut(sampleData.templates)
    })
  },
}

async function getSettings(): Promise<Settings> {
  const existing = await db.settings.limit(1).first()
  return (
    existing ?? {
      refreshHour: 0,
      weekAnchor: 1,
      monthAnchor: 1,
      proofRequiredTemplateIds: [],
    }
  )
}

export function computeNextInstanceDate(template: CardTemplate, now: Date, settings: Settings): Date | null {
  const today = startOfDay(now)
  switch (template.recurrence) {
    case 'once':
      return today
    case 'daily':
      return today
    case 'weekly': {
      const anchor = template.weekAnchor ?? settings.weekAnchor
      const currentDay = now.getDay()
      const diff = (anchor - currentDay + 7) % 7
      return startOfDay(addDays(now, diff))
    }
    case 'monthly': {
      const anchor = template.monthAnchor ?? settings.monthAnchor
      const candidate = new Date(now.getFullYear(), now.getMonth(), anchor)
      if (candidate.getMonth() !== now.getMonth()) {
        return startOfDay(endOfMonth(now))
      }
      return startOfDay(candidate)
    }
    default:
      return null
  }
}

export function computeExpiry(template: CardTemplate, scheduled: Date, settings: Settings): Date {
  switch (template.recurrence) {
    case 'once':
    case 'daily':
      return endOfDay(scheduled)
    case 'weekly':
      return endOfWeek(scheduled, { weekStartsOn: settings.weekAnchor as 0 | 1 | 2 | 3 | 4 | 5 | 6 })
    case 'monthly':
      return endOfMonth(scheduled)
    default:
      return endOfDay(scheduled)
  }
}

function addSeconds(date: Date, seconds: number) {
  return new Date(date.getTime() + seconds * 1000)
}

function updateInventoryItems(
  items: UserInventory['items'],
  templateId: string,
  completedAt: string = new Date().toISOString(),
): UserInventory['items'] {
  const existing = items.find((item) => item.templateId === templateId)
  if (existing) {
    existing.timesCompleted += 1
    existing.lastCompletedAt = completedAt
    return [...items]
  }
  return [...items, { templateId, timesCompleted: 1, lastCompletedAt: completedAt }]
}

function awardBadges(inventory: UserInventory, completion: Completion, awardedAt: string = new Date().toISOString()) {
  const badges = [...(inventory.badges ?? [])]
  const push = (badgeId: BadgeId, details?: Record<string, unknown>) => {
    if (badges.some((badge) => badge.badgeId === badgeId)) return
    badges.push({ id: nanoid(), badgeId, unlockedAt: awardedAt, details })
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

async function log(actorUserId: string, type: string, payload: unknown) {
  const entry: AuditLog = {
    id: nanoid(),
    type: 'action',
    actorUserId,
    at: new Date().toISOString(),
    payload: { type, payload },
  }
  await db.auditLog.put(entry)
}

async function rebuildInventory(userId: string): Promise<UserInventory> {
  const base: UserInventory = {
    userId,
    items: [],
    totalPoints: 0,
    badges: [],
    streaks: { daily: 0, weekly: 0, monthly: 0, once: 0, longest: {} },
  }
  const completions = await db.completions.where('userId').equals(userId).sortBy('completedAt')
  let inventory = base
  for (const completion of completions) {
    const instance = await db.instances.get(completion.cardInstanceId)
    if (!instance) continue
    const template = await db.templates.get(instance.templateId)
    if (!template) continue
    const streakUpdate = updateStreaks(template.recurrence, inventory.streaks)
    const updated: UserInventory = {
      ...inventory,
      badges: [...inventory.badges],
      items: updateInventoryItems(inventory.items, template.id, completion.completedAt),
      totalPoints: inventory.totalPoints + completion.pointsAwarded,
      streaks: streakUpdate.state,
    }
    updated.badges = awardBadges(updated, completion, completion.completedAt)
    inventory = updated
  }
  return inventory
}
