import { Router } from 'express';

import { getInventory } from '../services/userService.js';

const router = Router();

/**
 * @openapi
 * /inventory/{userId}:
 *   get:
 *     summary: Fetch inventory for a user
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: User inventory
 */
router.get('/:userId', async (req, res, next) => {
  try {
    const inventory = await getInventory(req.params.userId);
    if (!inventory) {
      res.status(404).json({ error: 'Inventory not found' });
    } else {
      res.json(inventory);
    }
  } catch (error) {
    next(error);
  }
});

export default router;
