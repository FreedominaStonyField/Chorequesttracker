import { Router } from 'express';
import { z } from 'zod';

import { getSettings, updateSettings } from '../services/settingsService.js';

const router = Router();

const settingsSchema = z.object({
  refreshHour: z.number().int().min(0).max(23),
  weekAnchor: z.number().int().min(0).max(6),
  monthAnchor: z.number().int().min(1).max(28),
  proofRequiredTemplateIds: z.array(z.string())
});

/**
 * @openapi
 * /settings:
 *   get:
 *     summary: Get system settings
 *     tags: [Settings]
 *     responses:
 *       '200':
 *         description: Settings payload
 */
router.get('/', async (_req, res, next) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /settings:
 *   put:
 *     summary: Update system settings
 *     tags: [Settings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Settings'
 *     responses:
 *       '200':
 *         description: Updated settings
 */
router.put('/', async (req, res, next) => {
  try {
    const parsed = settingsSchema.parse(req.body);
    const updated = await updateSettings(parsed);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

export default router;
