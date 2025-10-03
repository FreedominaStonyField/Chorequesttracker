import { z } from 'zod';

import { appendAudit, hasProcessedSync, recordSyncEnvelope } from './auditService.js';
import {
  claimCard,
  completeCard,
  createTemplate,
  deleteTemplate,
  duplicateTemplate,
  releaseClaim,
  updateTemplate
} from './cardService.js';
import { createUser, deleteUser, updateUser } from './userService.js';
import type { SyncEnvelope } from '../models/types.js';

const envelopeSchema = z.object({
  id: z.string(),
  type: z.string(),
  payload: z.unknown(),
  createdAt: z.string().datetime({ offset: true })
});

export async function processSync(envelopes: SyncEnvelope[]): Promise<void> {
  for (const raw of envelopes) {
    const envelope = envelopeSchema.parse(raw);
    const alreadyProcessed = await hasProcessedSync(envelope.id);
    if (alreadyProcessed) continue;
    await dispatchEnvelope(envelope as SyncEnvelope);
    await recordSyncEnvelope(envelope.id, { type: envelope.type });
  }
}

async function dispatchEnvelope(envelope: SyncEnvelope): Promise<void> {
  switch (envelope.type) {
    case 'user:create':
      await createUser(envelope.payload as any);
      break;
    case 'user:update':
      await updateUser((envelope.payload as any).id, (envelope.payload as any).patch);
      break;
    case 'user:delete':
      await deleteUser((envelope.payload as any).id);
      break;
    case 'template:create':
      await createTemplate(envelope.payload as any);
      break;
    case 'template:update':
      await updateTemplate((envelope.payload as any).id, (envelope.payload as any).patch);
      break;
    case 'template:delete':
      await deleteTemplate((envelope.payload as any).id);
      break;
    case 'template:duplicate':
      await duplicateTemplate((envelope.payload as any).id, (envelope.payload as any).actorUserId);
      break;
    case 'card:claim':
      await claimCard((envelope.payload as any).cardId, (envelope.payload as any).userId);
      break;
    case 'card:release-claim':
      await releaseClaim((envelope.payload as any).claimId, (envelope.payload as any).userId);
      break;
    case 'card:complete':
      await completeCard(
        (envelope.payload as any).cardId,
        (envelope.payload as any).userId,
        (envelope.payload as any).input ?? {}
      );
      break;
    default:
      await appendAudit('sync', undefined, {
        ignored: true,
        type: envelope.type,
        payload: envelope.payload
      });
  }
}
