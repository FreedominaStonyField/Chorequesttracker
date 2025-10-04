import { Router } from 'express'
import { z } from 'zod'
import { store } from '../store.js'
import { HttpError, parseWith, paginationSchema, sendError } from '../utils.js'

const router = Router()

const templateSchema = z.object({
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
  updatedAt: z.string().min(1).optional(),
  weekAnchor: z.number().int().optional(),
  monthAnchor: z.number().int().optional(),
  requireProof: z.boolean().optional(),
})

router.get('/', (req, res) => {
  try {
    const params = parseWith(paginationSchema, req.query)
    let templates = store.getTemplates()
    if (params.q) {
      const needle = params.q.toLowerCase()
      templates = templates.filter((template) => template.title.toLowerCase().includes(needle))
    }
    if (typeof params.offset === 'number') {
      templates = templates.slice(params.offset)
    }
    if (typeof params.limit === 'number') {
      templates = templates.slice(0, params.limit)
    }
    return res.json(templates)
  } catch (error) {
    return sendError(res, error)
  }
})

router.get('/:id', (req, res) => {
  try {
    const template = store.getTemplates().find((entry) => entry.id === req.params.id)
    if (!template) {
      throw new HttpError(404, 'not_found', { id: req.params.id })
    }
    return res.json(template)
  } catch (error) {
    return sendError(res, error)
  }
})

router.put('/:id', (req, res) => {
  try {
    const payload = parseWith(templateSchema, { ...req.body, id: req.params.id })
    const actorId = req.auth?.actorId
    if (!actorId) {
      throw new HttpError(401, 'pin_required', 'Household PIN verification required')
    }
    const stored = store.upsertTemplate(
      {
        ...payload,
        updatedAt: payload.updatedAt ?? new Date().toISOString(),
      },
      actorId
    )
    return res.json(stored)
  } catch (error) {
    return sendError(res, error)
  }
})

router.post('/:id/duplicate', (req, res) => {
  try {
    const actorId = req.auth?.actorId
    if (!actorId) {
      throw new HttpError(401, 'pin_required', 'Household PIN verification required')
    }
    const duplicated = store.duplicateTemplate(req.params.id, actorId)
    return res.status(201).json(duplicated)
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
    store.deleteTemplate(req.params.id, actorId)
    return res.status(204).send()
  } catch (error) {
    return sendError(res, error)
  }
})

export const templatesRouter = router
