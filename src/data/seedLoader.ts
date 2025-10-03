import { useEffect } from 'react'
import { repository } from './repository'
import { createSeedTemplates, createSeedUsers } from './seeds'
import { useQueryClient } from '@tanstack/react-query'
import { repositoryKeys } from '../hooks/useRepository'

export function useSeedData() {
  const client = useQueryClient()
  useEffect(() => {
    let cancelled = false
    async function seed() {
      const users = await repository.getUsers()
      if (!users.length && !cancelled) {
        await repository.seed({ users: createSeedUsers(), templates: createSeedTemplates() })
        client.invalidateQueries({ queryKey: repositoryKeys.users })
        client.invalidateQueries({ queryKey: repositoryKeys.templates })
        client.invalidateQueries({ queryKey: repositoryKeys.feed })
      }
    }
    seed()
    return () => {
      cancelled = true
    }
  }, [client])
}
