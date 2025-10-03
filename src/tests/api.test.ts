import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';
import { createInstance, createTemplate, createTestUser, resetDatabase } from './helpers.js';

const PIN = '9999';

beforeEach(async () => {
  await resetDatabase();
  vi.useRealTimers();
});

describe('API workflow', () => {
  it('supports claim to completion to leaderboard flow', async () => {
    await createTestUser('hero', PIN);
    const templateId = await createTemplate({ points: 12, recurrence: 'daily' });
    const instanceId = await createInstance(templateId);

    const app = createApp();

    const feedResponse = await request(app)
      .get('/feed')
      .set('X-User-Id', 'hero')
      .set('X-User-PIN', PIN);
    expect(feedResponse.status).toBe(200);
    expect(feedResponse.body).toHaveLength(1);

    const claimResponse = await request(app)
      .post(`/cards/${instanceId}/claim`)
      .set('X-User-Id', 'hero')
      .set('X-User-PIN', PIN);
    expect(claimResponse.status).toBe(200);
    expect(claimResponse.body.claim.userId).toBe('hero');

    const completeResponse = await request(app)
      .post(`/cards/${instanceId}/complete`)
      .set('X-User-Id', 'hero')
      .set('X-User-PIN', PIN)
      .send({ proofNote: 'Photo uploaded' });
    expect(completeResponse.status).toBe(200);
    expect(completeResponse.body.pointsAwarded).toBe(12);

    const historyResponse = await request(app)
      .get('/history/hero')
      .set('X-User-Id', 'hero')
      .set('X-User-PIN', PIN);
    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body).toHaveLength(1);

    const leaderboardResponse = await request(app)
      .get('/leaderboard?range=all')
      .set('X-User-Id', 'hero')
      .set('X-User-PIN', PIN);
    expect(leaderboardResponse.status).toBe(200);
    expect(leaderboardResponse.body[0].user.id).toBe('hero');
  });
});
