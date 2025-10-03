import { Router } from 'express';
import { z } from 'zod';

import { listAudit } from '../services/auditService.js';

const router = Router();

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

/**
 * @openapi
 * /audit-log:
 *   get:
 *     summary: Fetch audit log entries
 *     tags: [Audit]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Audit entries
 */
router.get('/', async (req, res, next) => {
  try {
    const params = querySchema.parse(req.query);
    const entries = await listAudit(params.page, params.pageSize);
    res.json(entries);
  } catch (error) {
    next(error);
  }
});

export default router;
