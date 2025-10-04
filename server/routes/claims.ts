import { Router } from 'express'
import { z } from 'zod'
import { store } from '../store.js'
import { HttpError, parseWith, sendError } from '../utils.js'

const router = Router()

const claimSchema = z.object({
  cardId: z.string().min(1),
  userId: z.string().min(1),
})

router.post('/', (req, res) => {
  try {
    const actorId = req.auth?.actorId
    if (!actorId) {
      throw new HttpError(401, 'pin_required', 'Household PIN verification required')
    }
    const payload = parseWith(claimSchema, req.body)
    const claim = store.claimCard(payload.cardId, payload.userId)
    return res.status(201).json(claim)
  } catch (error) {
    return sendError(res, error)
  }
})

router.post('/:id/undo', (req, res) => {
  try {
    const actorId = req.auth?.actorId
    if (!actorId) {
      throw new HttpError(401, 'pin_required', 'Household PIN verification required')
    }
    const payload = parseWith(
      z.object({ userId: z.string().min(1) }),
      req.body
    )
    store.undoClaim(req.params.id, payload.userId)
    return res.status(204).send()
  } catch (error) {
    return sendError(res, error)
  }
})

export const claimsRouter = router
