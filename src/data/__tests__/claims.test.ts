import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db'
import { repository } from '../repository'
import type { CardTemplate, User } from '../../types'

const userA: User = {
  id: 'hero-a',
  name: 'Hero A',
  color: '#fff',
  avatarEmoji: '🛡️',
  joinDate: new Date().toISOString(),
}

const userB: User = {
  id: 'hero-b',
  name: 'Hero B',
  color: '#fff',
  avatarEmoji: '🗡️',
  joinDate: new Date().toISOString(),
}

const template: CardTemplate = {
  id: 'quest',
  title: 'Test Quest',
  flavorText: 'Do the thing',
  difficulty: 'normal',
  points: 10,
  recurrence: 'daily',
  active: true,
  tags: [],
  notes: '',
  createdBy: 'hero-a',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  weekAnchor: 1,
  monthAnchor: 1,
  requireProof: false,
}

beforeEach(async () => {
  await db.delete()
  await db.open()
  await repository.seed({ users: [userA, userB], templates: [template] })
})

describe('claim conflict handling', () => {
  it('prevents a second claim on the same quest', async () => {
    const feed = await repository.getFeed(new Date())
    expect(feed.length).toBeGreaterThan(0)
    const card = feed[0]
    await repository.claimCard(card.id, userA.id)
    await expect(repository.claimCard(card.id, userB.id)).rejects.toThrow()
  })
})
