import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { repository } from '../data/repository'
import type { CardTemplate, Settings, User } from '../types'

const keys = {
  users: ['users'] as const,
  templates: ['templates'] as const,
  feed: ['feed'] as const,
  leaderboard: (range: 'week' | 'month' | 'all') => ['leaderboard', range] as const,
  history: (userId: string) => ['history', userId] as const,
  inventory: (userId: string) => ['inventory', userId] as const,
  settings: ['settings'] as const,
}

export function useUsers() {
  return useQuery({ queryKey: keys.users, queryFn: repository.getUsers })
}

export function useTemplates() {
  return useQuery({ queryKey: keys.templates, queryFn: repository.getTemplates })
}

export function useFeed() {
  return useQuery({ queryKey: keys.feed, queryFn: () => repository.getFeed() })
}

export function useLeaderboard(range: 'week' | 'month' | 'all') {
  return useQuery({ queryKey: keys.leaderboard(range), queryFn: () => repository.getLeaderboard(range) })
}

export function useHistory(userId?: string) {
  return useQuery({
    queryKey: userId ? keys.history(userId) : ['history'],
    queryFn: () => (userId ? repository.getHistory(userId) : Promise.resolve([])),
    enabled: Boolean(userId),
  })
}

export function useInventory(userId?: string) {
  return useQuery({
    queryKey: userId ? keys.inventory(userId) : ['inventory'],
    queryFn: () => (userId ? repository.getInventory(userId) : Promise.resolve(null)),
    enabled: Boolean(userId),
  })
}

export function useSettings() {
  return useQuery({ queryKey: keys.settings, queryFn: repository.getSettings })
}

export function useUpsertTemplateMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (payload: { template: CardTemplate; actorId: string }) =>
      repository.upsertTemplate(payload.template, payload.actorId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.templates })
      client.invalidateQueries({ queryKey: keys.feed })
    },
  })
}

export function useDuplicateTemplateMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (payload: { templateId: string; actorId: string }) =>
      repository.duplicateTemplate(payload.templateId, payload.actorId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.templates })
    },
  })
}

export function useDeleteTemplateMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (payload: { templateId: string; actorId: string }) =>
      repository.deleteTemplate(payload.templateId, payload.actorId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.templates })
      client.invalidateQueries({ queryKey: keys.feed })
    },
  })
}

export function useUpsertUserMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (payload: { user: User; actorId?: string }) => repository.upsertUser(payload.user, payload.actorId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.users })
    },
  })
}

export function useDeleteUserMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (payload: { userId: string; actorId: string }) => repository.deleteUser(payload.userId, payload.actorId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.users })
      client.invalidateQueries({ queryKey: keys.feed })
      client.invalidateQueries({ queryKey: keys.leaderboard('all') })
    },
  })
}

export function useClaimMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (payload: { cardId: string; userId: string }) => repository.claimCard(payload.cardId, payload.userId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.feed })
    },
  })
}

export function useUndoClaimMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (payload: { claimId: string; userId: string }) => repository.undoClaim(payload.claimId, payload.userId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.feed })
    },
  })
}

export function useCompleteMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (payload: { cardId: string; userId: string; proof?: { note?: string; photoUrl?: string } }) =>
      repository.completeCard(payload.cardId, payload.userId, payload.proof),
    onSuccess: (_, variables) => {
      client.invalidateQueries({ queryKey: keys.feed })
      if (variables.userId) {
        client.invalidateQueries({ queryKey: keys.history(variables.userId) })
        client.invalidateQueries({ queryKey: keys.inventory(variables.userId) })
        client.invalidateQueries({ queryKey: keys.leaderboard('week') })
        client.invalidateQueries({ queryKey: keys.leaderboard('month') })
        client.invalidateQueries({ queryKey: keys.leaderboard('all') })
      }
    },
  })
}

export function useSaveSettingsMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (settings: Settings) => repository.saveSettings(settings),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.settings })
      client.invalidateQueries({ queryKey: keys.feed })
    },
  })
}

export const repositoryKeys = keys
