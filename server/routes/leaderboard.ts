import { Router } from 'express'
import { z } from 'zod'
import { store } from '../store.js'
import { parseWith, sendError } from '../utils.js'

const router = Router()

const leaderboardSchema = z.object({
  range: z.enum(['week', 'month', 'all']).default('all'),
})

router.get('/', (req, res) => {
  try {
    const params = parseWith(leaderboardSchema, req.query)
    const leaderboard = store.getLeaderboard(params.range)
    return res.json(leaderboard)
  } catch (error) {
    return sendError(res, error)
  }
})

export const leaderboardRouter = router
