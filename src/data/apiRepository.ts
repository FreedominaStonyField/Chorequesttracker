import { io, type Socket } from 'socket.io-client'
import type {
  CardInstance,
  CardTemplate,
  Claim,
  Completion,
  FeedCard,
  RepositoryEvent,
  Settings,
  User,
  UserInventory,
} from 'shared/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api'
const SOCKET_URL = API_BASE_URL.replace(/\/api$/, '')

let socket: Socket | null = null

function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
    })
  }
  return socket
}

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!response.ok) {
    const message = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(message.message ?? 'Request failed')
  }
  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

export const apiRepository = {
  async getUsers() {
    return request<User[]>('/users')
  },

  async upsertUser(user: User, actorId?: string) {
    return request<User>('/users', {
      method: 'POST',
      body: JSON.stringify({ user, actorId }),
    })
  },

  async deleteUser(userId: string, actorId: string) {
    await request<void>(`/users/${userId}`, {
      method: 'DELETE',
      body: JSON.stringify({ actorId }),
    })
  },

  async getTemplates() {
    return request<CardTemplate[]>('/templates')
  },

  async upsertTemplate(template: CardTemplate, actorId: string) {
    return request<CardTemplate>('/templates', {
      method: 'POST',
      body: JSON.stringify({ template, actorId }),
    })
  },

  async duplicateTemplate(templateId: string, actorId: string) {
    return request<CardTemplate>(`/templates/${templateId}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ actorId }),
    })
  },

  async deleteTemplate(templateId: string, actorId: string) {
    await request<void>(`/templates/${templateId}`, {
      method: 'DELETE',
      body: JSON.stringify({ actorId }),
    })
  },

  async getFeed() {
    return request<FeedCard[]>('/instances')
  },

  async claimCard(cardId: string, userId: string) {
    return request<Claim>('/claims', {
      method: 'POST',
      body: JSON.stringify({ cardId, userId }),
    })
  },

  async undoClaim(claimId: string, userId: string) {
    await request<void>(`/claims/${claimId}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    })
  },

  async completeCard(cardId: string, userId: string, proof?: { note?: string; photoUrl?: string }) {
    return request<Completion>('/completions', {
      method: 'POST',
      body: JSON.stringify({ cardId, userId, proof }),
    })
  },

  async getInventory(userId: string) {
    return request<UserInventory>(`/users/${userId}/inventory`)
  },

  async getHistory(userId: string) {
    return request<Array<{ completion: Completion; instance: CardInstance; template: CardTemplate }>>(
      `/users/${userId}/history`
    )
  },

  async getLeaderboard(range: 'week' | 'month' | 'all') {
    const params = new URLSearchParams({ range })
    return request<Array<{ user: User; points: number; completions: number; earliest: string }>>(
      `/leaderboard?${params.toString()}`
    )
  },

  async getSettings() {
    return request<Settings>('/settings')
  },

  async saveSettings(settings: Settings) {
    await request<void>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
  },
}

export type RepositoryEventHandler = (event: RepositoryEvent) => void

export function subscribeToRepositoryEvents(handler: RepositoryEventHandler) {
  const client = getSocket()
  client.on('repository:event', handler)
  return () => {
    client.off('repository:event', handler)
  }
}
