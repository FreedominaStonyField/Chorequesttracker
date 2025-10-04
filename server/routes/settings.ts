import { Router } from 'express'
import { z } from 'zod'
import { store } from '../store.js'
import { HttpError, parseWith, sendError } from '../utils.js'

const router = Router()

const settingsSchema = z.object({
  refreshHour: z.number().int().min(0).max(23),
  weekAnchor: z.number().int().min(0).max(6),
  monthAnchor: z.number().int().min(1).max(31),
  proofRequiredTemplateIds: z.array(z.string()),
})

router.get('/', (_req, res) => {
  try {
    return res.json(store.getSettings())
  } catch (error) {
    return sendError(res, error)
  }
})

router.put('/', (req, res) => {
  try {
    const actorId = req.auth?.actorId
    if (!actorId) {
      throw new HttpError(401, 'pin_required', 'Household PIN verification required')
    }
    const payload = parseWith(settingsSchema, req.body)
    store.saveSettings(payload)
    return res.status(204).send()
  } catch (error) {
    return sendError(res, error)
  }
})

export const settingsRouter = router
