import { Router } from 'express';
import { z } from 'zod';

import { processSync } from '../services/syncService.js';

const router = Router();

const envelopeSchema = z.object({
  id: z.string(),
  type: z.string(),
  payload: z.unknown(),
  createdAt: z.string()
});

/**
 * @openapi
 * /sync:
 *   post:
 *     summary: Replay offline envelopes
 *     tags: [Sync]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/SyncEnvelope'
 *     responses:
 *       '202':
 *         description: Sync processed
 */
router.post('/', async (req, res, next) => {
  try {
    const envelopes = z.array(envelopeSchema).parse(req.body);
    await processSync(envelopes as any);
    res.status(202).json({ accepted: envelopes.length });
  } catch (error) {
    next(error);
  }
});

export default router;
