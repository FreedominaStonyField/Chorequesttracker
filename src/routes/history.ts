import { Router } from 'express';

import { getHistory } from '../services/cardService.js';

const router = Router();

/**
 * @openapi
 * /history/{userId}:
 *   get:
 *     summary: Fetch completion history for a user
 *     tags: [History]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Completion history
 */
router.get('/:userId', async (req, res, next) => {
  try {
    const history = await getHistory(req.params.userId);
    res.json(history);
  } catch (error) {
    next(error);
  }
});

export default router;
