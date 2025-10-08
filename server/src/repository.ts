import { addDays, differenceInSeconds, endOfDay, endOfMonth, endOfWeek, isSameDay, startOfDay } from 'date-fns'
import { nanoid } from 'nanoid'
import { EventEmitter } from 'node:events'
import {
  initializeDatabase,
  readAll,
  readById,
  readSettings,
  remove,
  replaceAll,
  upsert,
  writeSettings,
} from './database'
import { computeFlavorText } from './lib/flavor-text'
import { applyDifficultyMultiplier, basePointsForTemplate } from './lib/scoring'
import { updateStreaks } from './lib/streaks'
import type {
  BadgeId,
  CardInstance,
  CardStatus,
  CardTemplate,
  Claim,
  Completion,
  FeedCard,
  RepositoryEvent,
  Settings,
  User,
  UserInventory,
} from 'shared/types'

initializeDatabase()

const CLAIM_GRACE_SECONDS = 60

interface RepositoryEventMap {
  event: [RepositoryEvent]
}

export const repositoryEvents = new EventEmitter<RepositoryEventMap>()

function emit<T>(type: RepositoryEvent['type'], payload: T) {
  repositoryEvents.emit('event', { type, payload })
}

export const repository = {
  async getUsers() {
    return readAll<User>('users')
  },

  async upsertUser(user: User, actorId?: string) {
    upsert('users', user)
    emit('user.upsert', { user, actorId })
    return user
  },

  async deleteUser(userId: string, actorId: string) {
    const transaction = (id: string) => {
      remove('users', id)
      remove('inventories', id)
    }
    transaction(userId)
    emit('user.delete', { userId, actorId })
  },

  async getTemplates() {
    return readAll<CardTemplate>('templates')
  },

  async upsertTemplate(template: CardTemplate, actorId: string) {
    const now = new Date().toISOString()
    const stored: CardTemplate = {
      ...template,
      flavorText: template.flavorText || computeFlavorText(template.title, template.tags),
      updatedAt: now,
    }
    upsert('templates', stored)
    emit('template.upsert', { template: stored, actorId })
    return stored
  },

  async duplicateTemplate(templateId: string, actorId: string) {
    const existing = readById<CardTemplate>('templates', templateId)
    if (!existing) throw new Error('Template not found')
    const now = new Date().toISOString()
    const duplicated: CardTemplate = {
      ...existing,
      id: nanoid(),
      title: `${existing.title} Copy`,
      createdAt: now,
      updatedAt: now,
    }
    upsert('templates', duplicated)
    emit('template.duplicate', { sourceId: templateId, template: duplicated, actorId })
    return duplicated
  },

  async deleteTemplate(templateId: string, actorId: string) {
    remove('templates', templateId)
    emit('template.delete', { templateId, actorId })
  },

  async getInstances() {
    return readAll<CardInstance>('instances')
  },

  async generateInstances(now: Date = new Date()) {
    const templates = readAll<CardTemplate>('templates').filter((template) => template.active)
    const settings = readSettings()
    const created: CardInstance[] = []
    const instances = readAll<CardInstance>('instances')

    for (const template of templates) {
      const scheduled = computeNextInstanceDate(template, now, settings)
      if (!scheduled) continue
      const alreadyExists = instances.find(
        (instance) =>
          instance.templateId === template.id &&
          isSameDay(new Date(instance.scheduledFor), scheduled)
      )
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
      upsert('instances', instance)
      created.push(instance)
      instances.push(instance)
    }

    if (created.length) {
      emit('instances.generated', { instances: created })
    }

    return created
  },

  async getFeed(now: Date = new Date()): Promise<FeedCard[]> {
    await repository.generateInstances(now)
    const [instances, templates, users, completions] = [
      readAll<CardInstance>('instances'),
      readAll<CardTemplate>('templates'),
      readAll<User>('users'),
      readAll<Completion>('completions'),
    ]

    return instances.map((instance) => {
      const template = templates.find((t) => t.id === instance.templateId)
      const assignedUser = instance.assignedTo
        ? users.find((user) => user.id === instance.assignedTo)
        : undefined
      const completion = completions.find((c) => c.cardInstanceId === instance.id)
      return {
        ...instance,
        template: template!,
        assignedUser,
        completion,
      }
    })
  },

  async claimCard(cardId: string, userId: string) {
    const instance = readById<CardInstance>('instances', cardId)
    if (!instance) throw new Error('Quest not found')
    if (instance.status !== 'available') throw new Error('Quest already claimed')

    const existingClaim = readAll<Claim>('claims').find((claim) => claim.cardInstanceId === cardId)
    if (existingClaim) throw new Error('Another hero was quicker!')

    const claim: Claim = {
      id: nanoid(),
      cardInstanceId: cardId,
      userId,
      claimedAt: new Date().toISOString(),
      expiresAt: addSeconds(new Date(), CLAIM_GRACE_SECONDS).toISOString(),
    }

    const updatedInstance: CardInstance = { ...instance, status: 'claimed', assignedTo: userId }

    upsert('claims', claim)
    upsert('instances', updatedInstance)

    emit('card.claim', { claim })
    emit('instance.update', { instance: updatedInstance })

    return claim
  },

  async undoClaim(claimId: string, userId: string) {
    const claim = readById<Claim>('claims', claimId)
    if (!claim) return
    const seconds = differenceInSeconds(new Date(), new Date(claim.claimedAt))
    if (seconds > CLAIM_GRACE_SECONDS) {
      throw new Error('Undo window closed')
    }
    const instance = readById<CardInstance>('instances', claim.cardInstanceId)
    if (!instance) return
    const updatedInstance: CardInstance = { ...instance, status: 'available', assignedTo: undefined }

    remove('claims', claimId)
    upsert('instances', updatedInstance)

    emit('card.claim.undo', { claimId, userId })
    emit('instance.update', { instance: updatedInstance })
  },

  async completeCard(cardId: string, userId: string, proof?: { note?: string; photoUrl?: string }) {
    const instance = readById<CardInstance>('instances', cardId)
    if (!instance) throw new Error('Quest not found')
    if (instance.assignedTo && instance.assignedTo !== userId) {
      throw new Error('Only the assigned hero may complete this quest')
    }
    if (instance.status === 'completed') {
      throw new Error('Quest already complete')
    }
    const template = readById<CardTemplate>('templates', instance.templateId)
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

    const updatedInstance: CardInstance = { ...instance, status: 'completed' as CardStatus }
    upsert('instances', updatedInstance)
    upsert('completions', completion)

    const streakUpdate = updateStreaks(template.recurrence, inventory.streaks)
    const updatedInventory: UserInventory = {
      ...inventory,
      items: updateInventoryItems(inventory.items, template.id),
      totalPoints: inventory.totalPoints + points,
      streaks: streakUpdate.state,
    }
    updatedInventory.badges = awardBadges(updatedInventory, completion)
    upsert('inventories', updatedInventory)
    completion.streaksAwarded = streakUpdate.snapshot

    emit('card.complete', { completion })
    emit('instance.update', { instance: updatedInstance })
    emit('inventory.update', { inventory: updatedInventory })

    return completion
  },

  async getInventory(userId: string) {
    const existing = readById<UserInventory>('inventories', userId)
    if (existing) return existing
    const inventory: UserInventory = {
      userId,
      items: [],
      totalPoints: 0,
      badges: [],
      streaks: { daily: 0, weekly: 0, monthly: 0, once: 0, longest: {} },
    }
    upsert('inventories', inventory)
    return inventory
  },

  async getHistory(userId: string) {
    const completions = readAll<Completion>('completions').filter((completion) => completion.userId === userId)
    const instances = readAll<CardInstance>('instances')
    const templates = readAll<CardTemplate>('templates')
    return completions.map((completion) => {
      const instance = instances.find((i) => i.id === completion.cardInstanceId)
      const template = templates.find((t) => t?.id === instance?.templateId)
      return { completion, instance: instance!, template: template! }
    })
  },

  async saveSettings(settings: Settings) {
    writeSettings(settings)
    emit('settings.update', { settings })
  },

  async getSettings() {
    return readSettings()
  },

  async seed(sampleData: { users: User[]; templates: CardTemplate[] }) {
    replaceAll('users', sampleData.users)
    replaceAll('templates', sampleData.templates)
    emit('seed', sampleData)
  },
}

function computeNextInstanceDate(template: CardTemplate, now: Date, settings: Settings): Date | null {
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

function computeExpiry(template: CardTemplate, scheduled: Date, settings: Settings): Date {
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
  if (inventory.streaks.weekly >= 4) {
    push('house-hero-week', { streak: inventory.streaks.weekly })
  }
  if (inventory.streaks.monthly >= 6) {
    push('house-hero-month', { streak: inventory.streaks.monthly })
  }
  if (inventory.totalPoints >= 1000) {
    push('house-hero-all', { points: inventory.totalPoints })
  }

  return badges
}

export { computeExpiry, computeNextInstanceDate }
