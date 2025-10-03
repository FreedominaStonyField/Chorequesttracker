import { eq } from 'drizzle-orm';

import { db } from '../db/client.js';
import { settings } from '../db/schema.js';
import { mapSettings } from '../models/mappers.js';
import type { Settings } from '../models/types.js';

export const DEFAULT_SETTINGS: Settings = {
  refreshHour: 0,
  weekAnchor: 1,
  monthAnchor: 1,
  proofRequiredTemplateIds: []
};

export async function getSettings(): Promise<Settings> {
  const row = await db.query.settings.findFirst({
    where: eq(settings.id, 1)
  });
  if (!row) {
    await db.insert(settings).values({
      id: 1,
      refreshHour: DEFAULT_SETTINGS.refreshHour,
      weekAnchor: DEFAULT_SETTINGS.weekAnchor,
      monthAnchor: DEFAULT_SETTINGS.monthAnchor,
      proofRequiredTemplateIds: DEFAULT_SETTINGS.proofRequiredTemplateIds
    });
    return DEFAULT_SETTINGS;
  }
  return mapSettings(row);
}

export async function updateSettings(payload: Settings): Promise<Settings> {
  await db
    .insert(settings)
    .values({
      id: 1,
      refreshHour: payload.refreshHour,
      weekAnchor: payload.weekAnchor,
      monthAnchor: payload.monthAnchor,
      proofRequiredTemplateIds: payload.proofRequiredTemplateIds
    })
    .onConflictDoUpdate({
      target: settings.id,
      set: {
        refreshHour: payload.refreshHour,
        weekAnchor: payload.weekAnchor,
        monthAnchor: payload.monthAnchor,
        proofRequiredTemplateIds: payload.proofRequiredTemplateIds
      }
    });
  return getSettings();
}
