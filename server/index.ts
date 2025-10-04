import cors from 'cors'
import express from 'express'
import type { Request, Response } from 'express'
import { adminRouter } from './routes/admin.js'
import { claimsRouter } from './routes/claims.js'
import { instancesRouter } from './routes/instances.js'
import { leaderboardRouter } from './routes/leaderboard.js'
import { settingsRouter } from './routes/settings.js'
import { templatesRouter } from './routes/templates.js'
import { usersRouter } from './routes/users.js'
import { authMiddleware } from './auth.js'

export const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/users', authMiddleware, usersRouter)
app.use('/api/templates', authMiddleware, templatesRouter)
app.use('/api/instances', authMiddleware, instancesRouter)
app.use('/api/claims', authMiddleware, claimsRouter)
app.use('/api/settings', authMiddleware, settingsRouter)
app.use('/api/leaderboard', authMiddleware, leaderboardRouter)
app.use('/api/admin', authMiddleware, adminRouter)

const port = Number(process.env.PORT ?? 3001)

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`QuestBoard server listening on port ${port}`)
  })
}
