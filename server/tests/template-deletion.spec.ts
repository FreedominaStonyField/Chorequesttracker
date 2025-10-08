import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { CardTemplate, Settings } from 'shared/types'
import { startServer } from '../src/index'
import { resetDatabase } from '../src/database'

let httpServer: Awaited<ReturnType<typeof startServer>>['httpServer']
let baseUrl: string

beforeEach(async () => {
  resetDatabase()
  const server = await startServer(0)
  httpServer = server.httpServer
  const address = httpServer.address()
  if (!address || typeof address === 'string') {
    throw new Error('Failed to determine listening address')
  }
  baseUrl = `http://127.0.0.1:${address.port}`
})

afterEach(async () => {
  if (httpServer) {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()))
  }
})

describe('template deletion cascade', () => {
  it('purges dependent records and keeps APIs responsive', async () => {
    const timestamp = new Date().toISOString()
    const template: CardTemplate = {
      id: 'server-delete-me',
      title: 'Delete Me',
      flavorText: 'Server side deletion test.',
      difficulty: 'normal',
      points: 15,
      recurrence: 'daily',
      active: true,
      tags: ['spec'],
      notes: '',
      createdBy: 'ava',
      createdAt: timestamp,
      updatedAt: timestamp,
      weekAnchor: 1,
      monthAnchor: 1,
      requireProof: false,
    }

    const createResponse = await fetch(`${baseUrl}/api/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template, actorId: 'ava' }),
    })
    expect(createResponse.status).toBe(201)

    const settingsResponse = await fetch(`${baseUrl}/api/settings`)
    const settings = (await settingsResponse.json()) as Settings
    const updatedSettings: Settings = {
      ...settings,
      proofRequiredTemplateIds: Array.from(new Set([...settings.proofRequiredTemplateIds, template.id])),
    }
    const saveSettingsResponse = await fetch(`${baseUrl}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedSettings),
    })
    expect(saveSettingsResponse.status).toBe(204)

    const feedResponse = await fetch(`${baseUrl}/api/instances`)
    const feed = (await feedResponse.json()) as Array<{ id: string; templateId: string }>
    const card = feed.find((item) => item.templateId === template.id)
    expect(card).toBeDefined()

    const completionResponse = await fetch(`${baseUrl}/api/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId: card!.id, userId: 'ava' }),
    })
    expect(completionResponse.status).toBe(201)

    const deleteResponse = await fetch(`${baseUrl}/api/templates/${template.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actorId: 'ava' }),
    })
    expect(deleteResponse.status).toBe(204)

    const feedAfterResponse = await fetch(`${baseUrl}/api/instances`)
    const feedAfter = (await feedAfterResponse.json()) as Array<{ templateId: string }>
    expect(feedAfter.some((item) => item.templateId === template.id)).toBe(false)

    const historyResponse = await fetch(`${baseUrl}/api/users/ava/history`)
    const history = (await historyResponse.json()) as unknown[]
    expect(history).toHaveLength(0)

    const inventoryResponse = await fetch(`${baseUrl}/api/users/ava/inventory`)
    const inventory = (await inventoryResponse.json()) as { items: unknown[]; totalPoints: number }
    expect(inventory.items).toHaveLength(0)
    expect(inventory.totalPoints).toBe(0)

    const settingsAfterResponse = await fetch(`${baseUrl}/api/settings`)
    const settingsAfter = (await settingsAfterResponse.json()) as Settings
    expect(settingsAfter.proofRequiredTemplateIds).not.toContain(template.id)

    const templatesResponse = await fetch(`${baseUrl}/api/templates`)
    const templates = (await templatesResponse.json()) as CardTemplate[]
    expect(templates.find((entry) => entry.id === template.id)).toBeUndefined()
  })
})
