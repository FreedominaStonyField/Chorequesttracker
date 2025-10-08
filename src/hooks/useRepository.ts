import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { apiRepository, subscribeToRepositoryEvents } from '../data/apiRepository'
import type { CardTemplate, Settings, User, UserInventory } from '../types'

const keys = {
  users: ['users'] as const,
  templates: ['templates'] as const,
  feed: ['feed'] as const,
  history: (userId: string) => ['history', userId] as const,
  inventory: (userId: string) => ['inventory', userId] as const,
  settings: ['settings'] as const,
}

export function useUsers() {
  return useQuery({ queryKey: keys.users, queryFn: apiRepository.getUsers })
}

export function useTemplates() {
  return useQuery({ queryKey: keys.templates, queryFn: apiRepository.getTemplates })
}

export function useFeed() {
  return useQuery({ queryKey: keys.feed, queryFn: () => apiRepository.getFeed() })
}

export function useHistory(userId?: string) {
  return useQuery({
    queryKey: userId ? keys.history(userId) : ['history'],
    queryFn: () => (userId ? apiRepository.getHistory(userId) : Promise.resolve([])),
    enabled: Boolean(userId),
  })
}

export function useInventory(userId?: string) {
  return useQuery({
    queryKey: userId ? keys.inventory(userId) : ['inventory'],
    queryFn: () => (userId ? apiRepository.getInventory(userId) : Promise.resolve(null)),
    enabled: Boolean(userId),
  })
}

export function useSettings() {
  return useQuery({ queryKey: keys.settings, queryFn: apiRepository.getSettings })
}

export function useUpsertTemplateMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (payload: { template: CardTemplate; actorId: string }) =>
      apiRepository.upsertTemplate(payload.template, payload.actorId),
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
      apiRepository.duplicateTemplate(payload.templateId, payload.actorId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.templates })
    },
  })
}

export function useDeleteTemplateMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (payload: { templateId: string; actorId: string }) =>
      apiRepository.deleteTemplate(payload.templateId, payload.actorId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.templates })
      client.invalidateQueries({ queryKey: keys.feed })
    },
  })
}

export function useUpsertUserMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (payload: { user: User; actorId?: string }) => apiRepository.upsertUser(payload.user, payload.actorId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.users })
    },
  })
}

export function useDeleteUserMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (payload: { userId: string; actorId: string }) =>
      apiRepository.deleteUser(payload.userId, payload.actorId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.users })
      client.invalidateQueries({ queryKey: keys.feed })
    },
  })
}

export function useClaimMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (payload: { cardId: string; userId: string }) =>
      apiRepository.claimCard(payload.cardId, payload.userId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.feed })
    },
  })
}

export function useUndoClaimMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (payload: { claimId: string; userId: string }) =>
      apiRepository.undoClaim(payload.claimId, payload.userId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.feed })
    },
  })
}

export function useCompleteMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (payload: { cardId: string; userId: string; proof?: { note?: string; photoUrl?: string } }) =>
      apiRepository.completeCard(payload.cardId, payload.userId, payload.proof),
    onSuccess: (_, variables) => {
      client.invalidateQueries({ queryKey: keys.feed })
      if (variables.userId) {
        client.invalidateQueries({ queryKey: keys.history(variables.userId) })
        client.invalidateQueries({ queryKey: keys.inventory(variables.userId) })
      }
    },
  })
}

export function useSaveSettingsMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (settings: Settings) => apiRepository.saveSettings(settings),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.settings })
      client.invalidateQueries({ queryKey: keys.feed })
    },
  })
}

export function useRepositoryEvents() {
  const client = useQueryClient()
  useEffect(() => {
    const unsubscribe = subscribeToRepositoryEvents((event) => {
      switch (event.type) {
        case 'user.upsert':
        case 'user.delete':
          client.invalidateQueries({ queryKey: keys.users })
          client.invalidateQueries({ queryKey: keys.feed })
          break
        case 'template.upsert':
        case 'template.delete':
        case 'template.duplicate':
          client.invalidateQueries({ queryKey: keys.templates })
          client.invalidateQueries({ queryKey: keys.feed })
          break
        case 'instances.generated':
        case 'instance.update':
        case 'card.claim':
        case 'card.claim.undo':
        case 'card.complete':
          client.invalidateQueries({ queryKey: keys.feed })
          break
        case 'inventory.update': {
          const payload = event.payload as { inventory?: UserInventory }
          const inventory = payload?.inventory
          if (inventory?.userId) {
            client.invalidateQueries({ queryKey: keys.inventory(inventory.userId) })
            client.invalidateQueries({ queryKey: keys.history(inventory.userId) })
          }
          break
        }
        case 'settings.update':
          client.invalidateQueries({ queryKey: keys.settings })
          client.invalidateQueries({ queryKey: keys.feed })
          break
        case 'seed':
          client.invalidateQueries({ queryKey: keys.users })
          client.invalidateQueries({ queryKey: keys.templates })
          client.invalidateQueries({ queryKey: keys.feed })
          break
        default:
          break
      }
    })
    return unsubscribe
  }, [client])
}

export const repositoryKeys = keys
