import { Router } from 'express';
import { z } from 'zod';

import { getLeaderboard } from '../services/cardService.js';

const router = Router();

const querySchema = z.object({
  range: z.enum(['week', 'month', 'all']).default('all')
});

/**
 * @openapi
 * /leaderboard:
 *   get:
 *     summary: Fetch leaderboard standings
 *     tags: [Leaderboard]
 *     parameters:
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *           enum: [week, month, all]
 *     responses:
 *       '200':
 *         description: Leaderboard entries
 */
router.get('/', async (req, res, next) => {
  try {
    const parsed = querySchema.parse(req.query);
    const leaderboard = await getLeaderboard(parsed.range);
    res.json(leaderboard);
  } catch (error) {
    next(error);
  }
});

export default router;
