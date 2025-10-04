import { Router } from 'express'
import { z } from 'zod'
import { store } from '../store.js'
import { HttpError, parseWith, sendError } from '../utils.js'

const router = Router()

const seedSchema = z.object({
  users: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      color: z.string().min(1),
      avatarEmoji: z.string().min(1),
      joinDate: z.string().min(1),
      isAdult: z.boolean().optional(),
      pin: z.string().optional(),
    })
  ),
  templates: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      flavorText: z.string().optional(),
      difficulty: z.enum(['easy', 'normal', 'hard', 'boss']),
      points: z.number().int().nonnegative(),
      recurrence: z.enum(['once', 'daily', 'weekly', 'monthly']),
      active: z.boolean(),
      tags: z.array(z.string()),
      notes: z.string().optional(),
      createdBy: z.string().min(1),
      createdAt: z.string().min(1),
      updatedAt: z.string().min(1),
      weekAnchor: z.number().int().optional(),
      monthAnchor: z.number().int().optional(),
      requireProof: z.boolean().optional(),
    })
  ),
})

router.post('/seed', (req, res) => {
  try {
    const actorId = req.auth?.actorId
    if (!actorId) {
      throw new HttpError(401, 'pin_required', 'Household PIN verification required')
    }
    const payload = parseWith(seedSchema, req.body)
    store.seed(payload)
    return res.status(204).send()
  } catch (error) {
    return sendError(res, error)
  }
})

export const adminRouter = router
