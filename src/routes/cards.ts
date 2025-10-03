import { Router } from 'express';
import { z } from 'zod';

import { claimCard, completeCard, releaseClaim } from '../services/cardService.js';

const cardsRouter = Router();
export const claimsRouter = Router();

const completionSchema = z.object({
  proofNote: z.string().optional(),
  proofPhotoUrl: z.string().url().optional()
});

/**
 * @openapi
 * /cards/{id}/claim:
 *   post:
 *     summary: Claim a quest card
 *     tags: [Cards]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       '200':
 *         description: Claim created
 */
cardsRouter.post('/:id/claim', async (req, res, next) => {
  try {
    const actor = req.authenticatedUser;
    if (!actor) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const result = await claimCard(req.params.id, actor.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /claims/{id}:
 *   delete:
 *     summary: Release a claim within 60 seconds
 *     tags: [Cards]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       '204':
 *         description: Claim released
 */
claimsRouter.delete('/:id', async (req, res, next) => {
  try {
    const actor = req.authenticatedUser;
    if (!actor) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await releaseClaim(req.params.id, actor.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /cards/{id}/complete:
 *   post:
 *     summary: Complete a quest card
 *     tags: [Cards]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompletionInput'
 *     responses:
 *       '200':
 *         description: Completion recorded
 */
cardsRouter.post('/:id/complete', async (req, res, next) => {
  try {
    const actor = req.authenticatedUser;
    if (!actor) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const parsed = completionSchema.parse(req.body ?? {});
    const completion = await completeCard(req.params.id, actor.id, parsed);
    res.json(completion);
  } catch (error) {
    next(error);
  }
});

export default cardsRouter;
