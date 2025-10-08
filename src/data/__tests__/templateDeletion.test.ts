import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db'
import { repository } from '../repository'
import type { CardTemplate, Settings, User } from '../../types'

const user: User = {
  id: 'test-user',
  name: 'Test User',
  color: '#ffffff',
  avatarEmoji: ':)',
  joinDate: new Date().toISOString(),
  isAdult: true,
}

const baseSettings: Settings = {
  refreshHour: 0,
  weekAnchor: 1,
  monthAnchor: 1,
  proofRequiredTemplateIds: [],
}

function createTemplate(id: string, overrides: Partial<CardTemplate> = {}): CardTemplate {
  const timestamp = new Date().toISOString()
  return {
    id,
    title: `Quest ${id}`,
    flavorText: 'Complete the test quest.',
    difficulty: 'normal',
    points: 10,
    recurrence: 'daily',
    active: true,
    tags: ['test'],
    notes: '',
    createdBy: user.id,
    createdAt: timestamp,
    updatedAt: timestamp,
    weekAnchor: 1,
    monthAnchor: 1,
    requireProof: false,
    ...overrides,
  }
}

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('template deletion cascade', () => {
  it('removes dependent data and keeps feed stable', async () => {
    const survivorTemplate = createTemplate('keep-me')
    const doomedTemplate = createTemplate('remove-me')

    await repository.upsertUser(user, user.id)
    await repository.upsertTemplate(survivorTemplate, user.id)
    await repository.upsertTemplate(doomedTemplate, user.id)
    await repository.saveSettings({
      ...baseSettings,
      proofRequiredTemplateIds: [doomedTemplate.id],
    })

    const initialFeed = await repository.getFeed(new Date('2025-01-01T00:00:00Z'))
    const doomedCard = initialFeed.find((card) => card.template.id === doomedTemplate.id)
    expect(doomedCard).toBeDefined()

    await repository.completeCard(doomedCard!.id, user.id)

    await repository.deleteTemplate(doomedTemplate.id, user.id)

    const feed = await repository.getFeed(new Date())
    expect(feed.some((card) => card.template.id === doomedTemplate.id)).toBe(false)

    const history = await repository.getHistory(user.id)
    expect(history).toHaveLength(0)

    const inventory = await repository.getInventory(user.id)
    expect(inventory.items).toHaveLength(0)
    expect(inventory.totalPoints).toBe(0)

    const settings = await repository.getSettings()
    expect(settings.proofRequiredTemplateIds).not.toContain(doomedTemplate.id)

    const templates = await repository.getTemplates()
    expect(templates.find((template) => template.id === survivorTemplate.id)).toBeDefined()

    expect(await db.instances.where('templateId').equals(doomedTemplate.id).count()).toBe(0)
    expect(await db.completions.where('cardInstanceId').equals(doomedCard!.id).count()).toBe(0)
    expect(await db.claims.where('cardInstanceId').equals(doomedCard!.id).count()).toBe(0)
  })
})
