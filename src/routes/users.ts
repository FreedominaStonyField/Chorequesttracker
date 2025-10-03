import { Router } from 'express';
import { z } from 'zod';

import {
  createUser,
  deleteUser,
  listUsers,
  updateUser
} from '../services/userService.js';

const router = Router();

const userSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  color: z.string(),
  avatarEmoji: z.string(),
  joinDate: z.string().optional(),
  isAdult: z.boolean().optional(),
  pin: z.string().min(4)
});

const updateSchema = z.object({
  name: z.string().optional(),
  color: z.string().optional(),
  avatarEmoji: z.string().optional(),
  isAdult: z.boolean().optional(),
  pin: z.string().optional()
});

/**
 * @openapi
 * /users:
 *   get:
 *     summary: List all users
 *     tags: [Users]
 *     responses:
 *       '200':
 *         description: A list of users
 */
router.get('/', async (_req, res, next) => {
  try {
    const users = await listUsers();
    res.json(users);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /users:
 *   post:
 *     summary: Create a user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *     responses:
 *       '201':
 *         description: Created user
 */
router.post('/', async (req, res, next) => {
  try {
    const parsed = userSchema.parse(req.body);
    const created = await createUser(parsed);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /users/{id}:
 *   put:
 *     summary: Update a user
 *     tags: [Users]
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
 *             $ref: '#/components/schemas/UserUpdate'
 *     responses:
 *       '200':
 *         description: Updated user
 */
router.put('/:id', async (req, res, next) => {
  try {
    const parsed = updateSchema.parse(req.body);
    const updated = await updateUser(req.params.id, parsed);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
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
    await deleteUser(req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
