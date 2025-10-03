import { describe, expect, it } from 'vitest';

import { computeExpiry, computeNextInstanceDate } from '../services/recurrence.js';
import type { CardTemplate, Settings } from '../models/types.js';

const baseTemplate: CardTemplate = {
  id: 'test',
  title: 'Test',
  difficulty: 'normal',
  points: 10,
  recurrence: 'weekly',
  active: true,
  tags: [],
  createdBy: 'ava',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  weekAnchor: 1,
  monthAnchor: 1
};

const settings: Settings = {
  refreshHour: 0,
  weekAnchor: 1,
  monthAnchor: 1,
  proofRequiredTemplateIds: []
};

describe('recurrence helpers', () => {
  it('aligns weekly recurrence with anchors', () => {
    const now = new Date('2025-01-10T12:00:00Z');
    const next = computeNextInstanceDate(baseTemplate, now, settings);
    expect(next?.toISOString()).toBe('2025-01-13T00:00:00.000Z');
  });

  it('supports monthly anchors on end-of-month overflows', () => {
    const template: CardTemplate = { ...baseTemplate, recurrence: 'monthly', monthAnchor: 31 };
    const now = new Date('2025-02-02T00:00:00Z');
    const next = computeNextInstanceDate(template, now, settings);
    expect(next?.toISOString()).toBe('2025-02-28T00:00:00.000Z');
  });

  it('computes expiry windows by recurrence', () => {
    const scheduled = new Date('2025-01-01T00:00:00Z');
    const expiryWeekly = computeExpiry(baseTemplate, scheduled, settings);
    expect(expiryWeekly.toISOString()).toBe('2025-01-05T23:59:59.999Z');

    const dailyTemplate: CardTemplate = { ...baseTemplate, recurrence: 'daily' };
    const expiryDaily = computeExpiry(dailyTemplate, scheduled, settings);
    expect(expiryDaily.toISOString()).toBe('2025-01-01T23:59:59.999Z');
  });
});
