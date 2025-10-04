import type {
  CardInstance,
  CardTemplate,
  Claim,
  Completion,
  Settings,
  User,
  UserInventory,
} from '../types'
import { api } from '../lib/api'

export interface FeedCard extends CardInstance {
  template: CardTemplate
  assignedUser?: User
  completion?: Completion
}

export const repository = {
  async getUsers() {
    const response = await api.get<User[]>('/users')
    return response.data
  },

  async upsertUser(user: User, _actorId?: string) {
    const response = await api.put<User>(`/users/${user.id}`, user)
    return response.data
  },

  async deleteUser(userId: string, _actorId: string) {
    await api.delete(`/users/${userId}`)
  },

  async getTemplates() {
    const response = await api.get<CardTemplate[]>('/templates')
    return response.data
  },

  async upsertTemplate(template: CardTemplate, _actorId: string) {
    const response = await api.put<CardTemplate>(`/templates/${template.id}`, template)
    return response.data
  },

  async duplicateTemplate(templateId: string, _actorId: string) {
    const response = await api.post<CardTemplate>(`/templates/${templateId}/duplicate`)
    return response.data
  },

  async deleteTemplate(templateId: string, _actorId: string) {
    await api.delete(`/templates/${templateId}`)
  },

  async getFeed() {
    const response = await api.get<FeedCard[]>('/instances/feed')
    return response.data
  },

  async claimCard(cardId: string, userId: string) {
    const response = await api.post<Claim>('/claims', { cardId, userId })
    return response.data
  },

  async undoClaim(claimId: string, userId: string) {
    await api.post(`/claims/${claimId}/undo`, { userId })
  },

  async completeCard(cardId: string, userId: string, proof?: { note?: string; photoUrl?: string }) {
    const response = await api.post<Completion>(`/instances/${cardId}/complete`, { userId, proof })
    return response.data
  },

  async getInventory(userId: string) {
    const response = await api.get<UserInventory>(`/users/${userId}/inventory`)
    return response.data
  },

  async getHistory(userId: string) {
    const response = await api.get<{ completion: Completion; instance: CardInstance; template: CardTemplate }[]>(
      `/users/${userId}/history`
    )
    return response.data
  },

  async getLeaderboard(range: 'week' | 'month' | 'all') {
    const response = await api.get<Array<{ user: User; points: number; completions: number; earliest: string }>>(
      `/leaderboard`,
      { params: { range } }
    )
    return response.data
  },

  async saveSettings(settings: Settings) {
    await api.put('/settings', settings)
  },

  async getSettings() {
    const response = await api.get<Settings>('/settings')
    return response.data
  },

  async seed(sampleData: { users: User[]; templates: CardTemplate[] }) {
    await api.post('/admin/seed', sampleData)
  },
}
