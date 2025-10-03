import { beforeEach, describe, expect, it } from 'vitest';

import { eq } from 'drizzle-orm';

import { db } from '../db/client.js';
import { claims } from '../db/schema.js';
import { claimCard, releaseClaim } from '../services/cardService.js';
import { createInstance, createTemplate, createTestUser, resetDatabase } from './helpers.js';

beforeEach(async () => {
  await resetDatabase();
});

describe('claim flow', () => {
  it('prevents double claim collisions', async () => {
    await createTestUser('hero1');
    await createTestUser('hero2');
    const templateId = await createTemplate();
    const instanceId = await createInstance(templateId);

    const first = await claimCard(instanceId, 'hero1');
    expect(first.claim.userId).toBe('hero1');

    await expect(claimCard(instanceId, 'hero2')).rejects.toThrow('Card already claimed');
  });

  it('allows claim release within window and blocks after 60s', async () => {
    await createTestUser('hero1');
    const templateId = await createTemplate();
    const instanceId = await createInstance(templateId);
    const first = await claimCard(instanceId, 'hero1');

    await releaseClaim(first.claim.id, 'hero1');
    const claimAgain = await claimCard(instanceId, 'hero1');
    expect(claimAgain.claim.userId).toBe('hero1');

    await db
      .update(claims)
      .set({ claimedAt: new Date(Date.now() - 120_000) })
      .where(eq(claims.id, claimAgain.claim.id));

    await expect(releaseClaim(claimAgain.claim.id, 'hero1')).rejects.toThrow(
      'Claim can no longer be released'
    );
  });
});
