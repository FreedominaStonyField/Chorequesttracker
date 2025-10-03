import { Router } from 'express';
import { z } from 'zod';

import {
  createTemplate,
  deleteTemplate,
  duplicateTemplate,
  getTemplate,
  listTemplates,
  updateTemplate
} from '../services/cardService.js';

const router = Router();

const templateSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  flavorText: z.string().optional(),
  difficulty: z.enum(['easy', 'normal', 'hard', 'boss']),
  points: z.number().int().nonnegative(),
  recurrence: z.enum(['once', 'daily', 'weekly', 'monthly']),
  active: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  createdBy: z.string(),
  weekAnchor: z.number().optional(),
  monthAnchor: z.number().optional(),
  requireProof: z.boolean().optional()
});

const templateUpdateSchema = templateSchema.partial().extend({ id: z.string().optional() });

/**
 * @openapi
 * /templates:
 *   get:
 *     summary: List all templates
 *     tags: [Templates]
 *     responses:
 *       '200':
 *         description: List of templates
 */
router.get('/', async (_req, res, next) => {
  try {
    const templates = await listTemplates();
    res.json(templates);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /templates:
 *   post:
 *     summary: Create a template
 *     tags: [Templates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TemplateInput'
 *     responses:
 *       '201':
 *         description: Created template
 */
router.post('/', async (req, res, next) => {
  try {
    const parsed = templateSchema.parse(req.body);
    const created = await createTemplate(parsed);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /templates/{id}:
 *   put:
 *     summary: Update a template
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TemplateUpdate'
 *     responses:
 *       '200':
 *         description: Updated template
 */
router.put('/:id', async (req, res, next) => {
  try {
    const parsed = templateUpdateSchema.parse(req.body);
    const updated = await updateTemplate(req.params.id, parsed);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /templates/{id}:
 *   delete:
 *     summary: Delete a template
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '204':
 *         description: Deleted
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await deleteTemplate(req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /templates/{id}/duplicate:
 *   post:
 *     summary: Duplicate a template
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '201':
 *         description: Created duplicate
 */
router.post('/:id/duplicate', async (req, res, next) => {
  try {
    const actor = req.authenticatedUser;
    const duplicated = await duplicateTemplate(req.params.id, actor?.id ?? 'system');
    res.status(201).json(duplicated);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /templates/{id}:
 *   get:
 *     summary: Get a template
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Template details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const template = await getTemplate(req.params.id);
    if (!template) {
      res.status(404).json({ error: 'Not found' });
    } else {
      res.json(template);
    }
  } catch (error) {
    next(error);
  }
});

export default router;
