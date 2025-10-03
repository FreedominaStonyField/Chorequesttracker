import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '../db/client.js';
import { claimCard, completeCard } from '../services/cardService.js';
import { createInstance, createTemplate, createTestUser, resetDatabase } from './helpers.js';

beforeEach(async () => {
  await resetDatabase();
  vi.useRealTimers();
});

describe('completion inventory updates', () => {
  it('awards points, streaks, and badges on completion', async () => {
    await createTestUser('hero');
    const templateId = await createTemplate({ points: 15, recurrence: 'daily' });
    const instanceId = await createInstance(templateId);

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T06:00:00Z'));

    await claimCard(instanceId, 'hero');
    const completion = await completeCard(instanceId, 'hero', { proofNote: 'Done' });

    expect(completion.pointsAwarded).toBe(15);

    const inventory = await db.query.userInventories.findFirst({
      where: (table, { eq }) => eq(table.userId, 'hero')
    });
    expect(inventory?.totalPoints).toBe(15);
    const items = (inventory?.items as any[]) ?? [];
    expect(items).toHaveLength(1);
    expect(items[0].timesCompleted).toBe(1);

    const badges = (inventory?.badges as any[]) ?? [];
    const badgeIds = badges.map((badge) => badge.badgeId);
    expect(badgeIds).toContain('first-blood');
    expect(badgeIds).toContain('early-bird');

    const streaks = inventory?.streaks as Record<string, number> & { longest: Record<string, number> };
    expect(streaks.daily).toBe(1);
    expect(streaks.longest.daily).toBe(1);

    vi.useRealTimers();
  });
});
