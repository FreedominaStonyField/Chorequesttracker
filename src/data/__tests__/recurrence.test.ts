import { describe, expect, it } from 'vitest'
import { computeExpiry, computeNextInstanceDate } from '../repository'
import type { CardTemplate, Settings } from '../../types'

const baseTemplate: CardTemplate = {
  id: 'template',
  title: 'Test',
  flavorText: 'Test',
  difficulty: 'normal',
  points: 10,
  recurrence: 'daily',
  active: true,
  tags: [],
  notes: '',
  createdBy: 'tester',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  weekAnchor: 1,
  monthAnchor: 1,
  requireProof: false,
}

const settings: Settings = {
  refreshHour: 0,
  weekAnchor: 1,
  monthAnchor: 1,
  proofRequiredTemplateIds: [],
}

describe('computeNextInstanceDate', () => {
  it('returns today for daily quests', () => {
    const result = computeNextInstanceDate(baseTemplate, new Date('2025-01-10T12:00:00Z'), settings)
    expect(result?.getUTCDate()).toBe(10)
  })

  it('calculates weekly anchor respecting settings', () => {
    const weekly: CardTemplate = { ...baseTemplate, recurrence: 'weekly', weekAnchor: 5 }
    const result = computeNextInstanceDate(weekly, new Date('2025-01-06T00:00:00Z'), settings)
    expect(result?.getUTCDay()).toBe(5)
  })

  it('clamps monthly anchor beyond month length', () => {
    const monthly: CardTemplate = { ...baseTemplate, recurrence: 'monthly', monthAnchor: 31 }
    const result = computeNextInstanceDate(monthly, new Date('2025-02-02T00:00:00Z'), settings)
    expect(result?.getUTCDate()).toBe(28)
  })
})

describe('computeExpiry', () => {
  it('ends daily quest at end of day', () => {
    const scheduled = new Date('2025-01-10T00:00:00Z')
    const expiry = computeExpiry(baseTemplate, scheduled, settings)
    expect(expiry.getUTCDate()).toBe(10)
    expect(expiry.getUTCHours()).toBe(23)
  })

  it('ends weekly quest at end of week', () => {
    const weekly: CardTemplate = { ...baseTemplate, recurrence: 'weekly', weekAnchor: 1 }
    const scheduled = new Date('2025-01-06T00:00:00Z')
    const expiry = computeExpiry(weekly, scheduled, settings)
    expect(expiry.getUTCDate()).toBeGreaterThanOrEqual(12)
  })
})
