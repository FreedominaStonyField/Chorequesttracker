import { Router } from 'express'
import { z } from 'zod'
import { store } from '../store.js'
import { HttpError, parseWith, paginationSchema, sendError } from '../utils.js'

const router = Router()

const userSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().min(1),
  avatarEmoji: z.string().min(1),
  joinDate: z.string().optional(),
  isAdult: z.boolean().optional(),
  pin: z.string().trim().optional(),
})

router.get('/', (req, res) => {
  try {
    const params = parseWith(paginationSchema, req.query)
    let users = store.getUsers()
    if (params.q) {
      const needle = params.q.toLowerCase()
      users = users.filter((user) => user.name.toLowerCase().includes(needle))
    }
    if (typeof params.offset === 'number') {
      users = users.slice(params.offset)
    }
    if (typeof params.limit === 'number') {
      users = users.slice(0, params.limit)
    }
    return res.json(users)
  } catch (error) {
    return sendError(res, error)
  }
})

router.post('/', (req, res) => {
  try {
    const payload = parseWith(userSchema, req.body)
    const actorId = req.auth?.actorId
    const stored = store.upsertUser(
      {
        ...payload,
        joinDate: payload.joinDate ?? new Date().toISOString(),
      },
      actorId
    )
    return res.status(201).json(stored)
  } catch (error) {
    return sendError(res, error)
  }
})

router.put('/:id', (req, res) => {
  try {
    const payload = parseWith(userSchema, { ...req.body, id: req.params.id })
    const actorId = req.auth?.actorId
    const stored = store.upsertUser(
      {
        ...payload,
        joinDate: payload.joinDate ?? new Date().toISOString(),
      },
      actorId
    )
    return res.json(stored)
  } catch (error) {
    return sendError(res, error)
  }
})

router.delete('/:id', (req, res) => {
  try {
    const actorId = req.auth?.actorId
    if (!actorId) {
      throw new HttpError(401, 'pin_required', 'Household PIN verification required')
    }
    store.deleteUser(req.params.id, actorId)
    return res.status(204).send()
  } catch (error) {
    return sendError(res, error)
  }
})

router.get('/:id/inventory', (req, res) => {
  try {
    const inventory = store.getInventory(req.params.id)
    return res.json(inventory)
  } catch (error) {
    return sendError(res, error)
  }
})

router.get('/:id/history', (req, res) => {
  try {
    const history = store.getHistory(req.params.id)
    return res.json(history)
  } catch (error) {
    return sendError(res, error)
  }
})

export const usersRouter = router
