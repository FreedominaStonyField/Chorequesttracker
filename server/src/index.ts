import cors from 'cors'
import express from 'express'
import { createServer as createHttpServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { createRealtimeGateway } from './realtime'
import { repository } from './repository'

const __filename = fileURLToPath(import.meta.url)

function asyncHandler<T extends express.RequestHandler>(handler: T): express.RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json())

  app.get('/api/users', asyncHandler(async (_req, res) => {
    res.json(await repository.getUsers())
  }))

  app.post('/api/users', asyncHandler(async (req, res) => {
    const { user, actorId } = req.body
    if (!user) {
      res.status(400).json({ message: 'User payload required' })
      return
    }
    const result = await repository.upsertUser(user, actorId)
    res.status(201).json(result)
  }))

  app.delete('/api/users/:userId', asyncHandler(async (req, res) => {
    const { actorId } = req.body ?? {}
    if (!actorId) {
      res.status(400).json({ message: 'actorId required' })
      return
    }
    await repository.deleteUser(req.params.userId, actorId)
    res.status(204).end()
  }))

  app.get('/api/users/:userId/history', asyncHandler(async (req, res) => {
    res.json(await repository.getHistory(req.params.userId))
  }))

  app.get('/api/users/:userId/inventory', asyncHandler(async (req, res) => {
    res.json(await repository.getInventory(req.params.userId))
  }))

  app.get('/api/templates', asyncHandler(async (_req, res) => {
    res.json(await repository.getTemplates())
  }))

  app.post('/api/templates', asyncHandler(async (req, res) => {
    const { template, actorId } = req.body
    if (!template || !actorId) {
      res.status(400).json({ message: 'template and actorId required' })
      return
    }
    res.status(201).json(await repository.upsertTemplate(template, actorId))
  }))

  app.post('/api/templates/:templateId/duplicate', asyncHandler(async (req, res) => {
    const { actorId } = req.body
    if (!actorId) {
      res.status(400).json({ message: 'actorId required' })
      return
    }
    res.status(201).json(await repository.duplicateTemplate(req.params.templateId, actorId))
  }))

  app.delete('/api/templates/:templateId', asyncHandler(async (req, res) => {
    const { actorId } = req.body
    if (!actorId) {
      res.status(400).json({ message: 'actorId required' })
      return
    }
    await repository.deleteTemplate(req.params.templateId, actorId)
    res.status(204).end()
  }))

  app.get('/api/instances', asyncHandler(async (_req, res) => {
    res.json(await repository.getFeed())
  }))

  app.post('/api/claims', asyncHandler(async (req, res) => {
    const { cardId, userId } = req.body
    if (!cardId || !userId) {
      res.status(400).json({ message: 'cardId and userId required' })
      return
    }
    res.status(201).json(await repository.claimCard(cardId, userId))
  }))

  app.delete('/api/claims/:claimId', asyncHandler(async (req, res) => {
    const { userId } = req.body
    if (!userId) {
      res.status(400).json({ message: 'userId required' })
      return
    }
    await repository.undoClaim(req.params.claimId, userId)
    res.status(204).end()
  }))

  app.post('/api/completions', asyncHandler(async (req, res) => {
    const { cardId, userId, proof } = req.body
    if (!cardId || !userId) {
      res.status(400).json({ message: 'cardId and userId required' })
      return
    }
    res.status(201).json(await repository.completeCard(cardId, userId, proof))
  }))

  app.get('/api/leaderboard', asyncHandler(async (req, res) => {
    const range = (req.query.range as 'week' | 'month' | 'all') ?? 'all'
    res.json(await repository.getLeaderboard(range))
  }))

  app.get('/api/settings', asyncHandler(async (_req, res) => {
    res.json(await repository.getSettings())
  }))

  app.put('/api/settings', asyncHandler(async (req, res) => {
    const settings = req.body
    if (!settings) {
      res.status(400).json({ message: 'settings required' })
      return
    }
    await repository.saveSettings(settings)
    res.status(204).end()
  }))

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err)
    res.status(500).json({ message: err instanceof Error ? err.message : 'Internal Server Error' })
  })

  return app
}

export async function startServer(port = Number(process.env.PORT ?? 4000)) {
  const app = createApp()
  const httpServer = createHttpServer(app)
  createRealtimeGateway(httpServer)
  await new Promise<void>((resolve) => {
    httpServer.listen(port, resolve)
  })
  return { app, httpServer }
}

if (process.argv[1] === __filename) {
  const port = Number(process.env.PORT ?? 4000)
  startServer(port).then(() => {
    console.log(`Server listening on port ${port}`)
  })
}
