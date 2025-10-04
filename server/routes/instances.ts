import { Router } from 'express'
import { z } from 'zod'
import { store } from '../store.js'
import { HttpError, parseWith, paginationSchema, sendError } from '../utils.js'

const router = Router()

const completionSchema = z.object({
  userId: z.string().min(1),
  proof: z
    .object({
      note: z.string().optional(),
      photoUrl: z.string().optional(),
    })
    .optional(),
})

router.get('/', (req, res) => {
  try {
    const params = parseWith(paginationSchema, req.query)
    let instances = store.getInstances()
    if (typeof params.offset === 'number') {
      instances = instances.slice(params.offset)
    }
    if (typeof params.limit === 'number') {
      instances = instances.slice(0, params.limit)
    }
    return res.json(instances)
  } catch (error) {
    return sendError(res, error)
  }
})

router.get('/feed', (req, res) => {
  try {
    const feed = store.getFeed()
    return res.json(feed)
  } catch (error) {
    return sendError(res, error)
  }
})

router.post('/:id/complete', (req, res) => {
  try {
    const actorId = req.auth?.actorId
    if (!actorId) {
      throw new HttpError(401, 'pin_required', 'Household PIN verification required')
    }
    const payload = parseWith(completionSchema, req.body)
    const completion = store.completeCard(req.params.id, payload.userId, payload.proof)
    return res.status(201).json(completion)
  } catch (error) {
    return sendError(res, error)
  }
})

export const instancesRouter = router
