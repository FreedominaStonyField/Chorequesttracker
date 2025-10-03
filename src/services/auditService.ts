import { desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '../db/client.js';
import { auditLog } from '../db/schema.js';
import { mapAudit } from '../models/mappers.js';
import type { AuditLog } from '../models/types.js';

export async function appendAudit<TPayload extends Record<string, unknown>>(
  type: AuditLog['type'],
  actorUserId: string | undefined,
  payload: TPayload
): Promise<void> {
  await db.insert(auditLog).values({
    id: nanoid(),
    type,
    actorUserId,
    at: new Date(),
    payload
  });
}

export async function recordSyncEnvelope(
  envelopeId: string,
  payload: Record<string, unknown>
): Promise<void> {
  await db.insert(auditLog).values({
    id: envelopeId,
    type: 'sync',
    actorUserId: undefined,
    at: new Date(),
    payload
  });
}

export async function listAudit(page: number, pageSize: number): Promise<AuditLog[]> {
  const rows = await db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.at))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return rows.map(mapAudit);
}

export async function hasProcessedSync(id: string): Promise<boolean> {
  const existing = await db
    .select({ id: auditLog.id })
    .from(auditLog)
    .where(eq(auditLog.id, id))
    .get();
  return Boolean(existing);
}
