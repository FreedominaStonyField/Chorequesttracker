import { afterEach, beforeEach, expect, test } from 'vitest'
import { io, type Socket } from 'socket.io-client'
import { startServer } from '../src/index'
import type { Completion } from 'shared/types'
import { resetDatabase } from '../src/database'

let httpServer: Awaited<ReturnType<typeof startServer>>['httpServer']
let baseUrl: string
let sockets: Socket[] = []

beforeEach(async () => {
  resetDatabase()
  const server = await startServer(0)
  httpServer = server.httpServer
  const address = httpServer.address()
  if (!address || typeof address === 'string') {
    throw new Error('Failed to determine server address')
  }
  baseUrl = `http://127.0.0.1:${address.port}`
})

afterEach(async () => {
  for (const socket of sockets) {
    socket.disconnect()
  }
  sockets = []
  if (httpServer) {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()))
  }
})

test('completing a quest broadcasts to connected clients', async () => {
  const socketA = io(baseUrl)
  const socketB = io(baseUrl)
  sockets.push(socketA, socketB)

  await Promise.all([
    new Promise<void>((resolve) => socketA.on('connect', () => resolve())),
    new Promise<void>((resolve) => socketB.on('connect', () => resolve())),
  ])

  const templateId = `test-${Date.now()}`
  const timestamp = new Date().toISOString()
  const newTemplate = {
    id: templateId,
    title: 'Realtime Spec Quest',
    difficulty: 'easy',
    points: 1,
    recurrence: 'once',
    active: true,
    tags: ['spec'],
    notes: '',
    createdBy: 'ava',
    createdAt: timestamp,
    updatedAt: timestamp,
    weekAnchor: 1,
    monthAnchor: 1,
    requireProof: false,
    flavorText: 'Test your realtime mettle.',
  }

  const templateResponse = await fetch(`${baseUrl}/api/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ template: newTemplate, actorId: 'ava' }),
  })
  expect(templateResponse.status).toBe(201)

  const feedResponse = await fetch(`${baseUrl}/api/instances`)
  const feed = (await feedResponse.json()) as Array<{ id: string; status: string; templateId: string }>
  const card = feed.find((item) => item.templateId === templateId)
  expect(card).toBeDefined()
  const cardId = card!.id

  const eventPromise = new Promise<Completion>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Did not receive completion event')), 2000)
    socketB.on('repository:event', (event) => {
      if (event.type === 'card.complete') {
        clearTimeout(timeout)
        resolve(event.payload.completion as Completion)
      }
    })
  })

  const completionResponse = await fetch(`${baseUrl}/api/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardId, userId: 'ava' }),
  })

  expect(completionResponse.status).toBe(201)
  const completion = (await completionResponse.json()) as Completion

  const broadcast = await eventPromise
  expect(broadcast.id).toBe(completion.id)
  expect(broadcast.cardInstanceId).toBe(cardId)
})
