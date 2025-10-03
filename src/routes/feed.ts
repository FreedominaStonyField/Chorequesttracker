import { Router } from 'express';

import { getFeed } from '../services/cardService.js';

const router = Router();

/**
 * @openapi
 * /feed:
 *   get:
 *     summary: Fetch quest feed
 *     tags: [Cards]
 *     responses:
 *       '200':
 *         description: Feed entries
 */
router.get('/', async (_req, res, next) => {
  try {
    const feed = await getFeed();
    res.json(feed);
  } catch (error) {
    next(error);
  }
});

export default router;
