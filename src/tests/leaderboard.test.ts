import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getLeaderboard } from '../services/cardService.js';
import { createInstance, createTemplate, createTestUser, resetDatabase } from './helpers.js';
import { claimCard, completeCard } from '../services/cardService.js';

beforeEach(async () => {
  await resetDatabase();
  vi.useRealTimers();
});

describe('leaderboard', () => {
  it('prefers users with more completions when points tie', async () => {
    await createTestUser('hero1');
    await createTestUser('hero2');
    const lowPointTemplate = await createTemplate({ points: 10 });
    const highPointTemplate = await createTemplate({ points: 20 });

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
    const instance1 = await createInstance(lowPointTemplate);
    await claimCard(instance1, 'hero1');
    await completeCard(instance1, 'hero1', {});

    vi.setSystemTime(new Date('2025-01-02T00:00:00Z'));
    const instance2 = await createInstance(lowPointTemplate);
    await claimCard(instance2, 'hero1');
    await completeCard(instance2, 'hero1', {});

    vi.setSystemTime(new Date('2025-01-03T00:00:00Z'));
    const instance3 = await createInstance(highPointTemplate);
    await claimCard(instance3, 'hero2');
    await completeCard(instance3, 'hero2', {});

    const leaderboard = await getLeaderboard('all');
    expect(leaderboard[0].user.id).toBe('hero1');
    expect(leaderboard[1].user.id).toBe('hero2');
    vi.useRealTimers();
  });

  it('prefers earliest completion when completions tie', async () => {
    await createTestUser('hero1');
    await createTestUser('hero2');
    const template = await createTemplate({ points: 10 });

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
    const instance1 = await createInstance(template);
    await claimCard(instance1, 'hero1');
    await completeCard(instance1, 'hero1', {});

    vi.setSystemTime(new Date('2025-01-02T00:00:00Z'));
    const instance2 = await createInstance(template);
    await claimCard(instance2, 'hero2');
    await completeCard(instance2, 'hero2', {});

    const leaderboard = await getLeaderboard('all');
    expect(leaderboard[0].user.id).toBe('hero1');
    expect(leaderboard[1].user.id).toBe('hero2');
    vi.useRealTimers();
  });
});
